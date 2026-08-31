const mongoose = require("mongoose");
const User = require("../userManagement/user.model");
const Event = require("../events/event.model");
const Registration = require("../events/registration.model");
const Job = require("../jobs/job.model");
const JobApplication = require("../jobs/jobApplication.model");
const Scholarship = require("../scholarships/scholarship.model");
const Registrant = require("../studentRegistry/registrant.model");

// The app's three visitor-generated writes — the only things that arrive
// without an admin doing anything, and so the only things worth notifying
// about. (Audited against every `router.post` that isn't behind requireAuth.)
// `to` is the client route whose page shows that source's list.
// `parentField` is the key holding the row's parent record, used to scope a
// clear to one event or one posting. Registrants have no parent, so theirs
// is null and only whole-source or single-row clears apply to them.
const SOURCES = [
  {
    key: "eventRegistrations",
    label: "הרשמות לאירועים",
    model: Registration,
    to: "/events",
    parentField: "event",
  },
  {
    key: "jobApplications",
    label: "מועמדים למשרות",
    model: JobApplication,
    to: "/jobs",
    parentField: "job",
  },
  {
    key: "registrants",
    label: "רישומים למאגר הצעירים",
    model: Registrant,
    to: "/student-registry",
    parentField: null,
  },
];

const SOURCE_BY_KEY = Object.fromEntries(SOURCES.map((s) => [s.key, s]));

/**
 * Rows this admin hasn't cleared: arrived after their last "clear all", and
 * not dismissed individually via a scoped clear. The two mechanisms layer —
 * the timestamp is a cheap floor, `seenBy` handles everything since.
 */
function unseenFilter(adminId, since) {
  const filter = { seenBy: { $ne: adminId } };
  if (since) filter.createdAt = { $gt: since };
  return filter;
}

/**
 * GET /api/activity/summary — admin-only. Powers the topbar bell: one entry
 * per source with how many entries arrived since this admin last cleared
 * notifications, the running total, and how many are flagged.
 */
async function getSummary(req, res) {
  try {
    const admin = await User.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "המשתמש לא נמצא" });
    }

    const since = admin.lastSeenActivityAt;
    const sources = await Promise.all(
      SOURCES.map(async ({ key, label, model, to }) => ({
        key,
        label,
        to,
        newCount: await model.countDocuments(unseenFilter(req.admin.id, since)),
        total: await model.countDocuments(),
        flaggedCount: await model.countDocuments({ isFlagged: true }),
      }))
    );

    res.json({ lastSeenAt: since, sources });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * POST /api/activity/seen — admin-only. Clears notifications for this admin
 * at whichever scope the body asks for. Merely opening the bell never calls
 * this; only an explicit ✓ / "נקה התראות" press does, so glancing at the
 * list can't destroy the marker.
 *
 *   {}                        every source          — stamps lastSeenActivityAt
 *   { kind }                  one whole source      — e.g. all event registrations
 *   { kind, parentId }        one event / posting
 *   { kind, entryId }         one person
 *
 * The scoped forms push this admin's id into the rows' `seenBy`; the global
 * form moves the timestamp instead, which is O(1) rather than a write per
 * row. `$addToSet` keeps repeat presses idempotent.
 */
async function markSeen(req, res) {
  const { kind, parentId, entryId } = req.body || {};

  try {
    // No kind: the global "clear everything" the bell's button uses.
    if (!kind) {
      const lastSeenAt = new Date();
      const admin = await User.findByIdAndUpdate(
        req.admin.id,
        { lastSeenActivityAt: lastSeenAt },
        { new: true }
      );
      if (!admin) {
        return res.status(404).json({ success: false, message: "המשתמש לא נמצא" });
      }
      return res.json({ success: true, scope: "all", lastSeenAt });
    }

    const source = SOURCE_BY_KEY[kind];
    if (!source) {
      return res.status(400).json({ success: false, message: "סוג פריט לא תקין" });
    }

    const filter = {};
    let scope = "source";

    if (entryId) {
      if (!mongoose.Types.ObjectId.isValid(entryId)) {
        return res.status(400).json({ success: false, message: "מזהה לא תקין" });
      }
      filter._id = entryId;
      scope = "entry";
    } else if (parentId) {
      if (!source.parentField) {
        return res
          .status(400)
          .json({ success: false, message: "לסוג פריט זה אין קיבוץ לפי פריט אב" });
      }
      if (!mongoose.Types.ObjectId.isValid(parentId)) {
        return res.status(400).json({ success: false, message: "מזהה לא תקין" });
      }
      filter[source.parentField] = parentId;
      scope = "parent";
    }

    const result = await source.model.updateMany(filter, {
      $addToSet: { seenBy: req.admin.id },
    });
    res.json({ success: true, scope, matched: result.matchedCount });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

// Newest-N per source rather than everything, so a busy year can't turn this
// into an unbounded response. Grouping happens in memory below; at this scale
// that costs less than three aggregation pipelines.
const MAX_PER_SOURCE = 200;

/** Rolls per-entry flags and new-ness up into the counts a header displays. */
function summarise(entries) {
  return {
    newCount: entries.filter((e) => e.isNew).length,
    flaggedCount: entries.filter((e) => e.isFlagged).length,
    lastActivityAt: entries.reduce(
      (latest, e) => (!latest || e.createdAt > latest ? e.createdAt : latest),
      null
    ),
  };
}

const byNewestActivity = (a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt);

/**
 * Buckets rows by the parent record they belong to, producing the second
 * level of the tree — one child per event or per job posting, each holding
 * its own people, newest child first.
 *
 * `parentOf` returns the populated parent document or null. A null parent
 * should not happen (deleting an event or job cascades to its submissions)
 * but is bucketed under "ללא שיוך" rather than dropped, so a stray row stays
 * visible instead of vanishing silently.
 */
function groupByParent(rows, parentOf) {
  const buckets = new Map();
  for (const { source, entry } of rows) {
    const parent = parentOf(source);
    const key = parent ? String(parent._id) : "orphaned";
    if (!buckets.has(key)) {
      buckets.set(key, { key, title: parent ? parent.title : "ללא שיוך", entries: [] });
    }
    buckets.get(key).entries.push(entry);
  }

  return [...buckets.values()]
    .map((bucket) => ({ ...bucket, ...summarise(bucket.entries) }))
    .sort(byNewestActivity);
}

/**
 * GET /api/activity/stats — admin-only. Totals plus the grouped activity
 * tree: three top-level groups, where events and jobs nest one level deeper
 * (per event / per posting) and the registry holds its people directly,
 * having no parent record to group under.
 *
 * Everything is ordered newest-first at every level, so the most recently
 * active group, event, and person each sit at the top.
 */
async function getStats(req, res) {
  try {
    const admin = await User.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "המשתמש לא נמצא" });
    }
    const since = admin.lastSeenActivityAt;
    const adminId = String(req.admin.id);
    const isNew = (row) => {
      if (row.seenBy?.some((id) => String(id) === adminId)) return false;
      return since ? new Date(row.createdAt) > new Date(since) : true;
    };

    const [events, jobs, scholarships, registrants, registrations, applications] =
      await Promise.all([
        Event.countDocuments(),
        Job.countDocuments(),
        Scholarship.countDocuments(),
        Registrant.countDocuments(),
        Registration.countDocuments(),
        JobApplication.countDocuments(),
      ]);

    const [regRows, appRows, registrantRows] = await Promise.all([
      Registration.find().sort({ createdAt: -1 }).limit(MAX_PER_SOURCE).populate("event"),
      JobApplication.find().sort({ createdAt: -1 }).limit(MAX_PER_SOURCE).populate("job"),
      Registrant.find().sort({ createdAt: -1 }).limit(MAX_PER_SOURCE),
    ]);

    const toEntry = (kind) => (row, name) => ({
      id: String(row._id),
      kind,
      name,
      email: row.email,
      createdAt: row.createdAt,
      isNew: isNew(row),
      isFlagged: Boolean(row.isFlagged),
    });

    const regEntry = toEntry("eventRegistrations");
    const appEntry = toEntry("jobApplications");
    const registrantEntry = toEntry("registrants");

    const eventChildren = groupByParent(
      regRows.map((r) => ({ source: r, entry: regEntry(r, r.name) })),
      (r) => r.event
    );
    const jobChildren = groupByParent(
      appRows.map((a) => ({ source: a, entry: appEntry(a, a.name) })),
      (a) => a.job
    );
    const registrantEntries = registrantRows.map((r) =>
      registrantEntry(r, [r.firstName, r.lastName].filter(Boolean).join(" ") || r.email)
    );

    // Groups roll their counts up from whichever level actually holds people:
    // children for events/jobs, the flat entry list for the registry.
    const buildGroup = (key, children, entries) => {
      const source = SOURCE_BY_KEY[key];
      const all = children ? children.flatMap((c) => c.entries) : entries;
      return {
        key,
        label: source.label,
        to: source.to,
        children,
        entries: children ? null : entries,
        ...summarise(all),
      };
    };

    const groups = [
      buildGroup("eventRegistrations", eventChildren, null),
      buildGroup("jobApplications", jobChildren, null),
      buildGroup("registrants", null, registrantEntries),
    ].sort(byNewestActivity);

    res.json({
      totals: { events, jobs, scholarships, registrants, registrations, applications },
      groups,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * PATCH /api/activity/flag — admin-only. Sets or clears the "needs
 * attention" flag on one submission. `kind` selects which collection the id
 * belongs to, through the same SOURCES table the rest of this module uses,
 * so there is no second place listing the three models.
 */
async function setFlag(req, res) {
  const { kind, id, isFlagged } = req.body || {};

  const source = SOURCE_BY_KEY[kind];
  if (!source) {
    return res.status(400).json({ success: false, message: "סוג פריט לא תקין" });
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }
  if (typeof isFlagged !== "boolean") {
    return res.status(400).json({ success: false, message: "ערך דגל לא תקין" });
  }

  try {
    const updated = await source.model.findByIdAndUpdate(id, { isFlagged }, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: "הפריט לא נמצא" });
    }
    res.json({ success: true, isFlagged: updated.isFlagged });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

module.exports = { getSummary, markSeen, getStats, setFlag };

const mongoose = require("mongoose");
const { z } = require("zod");
const Event = require("../events/event.model");
const Scholarship = require("../scholarships/scholarship.model");
const ScheduleEntry = require("./scheduleEntry.model");
const ScheduleCategory = require("./scheduleCategory.model");

/**
 * Validates the create/update payload for a manual (admin-added)
 * calendar entry. Arrives as plain JSON (no photo, unlike Events/
 * Scholarships/Jobs), so this is a normal zod object schema rather than
 * the multipart-string-transform pattern used elsewhere.
 */
const ScheduleEntryInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    categoryId: z
      .string()
      .trim()
      .refine((v) => mongoose.Types.ObjectId.isValid(v), { message: "קטגוריה לא תקינה" }),
  })
  .refine((data) => data.endDate.getTime() >= data.startDate.getTime(), {
    message: "תאריך הסיום לא יכול להיות לפני תאריך ההתחלה",
    path: ["endDate"],
  });

/** Validates the create/update payload for a manual-entry category. */
const CategoryInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  colorKey: z.enum(["orange", "teal", "pink", "purple", "red", "fuchsia", "indigo", "slate", "cyan", "stone"]),
});

/**
 * GET /api/schedule — public. Combines every date-bearing record from
 * Events, Scholarships, and the admin's own categorized manual entries into
 * one flat list the calendar can render directly. `kind` (plus, for manual
 * entries, `categoryKey`) is what the client uses to pick a pill color —
 * see Calendar.jsx.
 *
 * - Each event contributes an `"event"` entry for its date, and — only when
 *   set — a second `"event-deadline"` entry for its registration cutoff,
 *   prefixed "אחרון להרשמה:" so its pill reads differently from the plain
 *   event-date entry even though both share the same color (see
 *   `colorClassFor` in Calendar.jsx). Both carry `refId`/`linkTo` so the
 *   client can build `/events?highlight=<refId>`.
 * - Each scholarship contributes one `"scholarship-deadline"` entry,
 *   similarly prefixed "אחרון להגשה:" (matching its own form's "תאריך אחרון
 *   להגשה" label) so its pill reads as a deadline rather than a plain title.
 * - Each ScheduleEntry contributes one `"manual"` entry carrying its
 *   category's id/slot/name (entries whose category was somehow removed —
 *   category deletion is normally blocked while in use, see
 *   `deleteCategory` — are skipped defensively rather than crashing).
 */
async function listSchedule(req, res) {
  try {
    const [events, scholarships, manualEntries] = await Promise.all([
      Event.find(),
      Scholarship.find(),
      ScheduleEntry.find().populate("category"),
    ]);

    const entries = [];

    for (const event of events) {
      entries.push({
        id: `event-${event._id}`,
        kind: "event",
        title: event.title,
        startDate: event.date,
        endDate: event.date,
        refId: event._id,
        linkTo: "/events",
      });
      if (event.registrationDeadline) {
        entries.push({
          id: `event-deadline-${event._id}`,
          kind: "event-deadline",
          title: `אחרון להרשמה: ${event.title}`,
          startDate: event.registrationDeadline,
          endDate: event.registrationDeadline,
          refId: event._id,
          linkTo: "/events",
        });
      }
    }

    for (const scholarship of scholarships) {
      entries.push({
        id: `scholarship-deadline-${scholarship._id}`,
        kind: "scholarship-deadline",
        title: `אחרון להגשה: ${scholarship.title}`,
        startDate: scholarship.deadline,
        endDate: scholarship.deadline,
        refId: scholarship._id,
        linkTo: "/scholarships",
      });
    }

    for (const entry of manualEntries) {
      if (!entry.category) continue;
      entries.push({
        id: `manual-${entry._id}`,
        kind: "manual",
        title: entry.title,
        startDate: entry.startDate,
        endDate: entry.endDate,
        refId: entry._id,
        linkTo: null,
        categoryId: entry.category._id,
        categoryKey: entry.category.colorKey,
        categoryName: entry.category.name,
      });
    }

    res.json(entries);
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/** POST /api/schedule — admin-only. Creates a manual calendar entry. */
async function createScheduleEntry(req, res) {
  const result = ScheduleEntryInputSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "פרטי הרשומה בלוח השנה אינם תקינים" });
  }

  try {
    const { categoryId, ...rest } = result.data;
    const entry = await new ScheduleEntry({ ...rest, category: categoryId }).save();
    res.status(201).json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/** PATCH /api/schedule/:id — admin-only. Updates a manual calendar entry. */
async function updateScheduleEntry(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  const result = ScheduleEntryInputSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "פרטי הרשומה בלוח השנה אינם תקינים" });
  }

  try {
    const { categoryId, ...rest } = result.data;
    const entry = await ScheduleEntry.findByIdAndUpdate(
      id,
      { ...rest, category: categoryId },
      { new: true, runValidators: true }
    );
    if (!entry) {
      return res.status(404).json({ success: false, message: "הרשומה לא נמצאה" });
    }
    res.json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/** DELETE /api/schedule/:id — admin-only. Deletes a manual calendar entry. */
async function deleteScheduleEntry(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  try {
    const entry = await ScheduleEntry.findByIdAndDelete(id);
    if (!entry) {
      return res.status(404).json({ success: false, message: "הרשומה לא נמצאה" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * GET /api/schedule/categories — public (guests need the name+color to
 * render the legend and pill labels, same as everything else on this page).
 */
async function listCategories(req, res) {
  try {
    const categories = await ScheduleCategory.find().sort({ createdAt: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * POST /api/schedule/categories — admin-only. Creates a category with an
 * admin-chosen `colorKey` (see categoryPalette.js on the client for the
 * fixed list the admin picks from) — unlike the old `colorSlot`, this isn't
 * unique, so any number of categories may share a swatch.
 */
async function createCategory(req, res) {
  const result = CategoryInputSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "פרטי הקטגוריה אינם תקינים" });
  }

  try {
    const category = await new ScheduleCategory(result.data).save();
    res.status(201).json({ success: true, category });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "קיימת כבר קטגוריה בשם זה",
      });
    }
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/** PATCH /api/schedule/categories/:id — admin-only. Renames/recolors a category. */
async function updateCategory(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  const result = CategoryInputSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "פרטי הקטגוריה אינם תקינים" });
  }

  try {
    const category = await ScheduleCategory.findByIdAndUpdate(id, result.data, {
      new: true,
      runValidators: true,
    });
    if (!category) {
      return res.status(404).json({ success: false, message: "הקטגוריה לא נמצאה" });
    }
    res.json({ success: true, category });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "קיימת כבר קטגוריה בשם זה",
      });
    }
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * DELETE /api/schedule/categories/:id — admin-only. Refuses to delete a
 * category that's still in use by any manual entry (rather than either
 * cascading the delete or leaving those entries with a dangling required
 * ref) so the admin reassigns or removes those entries first.
 */
async function deleteCategory(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  try {
    const inUseCount = await ScheduleEntry.countDocuments({ category: id });
    if (inUseCount > 0) {
      return res.status(400).json({
        success: false,
        message: "לא ניתן למחוק קטגוריה המשויכת לרשומות בלוח השנה. יש למחוק או לשנות את הרשומות הללו קודם",
      });
    }

    const category = await ScheduleCategory.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({ success: false, message: "הקטגוריה לא נמצאה" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

module.exports = {
  listSchedule,
  createScheduleEntry,
  updateScheduleEntry,
  deleteScheduleEntry,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};

const mongoose = require("mongoose");
const { z } = require("zod");
const Job = require("./job.model");
const JobApplication = require("./jobApplication.model");
const { deletePhoto } = require("./upload");

/** An optional free-text field: blank/omitted becomes `null` rather than an empty string. */
const optionalTrimmedString = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

/**
 * Validates the create/update job-posting payload. Arrives as
 * `multipart/form-data` (the photo shares the request), so every field is a
 * plain string — including `isActive`, which the client always sends
 * explicitly as `"true"`/`"false"` rather than relying on native checkbox
 * submission semantics.
 *
 * `fieldSelections` arrives as a JSON-encoded array of `JobFieldOption`
 * ids (see jobField.model.js) — it has to be JSON-encoded because
 * multipart/form-data can only carry flat string fields, not a real array.
 * Each id is checked for being a syntactically valid ObjectId, but not
 * checked for actually existing — a stale/removed id here would just fail
 * to populate later, same soft-guidance-not-hard-constraint spirit as the
 * rest of this app's admin-managed lists.
 */
const objectIdString = z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), {
  message: "מזהה לא תקין",
});

const JobInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  company: z.string().trim().min(1).max(200),
  location: z.string().trim().min(1).max(200),
  fieldSelections: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return [];
      try {
        const parsed = JSON.parse(v);
        if (!Array.isArray(parsed)) throw new Error();
        return parsed;
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "בחירת שדות לא תקינה" });
        return z.NEVER;
      }
    })
    .pipe(z.array(objectIdString)),
  description: optionalTrimmedString(5000),
  salary: optionalTrimmedString(200),
  contactName: optionalTrimmedString(200),
  contactPhone: optionalTrimmedString(50),
  contactEmail: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "אימייל ליצירת קשר לא תקין",
    }),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v !== "false"),
  applicationMethod: z.enum(["contact", "link", "form"], {
    errorMap: () => ({ message: "יש לבחור שיטת הגשה" }),
  }),
  applicationUrl: optionalTrimmedString(500),
}).superRefine((data, ctx) => {
  // Cross-field rules a per-field schema can't express: which of the other
  // fields are required depends on the method the admin picked.
  if (data.applicationMethod === "contact") {
    if (!data.contactName && !data.contactEmail && !data.contactPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contactName"],
        message: "יש למלא לפחות דרך התקשרות אחת",
      });
    }
  }

  if (data.applicationMethod === "link") {
    const parsed = z.string().url().safeParse(data.applicationUrl || "");
    if (!parsed.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["applicationUrl"],
        message: "קישור לא תקין",
      });
    }
  }
});

/**
 * Blanks whichever fields the chosen `applicationMethod` doesn't use, so a
 * posting switched from "link" to "contact" doesn't keep a stale URL that a
 * later change could surface. Returns a new object; never mutates `data`.
 */
function clearUnusedApplicationFields(data) {
  const cleared = { ...data };
  if (data.applicationMethod !== "link") cleared.applicationUrl = null;
  if (data.applicationMethod !== "contact") {
    cleared.contactName = null;
    cleared.contactEmail = null;
    cleared.contactPhone = null;
  }
  return cleared;
}

// Every job-listing query resolves `fieldSelections` down to
// `{ _id, name, field: { _id, name } }` so the client can render/filter
// by field+value without a separate round trip per job.
const FIELD_SELECTIONS_POPULATE = { path: "fieldSelections", populate: { path: "field" } };

/**
 * GET /api/jobs — public list of active postings only, newest first.
 * Inactive postings are excluded at the query level, not merely hidden in
 * the UI, so they never reach a guest's browser at all.
 */
async function listJobs(req, res) {
  try {
    const jobs = await Job.find({ isActive: true })
      .sort({ createdAt: -1 })
      .populate(FIELD_SELECTIONS_POPULATE);
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * GET /api/jobs/admin — admin-only. Lists every posting regardless of
 * `isActive`, so the admin can see, reactivate, or delete inactive ones.
 *
 * Each posting also carries an `applicationCount` for the admin UI's "מועמדים"
 * button — same reasoning, same shape and same $group/.lean() constraints as
 * listEventsAdmin in event.controller.js; see the note there.
 *
 * Postings whose `applicationMethod` isn't "form" can never have applications,
 * so most counts are legitimately 0. That isn't filtered server-side: the client
 * already renders the button only for form postings.
 */
async function listJobsAdmin(req, res) {
  try {
    const [jobs, counts] = await Promise.all([
      Job.find().sort({ createdAt: -1 }).populate(FIELD_SELECTIONS_POPULATE).lean(),
      JobApplication.aggregate([{ $group: { _id: "$job", count: { $sum: 1 } } }]),
    ]);

    const countByJob = new Map(counts.map((row) => [String(row._id), row.count]));

    res.json(
      jobs.map((job) => ({
        ...job,
        applicationCount: countByJob.get(String(job._id)) || 0,
      }))
    );
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * POST /api/jobs — admin-only. Creates a new job posting. The photo is
 * optional; when present it was already uploaded to Cloudinary by the
 * `upload.single("photo")` + `toCloudinary` middleware pair (see
 * job.routes.js), which leaves its URL on `req.photoUrl`.
 */
async function createJob(req, res) {
  const result = JobInputSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "פרטי המשרה אינם תקינים" });
  }

  try {
    const photoUrl = req.photoUrl;
    const job = await new Job({
      ...clearUnusedApplicationFields(result.data),
      ...(photoUrl && { photoUrl }),
    }).save();
    res.status(201).json({ success: true, job });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * PATCH /api/jobs/:id — admin-only. Updates a job posting's fields. If a
 * new photo is uploaded, it replaces the old one and the old file is
 * deleted from disk; if no photo is uploaded, the existing photo is left
 * untouched.
 */
async function updateJob(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה משרה לא תקין" });
  }

  const result = JobInputSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "פרטי המשרה אינם תקינים" });
  }

  try {
    const existing = await Job.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "המשרה לא נמצאה" });
    }

    const updates = clearUnusedApplicationFields(result.data);
    if (req.file) {
      updates.photoUrl = req.photoUrl;
      deletePhoto(existing.photoUrl);
    }

    const job = await Job.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    res.json({ success: true, job });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * DELETE /api/jobs/:id — admin-only. Deletes the job posting and its
 * uploaded photo, if any.
 */
async function deleteJob(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה משרה לא תקין" });
  }

  try {
    const job = await Job.findByIdAndDelete(id);
    if (!job) {
      return res.status(404).json({ success: false, message: "המשרה לא נמצאה" });
    }
    deletePhoto(job.photoUrl);
    await JobApplication.deleteMany({ job: job._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/** Validates an applicant's payload (no authentication required). */
const ApplySchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{7,20}$/, "מספר טלפון לא תקין"),
});

/** Validates an admin's status update for one application. */
const ApplicationStatusSchema = z.object({
  status: z.enum(["submitted", "in_review", "handled"]),
});

/**
 * POST /api/jobs/:id/apply — public, rate-limited (see applyLimiter in
 * job.routes.js). Re-checks that the job actually collects applications and
 * is still active: the UI only offers the button on "form" postings, but
 * this endpoint is public, so it enforces that itself rather than trusting
 * the client — same reasoning as registerForEvent's isRegistrationClosed
 * re-check.
 */
async function applyToJob(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה משרה לא תקין" });
  }

  const result = ApplySchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "פרטי ההגשה אינם תקינים" });
  }

  try {
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ success: false, message: "המשרה לא נמצאה" });
    }
    if (job.applicationMethod !== "form") {
      return res
        .status(400)
        .json({ success: false, message: "משרה זו אינה מקבלת הגשות דרך האתר" });
    }
    if (!job.isActive) {
      return res.status(400).json({ success: false, message: "המשרה אינה פעילה" });
    }

    const application = await new JobApplication({ job: job._id, ...result.data }).save();
    res.status(201).json({ success: true, application });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/** GET /api/jobs/:id/applications — admin-only. Oldest first. */
async function listApplications(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה משרה לא תקין" });
  }

  try {
    const applications = await JobApplication.find({ job: id }).sort({ createdAt: 1 });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/** PATCH /api/jobs/:id/applications/:applicationId — admin-only. */
async function updateApplicationStatus(req, res) {
  const { id, applicationId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(applicationId)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  const result = ApplicationStatusSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "סטטוס לא תקין" });
  }

  try {
    const application = await JobApplication.findOneAndUpdate(
      { _id: applicationId, job: id },
      { status: result.data.status },
      { new: true, runValidators: true }
    );
    if (!application) {
      return res.status(404).json({ success: false, message: "ההגשה לא נמצאה" });
    }
    res.json({ success: true, application });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/** DELETE /api/jobs/:id/applications/:applicationId — admin-only. */
async function deleteApplication(req, res) {
  const { id, applicationId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(applicationId)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  try {
    const application = await JobApplication.findOneAndDelete({ _id: applicationId, job: id });
    if (!application) {
      return res.status(404).json({ success: false, message: "ההגשה לא נמצאה" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

module.exports = {
  applyToJob,
  listApplications,
  updateApplicationStatus,
  deleteApplication,
  listJobs,
  listJobsAdmin,
  createJob,
  updateJob,
  deleteJob,
};

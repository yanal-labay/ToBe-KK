const mongoose = require("mongoose");
const { z } = require("zod");
const Job = require("./job.model");
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
 */
const JobInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  company: z.string().trim().min(1).max(200),
  location: z.string().trim().min(1).max(200),
  jobType: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || v === "fulltime" || v === "parttime", {
      message: "היקף משרה לא תקין",
    }),
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
});

/**
 * GET /api/jobs — public list of active postings only, newest first.
 * Inactive postings are excluded at the query level, not merely hidden in
 * the UI, so they never reach a guest's browser at all.
 */
async function listJobs(req, res) {
  try {
    const jobs = await Job.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * GET /api/jobs/admin — admin-only. Lists every posting regardless of
 * `isActive`, so the admin can see, reactivate, or delete inactive ones.
 */
async function listJobsAdmin(req, res) {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * POST /api/jobs — admin-only. Creates a new job posting. The photo is
 * optional; when present it was already written to disk by the
 * `upload.single("photo")` middleware (see job.routes.js) and is available
 * here as `req.file`.
 */
async function createJob(req, res) {
  const result = JobInputSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "פרטי המשרה אינם תקינים" });
  }

  try {
    const photoUrl = req.file ? `/uploads/jobs/${req.file.filename}` : undefined;
    const job = await new Job({ ...result.data, ...(photoUrl && { photoUrl }) }).save();
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

    const updates = { ...result.data };
    if (req.file) {
      updates.photoUrl = `/uploads/jobs/${req.file.filename}`;
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
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

module.exports = { listJobs, listJobsAdmin, createJob, updateJob, deleteJob };

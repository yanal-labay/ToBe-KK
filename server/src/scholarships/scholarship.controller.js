const mongoose = require("mongoose");
const { z } = require("zod");
const Scholarship = require("./scholarship.model");
const { deletePhoto } = require("./upload");

/**
 * Validates the create/update scholarship payload. Arrives as
 * `multipart/form-data` (the photo shares the request), so every field is a
 * plain string.
 *
 * `fieldSelections` arrives as a JSON-encoded array of `ScholarshipFieldOption`
 * ids (see scholarshipField.model.js) — it has to be JSON-encoded because
 * multipart/form-data can only carry flat string fields, not a real array.
 * Each id is checked for being a syntactically valid ObjectId, but not
 * checked for actually existing — a stale/removed id here would just fail
 * to populate later, same soft-guidance-not-hard-constraint spirit as the
 * rest of this app's admin-managed lists (mirrors job.controller.js's
 * `JobInputSchema.fieldSelections`).
 */
const optionalNonNegativeNumber = (message) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0), { message });

const objectIdString = z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), {
  message: "מזהה לא תקין",
});

const ScholarshipInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  deadline: z.coerce.date(),
  url: z.string().trim().url("קישור לא תקין"),
  amount: optionalNonNegativeNumber("סכום המלגה לא תקין"),
  volunteerHours: optionalNonNegativeNumber("מספר שעות ההתנדבות לא תקין"),
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
});

// Every scholarship-listing query resolves `fieldSelections` down to
// `{ _id, name, field: { _id, name } }` so the client can render/filter by
// field+value without a separate round trip per scholarship.
const FIELD_SELECTIONS_POPULATE = { path: "fieldSelections", populate: { path: "field" } };

/** GET /api/scholarships — public list, newest first, with fields populated. */
async function listScholarships(req, res) {
  try {
    const scholarships = await Scholarship.find()
      .populate(FIELD_SELECTIONS_POPULATE)
      .sort({ createdAt: -1 });
    res.json(scholarships);
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * POST /api/scholarships — admin-only. Creates a new scholarship. The
 * photo is optional; when present it was already written to disk by the
 * `upload.single("photo")` middleware (see scholarship.routes.js) and is
 * available here as `req.file`.
 */
async function createScholarship(req, res) {
  const result = ScholarshipInputSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "פרטי המלגה אינם תקינים" });
  }

  try {
    const photoUrl = req.file ? `/uploads/scholarships/${req.file.filename}` : undefined;
    const scholarship = await new Scholarship({
      ...result.data,
      ...(photoUrl && { photoUrl }),
    }).save();
    await scholarship.populate(FIELD_SELECTIONS_POPULATE);
    res.status(201).json({ success: true, scholarship });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * PATCH /api/scholarships/:id — admin-only. Updates a scholarship's
 * fields. If a new photo is uploaded, it replaces the old one and the old
 * file is deleted from disk; if no photo is uploaded, the existing photo
 * is left untouched.
 */
async function updateScholarship(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה מלגה לא תקין" });
  }

  const result = ScholarshipInputSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "פרטי המלגה אינם תקינים" });
  }

  try {
    const existing = await Scholarship.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "המלגה לא נמצאה" });
    }

    const updates = { ...result.data };
    if (req.file) {
      updates.photoUrl = `/uploads/scholarships/${req.file.filename}`;
      deletePhoto(existing.photoUrl);
    }

    const scholarship = await Scholarship.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).populate(FIELD_SELECTIONS_POPULATE);
    res.json({ success: true, scholarship });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * DELETE /api/scholarships/:id — admin-only. Deletes the scholarship and
 * its uploaded photo, if any.
 */
async function deleteScholarship(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה מלגה לא תקין" });
  }

  try {
    const scholarship = await Scholarship.findByIdAndDelete(id);
    if (!scholarship) {
      return res.status(404).json({ success: false, message: "המלגה לא נמצאה" });
    }
    deletePhoto(scholarship.photoUrl);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

module.exports = { listScholarships, createScholarship, updateScholarship, deleteScholarship };

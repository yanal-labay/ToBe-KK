const mongoose = require("mongoose");
const { z } = require("zod");
const Registrant = require("./registrant.model");

/** An optional free-text field: blank/null/omitted becomes `null` rather than an empty string. */
const optionalTrimmedString = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null));

/**
 * Validates a student-registry sign-up/edit payload (create and admin edit
 * share this). `institution`/`fieldOfStudy`/`yearOfStudy` are nullable at
 * the field level (a non-student registrant has none of these), but the
 * `.superRefine()` below makes them required whenever `isStudent` is true
 * — Mongoose's own `required` can't express "required unless isStudent is
 * false", so this schema is what actually enforces it. `education` (highest
 * completed level) and `isStudent` (currently enrolled anywhere) are
 * deliberately independent questions — see registrant.model.js.
 *
 * `isStudent` accepts either a real boolean (JSON from the guest form / the
 * admin's create form) or the string "true"/"false" (the admin table's
 * inline `<select>` cell editor, which — like every native `<select>` —
 * can only ever send a string).
 */
const RegistrantInputSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.string().trim().toLowerCase().email(),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+\-\s()]{7,20}$/, "מספר טלפון לא תקין"),
    city: z.string().trim().min(1).max(200),
    education: z.enum(["high_school", "bachelor", "master", "doctorate", "other"]),
    isStudent: z.union([z.boolean(), z.enum(["true", "false"]).transform((v) => v === "true")]),
    fieldOfStudy: optionalTrimmedString(200),
    institution: optionalTrimmedString(200),
    yearOfStudy: z
      .union([z.coerce.number().int().min(1).max(6), z.null()])
      .optional()
      .transform((v) => v ?? null),
    interests: z.array(z.enum(["scholarships", "jobs", "events"])),
    militaryStatus: z
      .enum(["discharged", "currently_serving", "did_not_serve"])
      .optional()
      .transform((v) => v ?? null),
  })
  .superRefine((data, ctx) => {
    if (!data.isStudent) return;
    if (!data.institution) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "שדה חובה", path: ["institution"] });
    }
    if (!data.fieldOfStudy) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "שדה חובה", path: ["fieldOfStudy"] });
    }
    if (data.yearOfStudy == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "שדה חובה", path: ["yearOfStudy"] });
    }
  });

/**
 * POST /api/student-registry — public, rate-limited (see registerLimiter in
 * registrant.routes.js). Anyone can sign up with no account; duplicate
 * emails are rejected with a friendly message rather than a generic 500,
 * both via this pre-check and the model's unique index as a DB-level
 * backstop against races.
 */
async function createRegistrant(req, res) {
  const result = RegistrantInputSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "הפרטים שהוזנו אינם תקינים" });
  }

  try {
    const registrant = await new Registrant(result.data).save();
    res.status(201).json({ success: true, registrant });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ success: false, message: "כתובת מייל זו כבר רשומה במאגר הצעירים" });
    }
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * GET /api/student-registry — admin-only. Lists everyone signed up, newest
 * first. Powers the admin registrants table, pie-chart breakdowns, and
 * click-to-edit flow on the /student-registry page.
 */
async function listRegistrants(req, res) {
  try {
    const registrants = await Registrant.find().sort({ createdAt: -1 });
    res.json(registrants);
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * PATCH /api/student-registry/:id — admin-only. Lets an admin correct or
 * update any registrant's details (e.g. after clicking their row in the
 * table). Reuses the same validation as sign-up.
 */
async function updateRegistrant(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  const result = RegistrantInputSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "הפרטים שהוזנו אינם תקינים" });
  }

  try {
    const registrant = await Registrant.findByIdAndUpdate(id, result.data, {
      new: true,
      runValidators: true,
    });
    if (!registrant) {
      return res.status(404).json({ success: false, message: "הרשומה לא נמצאה" });
    }
    res.json({ success: true, registrant });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ success: false, message: "כתובת מייל זו כבר רשומה במאגר הצעירים" });
    }
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * DELETE /api/student-registry/:id — admin-only. Removes one registrant
 * (e.g. a duplicate or test entry), used by the checkbox-select + delete
 * flow in RegistrantsPanel.jsx.
 */
async function deleteRegistrant(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  try {
    const registrant = await Registrant.findByIdAndDelete(id);
    if (!registrant) {
      return res.status(404).json({ success: false, message: "הרשומה לא נמצאה" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

module.exports = { createRegistrant, listRegistrants, updateRegistrant, deleteRegistrant };

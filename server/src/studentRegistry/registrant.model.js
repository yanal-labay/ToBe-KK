const mongoose = require("mongoose");

/**
 * One student's sign-up to the youth/student registry ("רישום למאגר
 * הצעירים"). This is not a login account — there is no password, and
 * guests never authenticate to submit or view their own entry. The admin's
 * privileges are viewing the full list, editing any entry, and browsing
 * the pie-chart breakdowns (see registrant.controller.js).
 *
 * - `email` is unique (case-insensitive via `lowercase: true`) so the same
 *   person can't sign up twice; enforced both here (DB-level backstop) and
 *   in the zod schema's pre-check in the controller.
 * - `institution`/`fieldOfStudy` are plain strings, not references to
 *   `ListOption` — the form picks from that admin-managed list (or lets the
 *   guest type free text when "אחר" is selected), but once submitted the
 *   value is decoupled from the list, so deleting a list option later never
 *   invalidates existing registrants.
 * - `academicStatus` is the degree level (תואר ראשון/שני/שלישי/אחר).
 * - `interests` is a subset of `['scholarships', 'jobs', 'events']`.
 * - `militaryStatus` is nullable, same convention as `Event.price` — null
 *   means "not specified," since this field is optional.
 */
const RegistrantSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  phone: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  fieldOfStudy: { type: String, required: true, trim: true },
  institution: { type: String, required: true, trim: true },
  academicStatus: {
    type: String,
    required: true,
    enum: ["bachelor", "master", "doctorate", "other"],
  },
  yearOfStudy: { type: Number, required: true, min: 1, max: 6 },
  interests: { type: [String], required: true },
  militaryStatus: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Registrant", RegistrantSchema);

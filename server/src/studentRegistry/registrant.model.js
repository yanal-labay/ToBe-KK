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
 * - `education` is the registrant's highest completed education level
 *   (בגרות/תואר ראשון/שני/שלישי/אחר) — independent of whether they're
 *   *currently* enrolled anywhere. That's tracked separately by
 *   `isStudent`, which is what actually makes `institution`/`fieldOfStudy`/
 *   `yearOfStudy` nullable below — see the `.superRefine()` in
 *   registrant.controller.js's `RegistrantInputSchema`, which enforces
 *   "required unless isStudent is false" (Mongoose's own `required` can't
 *   express a condition on a sibling field). Someone can hold a bachelor's
 *   degree (`education: "bachelor"`) and not currently be a student, or
 *   have only a matriculation certificate (`education: "high_school"`) and
 *   still be currently enrolled somewhere — the two questions are
 *   deliberately independent, not one field doing double duty.
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
  education: {
    type: String,
    required: true,
    enum: ["high_school", "bachelor", "master", "doctorate", "other"],
  },
  isStudent: { type: Boolean, required: true },
  fieldOfStudy: { type: String, default: null, trim: true },
  institution: { type: String, default: null, trim: true },
  yearOfStudy: { type: Number, default: null, min: 1, max: 6 },
  interests: { type: [String], required: true },
  militaryStatus: { type: String, default: null },
  // Admin "needs attention" marker, surfaced in the activity tree (see
  // activity.controller.js) where it colours this row red and rolls up to
  // its group headers. Shared across admins rather than per-admin: it
  // describes the submission, not one person's view of it.
  isFlagged: { type: Boolean, default: false },
  // Admins who have cleared the notification for this row. Per-admin by
  // design, which a single shared "last seen" timestamp can't express once
  // notifications are clearable per event / per person rather than all at
  // once. Bounded by the number of admin accounts, so it stays tiny.
  seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Registrant", RegistrantSchema);

const mongoose = require("mongoose");

/**
 * A job posting on the public "לוח משרות" page.
 *
 * - `title`/`company`/`location` are the only required fields; everything
 *   else is nullable — `null` means "not specified," and the client hides
 *   that line entirely rather than showing a placeholder (same convention
 *   as `Event.price`/`Scholarship.amount`).
 * - `fieldSelections` references admin-defined `JobField`/`JobFieldOption`
 *   documents (e.g. a "סוג משרה" field with a "משרה חלקית" option
 *   selected) — the admin can add new fields, rename one, and manage each
 *   field's checkbox values entirely independently of any posting (see
 *   `JobFieldsManager.jsx`/`jobField.model.js`). A job can hold multiple
 *   selections from the same field at once (same convention as
 *   `Scholarship.fieldSelections`) — nothing enforces one-per-field here.
 *   This is the only mechanism for tagging a job: "suits students" used to
 *   be a separate `isStudentPosition` boolean, which was removed once every
 *   such job carried a "סטודנטים" option instead, so the two could no
 *   longer disagree.
 * - `applicationMethod` decides how a visitor applies, and which of the
 *   other fields matter: "contact" uses the contactName/Email/Phone trio,
 *   "link" uses `applicationUrl`, and "form" collects `JobApplication`
 *   documents through the public /apply endpoint. The controller nulls out
 *   whichever fields the chosen method doesn't use, so switching a posting
 *   from one method to another never leaves stale data behind.
 *
 *   `default: "contact"` exists so postings created before this field keep
 *   working — they all have contact details, and Mongoose fills a missing
 *   default on read. Same reasoning as `Event.isActive`.
 * - `salary` is free text (a range, "לפי ניסיון", etc.), not a number —
 *   job salaries don't fit a single numeric field the way a scholarship
 *   amount does.
 * - `contactName`/`contactEmail`/`contactPhone` are an optional contact
 *   block; guests read them directly off the card (there's no "apply" URL
 *   for jobs the way Scholarship has one).
 * - `isActive` is a manual admin toggle (not date-based like Events'/
 *   Scholarships' expiry) — inactive postings are excluded from the public
 *   list at the query level (see `listJobs` in job.controller.js), not
 *   merely hidden client-side, but stay visible to the admin.
 * - `photoUrl` is optional (same nullable convention as Scholarship.photoUrl)
 *   — when null, the client shows the theme-appropriate site logo instead
 *   (see JobCard.jsx).
 */
const JobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  company: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  fieldSelections: [{ type: mongoose.Schema.Types.ObjectId, ref: "JobFieldOption" }],
  description: { type: String, default: null },
  salary: { type: String, default: null },
  contactName: { type: String, default: null },
  contactEmail: { type: String, default: null },
  contactPhone: { type: String, default: null },
  applicationMethod: { type: String, enum: ["contact", "link", "form"], default: "contact" },
  applicationUrl: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  photoUrl: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Job", JobSchema);

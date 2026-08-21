const mongoose = require("mongoose");

/**
 * A job posting on the public "לוח משרות" page.
 *
 * - `title`/`company`/`location` are the only required fields; everything
 *   else is nullable — `null` means "not specified," and the client hides
 *   that line entirely rather than showing a placeholder (same convention
 *   as `Event.price`/`Scholarship.amount`).
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
  jobType: { type: String, enum: ["fulltime", "parttime"], default: null },
  description: { type: String, default: null },
  salary: { type: String, default: null },
  contactName: { type: String, default: null },
  contactEmail: { type: String, default: null },
  contactPhone: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  photoUrl: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Job", JobSchema);

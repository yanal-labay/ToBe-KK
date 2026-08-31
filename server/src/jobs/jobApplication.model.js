const mongoose = require("mongoose");

/**
 * One person's "leave your details" submission against a Job whose
 * `applicationMethod` is "form". Applicants have no accounts; they submit
 * through the public "/apply" endpoint, and only admins can read the list
 * or change `status` (see job.routes.js).
 *
 * `status` is set by an admin as they work through candidates:
 * - "submitted": the default, set at submission time.
 * - "in_review" / "handled": set manually from the admin applications panel.
 *
 * Stored as English keys with Hebrew labels supplied client-side, matching
 * `Registration.status`.
 *
 * Deleting the parent Job cascades to delete all of its applications (see
 * deleteJob in job.controller.js) — there is no foreign-key constraint
 * enforcing this at the database level, so that cleanup must happen in
 * application code.
 */
const JobApplicationSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true },
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
  status: {
    type: String,
    enum: ["submitted", "in_review", "handled"],
    default: "submitted",
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("JobApplication", JobApplicationSchema);

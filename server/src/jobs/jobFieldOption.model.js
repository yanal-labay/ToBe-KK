const mongoose = require("mongoose");

/**
 * One checkbox value belonging to a `JobField` (e.g. "הייטק" under the
 * "תחום" field). The admin adds/removes these independently of any job
 * posting — a posting only ever *picks* from a field's existing options.
 * Unlike the plain-string admin-managed lists elsewhere in this app
 * (`ListOption`), `Job.fieldSelections` references these by id, so
 * deleting an option cascades to pull it out of every job that had it
 * selected (see `jobField.controller.js`'s `deleteFieldOption`) rather
 * than leaving a dangling stale string behind.
 */
const JobFieldOptionSchema = new mongoose.Schema({
  field: { type: mongoose.Schema.Types.ObjectId, ref: "JobField", required: true },
  name: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

JobFieldOptionSchema.index({ field: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("JobFieldOption", JobFieldOptionSchema);

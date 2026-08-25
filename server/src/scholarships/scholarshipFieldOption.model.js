const mongoose = require("mongoose");

/**
 * One checkbox value belonging to a `ScholarshipField` (e.g. "צ'רקסים" under
 * the "תגיות" field). The admin adds/removes these independently of any
 * scholarship — a scholarship only ever *picks* from a field's existing
 * options, and unlike Job's fields, it can pick several from the same field
 * at once. `Scholarship.fieldSelections` references these by id, so
 * deleting an option cascades to pull it out of every scholarship that had
 * it selected (see `scholarshipField.controller.js`'s `deleteFieldOption`)
 * rather than leaving a dangling stale reference behind.
 */
const ScholarshipFieldOptionSchema = new mongoose.Schema({
  field: { type: mongoose.Schema.Types.ObjectId, ref: "ScholarshipField", required: true },
  name: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

ScholarshipFieldOptionSchema.index({ field: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("ScholarshipFieldOption", ScholarshipFieldOptionSchema);

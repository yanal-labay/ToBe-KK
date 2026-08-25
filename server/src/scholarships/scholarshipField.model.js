const mongoose = require("mongoose");

/**
 * An admin-defined categorization field for scholarships (e.g. "תגיות", or
 * any new one the admin creates) — the admin can add new fields, rename an
 * existing one, and manage its checkbox values (see `ScholarshipFieldOption`)
 * independently of any single scholarship. Renaming a field only ever
 * touches this one document: `Scholarship.fieldSelections` references
 * `ScholarshipFieldOption` ids, never a field's name directly, so a rename
 * never needs to cascade anywhere.
 */
const ScholarshipFieldSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ScholarshipField", ScholarshipFieldSchema);

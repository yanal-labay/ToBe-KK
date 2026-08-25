const mongoose = require("mongoose");

/**
 * An admin-defined categorization field for job postings (e.g. "סוג משרה",
 * "תחום", or any new one the admin creates) — the admin can add new
 * fields, rename an existing one, and manage its checkbox values (see
 * `JobFieldOption`) independently of any single posting. Renaming a field
 * only ever touches this one document: `Job.fieldSelections` references
 * `JobFieldOption` ids, never a field's name directly, so a rename never
 * needs to cascade anywhere.
 */
const JobFieldSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("JobField", JobFieldSchema);

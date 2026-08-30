const mongoose = require("mongoose");

/**
 * An admin-defined categorization field for events (e.g. "סוג אירוע",
 * "קהל יעד", or any new one the admin creates) — the admin can add new
 * fields, rename an existing one, and manage its checkbox values (see
 * `EventFieldOption`) independently of any single event. Renaming a field
 * only ever touches this one document: `Event.fieldSelections` references
 * `EventFieldOption` ids, never a field's name directly, so a rename never
 * needs to cascade anywhere.
 *
 * Mirrors `jobs/jobField.model.js` exactly.
 */
const EventFieldSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("EventField", EventFieldSchema);

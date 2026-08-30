const mongoose = require("mongoose");

/**
 * One checkbox value belonging to an `EventField` (e.g. "הרצאה" under the
 * "סוג אירוע" field). The admin adds/removes these independently of any
 * event — an event only ever *picks* from a field's existing options.
 * Unlike the plain-string admin-managed lists elsewhere in this app
 * (`ListOption`), `Event.fieldSelections` references these by id, so
 * deleting an option cascades to pull it out of every event that had it
 * selected (see `eventField.controller.js`'s `deleteFieldOption`) rather
 * than leaving a dangling stale string behind.
 *
 * Mirrors `jobs/jobFieldOption.model.js` exactly.
 */
const EventFieldOptionSchema = new mongoose.Schema({
  field: { type: mongoose.Schema.Types.ObjectId, ref: "EventField", required: true },
  name: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

EventFieldOptionSchema.index({ field: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("EventFieldOption", EventFieldOptionSchema);

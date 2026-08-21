const mongoose = require("mongoose");

/**
 * A named category for admin-added manual calendar entries. The calendar's
 * color palette has exactly 5 swatches: 2 are permanently reserved for
 * Events and Scholarships (see Calendar.css on the client), and the
 * remaining 3 (`colorSlot` 0/1/2) are handed out one-per-category here —
 * `colorSlot` is unique, so at most 3 categories can ever exist at once. A
 * manual entry must pick one of these categories (see ScheduleEntry.category),
 * which is what actually determines its pill color on the calendar.
 */
const ScheduleCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  colorSlot: { type: Number, required: true, enum: [0, 1, 2], unique: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ScheduleCategory", ScheduleCategorySchema);

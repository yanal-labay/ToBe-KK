const mongoose = require("mongoose");

/**
 * A named category for admin-added manual calendar entries. Its `colorKey`
 * is one of a fixed set of ~10 curated palette keys (see categoryPalette.js
 * on the client and Calendar.css for the actual hex values) that the admin
 * explicitly picks when creating or editing the category — not unique, so
 * any number of categories can share a swatch, which is what makes the
 * category count itself uncapped. A manual entry must pick one of these
 * categories (see ScheduleEntry.category), which is what actually determines
 * its pill color on the calendar.
 */
const ScheduleCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  colorKey: {
    type: String,
    required: true,
    enum: ["orange", "teal", "pink", "purple", "red", "fuchsia", "indigo", "slate", "cyan", "stone"],
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ScheduleCategory", ScheduleCategorySchema);

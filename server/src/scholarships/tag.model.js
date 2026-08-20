const mongoose = require("mongoose");

/**
 * A reusable tag describing who a scholarship is for (e.g. "תושבי כפר כמא",
 * "צ'רקסים"). Managed by admins independently of any scholarship post (see
 * tag.controller.js) — a scholarship only ever references existing tags by
 * id, it never creates one inline.
 */
const TagSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Tag", TagSchema);

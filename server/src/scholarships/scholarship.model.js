const mongoose = require("mongoose");

/**
 * A scholarship listing on the public "מלגות" page.
 *
 * - `deadline` is the last day to submit a request.
 * - `url` links out to the scholarship's own application/info page.
 * - `photoUrl` is optional (same nullable convention as Event.photoUrl) —
 *   when null, the client shows the site logo instead (see
 *   ScholarshipCard.jsx).
 * - `tags` references existing Tag documents; admins choose from the
 *   existing list when creating/editing a scholarship rather than typing
 *   free text (see tag.model.js).
 * - `amount` (סכום המלגה) and `volunteerHours` (שעות התנדבות נדרשות) are
 *   both nullable, same convention as `photoUrl`/Event.price — null means
 *   "not specified for this scholarship" and the client hides that line
 *   entirely rather than showing a placeholder.
 */
const ScholarshipSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  deadline: { type: Date, required: true },
  url: { type: String, required: true, trim: true },
  amount: { type: Number, default: null },
  volunteerHours: { type: Number, default: null },
  photoUrl: { type: String, default: null },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag" }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Scholarship", ScholarshipSchema);

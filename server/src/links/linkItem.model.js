const mongoose = require("mongoose");

/**
 * One headline + description + link-button item within a LinkGroup card.
 * Unlike ContactPerson's optional fields, all three are required — they're
 * the fixed, complete shape of one link item, not independently-optional
 * variations.
 *
 * `order` controls display position within its group (lower first), only
 * ever changed via the admin's drag-to-reorder UI (see reorderItems in
 * link.controller.js).
 */
const LinkItemSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: "LinkGroup", required: true },
  headline: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  url: { type: String, required: true, trim: true },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("LinkItem", LinkItemSchema);

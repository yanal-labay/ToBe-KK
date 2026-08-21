const mongoose = require("mongoose");

/**
 * One "card" on the /links page — a colored header bar naming the group
 * (e.g. "אתרים שימושיים"), with its link items listed underneath (see
 * LinkItem). Admins can create more than one of these.
 *
 * `order` controls display position (lower first) and is only ever changed
 * via the admin's drag-to-reorder UI (see reorderGroups in
 * link.controller.js) — new groups get the next integer so they append at
 * the end.
 */
const LinkGroupSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("LinkGroup", LinkGroupSchema);

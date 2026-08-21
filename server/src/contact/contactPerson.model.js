const mongoose = require("mongoose");

/**
 * One person's row within a ContactGroup. Only `name`/`role` are
 * required — `mobile`/`phone`/`email`/`location` are each independently
 * nullable, same "null means not specified, hide that line" convention
 * as `Event.price`/`Scholarship.amount` elsewhere in this app. `location`
 * is a free-text address; when set, the client turns it into a Google
 * Maps link (see ContactGroupCard.jsx) rather than storing a URL here.
 */
const ContactPersonSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: "ContactGroup", required: true },
  name: { type: String, required: true, trim: true },
  role: { type: String, required: true, trim: true },
  mobile: { type: String, default: null },
  phone: { type: String, default: null },
  email: { type: String, default: null },
  location: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ContactPerson", ContactPersonSchema);

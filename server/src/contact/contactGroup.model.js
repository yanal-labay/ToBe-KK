const mongoose = require("mongoose");

/**
 * One contact "table" on the /contact page — a colored header bar naming
 * the group (e.g. "פרטי יצירת קשר"), with its people listed underneath
 * (see ContactPerson). Admins can create more than one of these for
 * separate teams/departments.
 */
const ContactGroupSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ContactGroup", ContactGroupSchema);

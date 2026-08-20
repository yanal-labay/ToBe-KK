const mongoose = require("mongoose");

/**
 * An admin-managed dropdown option for the student registry form — either
 * an institution (מוסד לימודים) or a field of study (מגמת לימוד). Both
 * lists share this one model (distinguished by `category`) since they're
 * structurally identical: a name the admin can add/remove independently of
 * any registrant submission. The compound unique index prevents the same
 * name being added twice within one category (but the same name could
 * exist in both categories, which is fine).
 *
 * Deleting an option does not touch existing `Registrant` documents —
 * `Registrant.institution`/`fieldOfStudy` are stored as plain strings, not
 * references, so removing an option only affects future selections.
 */
const ListOptionSchema = new mongoose.Schema({
  category: { type: String, required: true, enum: ["institution", "fieldOfStudy"] },
  name: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

ListOptionSchema.index({ category: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("ListOption", ListOptionSchema);

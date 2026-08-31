const EventField = require("./eventField.model");
const EventFieldOption = require("./eventFieldOption.model");

// One starter field so the ניהול שדות panel and the filter sidebar aren't
// empty before an admin has managed them. Unlike jobs — which seeds two
// fields to preserve categories that predated the admin-managed system —
// events never had fixed categories, so there's nothing to carry over and
// one example field is enough.
const DEFAULT_FIELDS = [{ name: "סוג אירוע", options: [] }];

/**
 * Seeds the default field on first run only. Never re-adds a field an
 * admin has since deleted, since it bails whenever any field already
 * exists. Mirrors `jobs/seedJobFields.js`.
 */
async function seedEventFields() {
  // Wait for the unique index on `name` to finish building before seeding.
  // Mongoose's autoIndex is asynchronous, so without this a second process
  // starting at the same time (nodemon restarting twice in quick succession,
  // say) can insert a duplicate *before* the constraint exists — and once
  // duplicates are in the collection the unique index silently fails to
  // build at all, leaving it unprotected from then on.
  await EventField.init();

  const fieldCount = await EventField.countDocuments();
  if (fieldCount > 0) return;

  for (const { name, options } of DEFAULT_FIELDS) {
    try {
      const field = await new EventField({ name }).save();
      if (options.length > 0) {
        await EventFieldOption.insertMany(options.map((name) => ({ field: field._id, name })));
      }
    } catch (err) {
      // 11000 = duplicate key: a concurrent boot already seeded this field.
      // Anything else is a real failure and should surface.
      if (err.code !== 11000) throw err;
    }
  }
}

module.exports = seedEventFields;

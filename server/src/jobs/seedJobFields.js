const JobField = require("./jobField.model");
const JobFieldOption = require("./jobFieldOption.model");

// The two fields that used to be fixed categories (jobType/industry)
// before the admin could add their own — seeded here so they keep
// existing as real, ordinary fields (job type with its two original
// values) instead of disappearing when the fixed-category system was
// replaced with this one.
const DEFAULT_FIELDS = [
  { name: "סוג משרה", options: ["משרה מלאה", "משרה חלקית"] },
  { name: "תחום", options: [] },
];

/**
 * Seeds the two default fields on first run, so the list isn't empty
 * before an admin manages it themselves. Only inserts when there are zero
 * fields yet — never re-adds a field (or "סוג משרה"'s options) an admin
 * has since deleted.
 */
async function seedJobFields() {
  const fieldCount = await JobField.countDocuments();
  if (fieldCount > 0) return;

  for (const { name, options } of DEFAULT_FIELDS) {
    const field = await new JobField({ name }).save();
    if (options.length > 0) {
      await JobFieldOption.insertMany(options.map((name) => ({ field: field._id, name })));
    }
  }
}

module.exports = seedJobFields;

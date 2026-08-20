const ListOption = require("./listOption.model");

const DEFAULT_INSTITUTIONS = [
  "האוניברסיטה העברית בירושלים",
  "אוניברסיטת תל אביב",
  "אוניברסיטת חיפה",
  "אוניברסיטת בן גוריון בנגב",
  "הטכניון - מכון טכנולוגי לישראל",
  "אוניברסיטת בר אילן",
  "האוניברסיטה הפתוחה",
  "אוניברסיטת אריאל",
  "המרכז הבינתחומי הרצליה (רייכמן)",
  "מכללת תל חי",
  "מכללת אורנים",
  "מכללת אוהלו בקצרין",
  "המכללה האקדמית כנרת",
  "המכללה האקדמית תל אביב-יפו",
  "מכללת ספיר",
  "המכללה האקדמית אשקלון",
  "המכללה האקדמית הדסה",
  "מכללת סמי שמעון להנדסה (SCE)",
  "המכון הטכנולוגי חולון (HIT)",
  "בצלאל - אקדמיה לאמנות ועיצוב",
];

const DEFAULT_FIELDS_OF_STUDY = [
  "מדעי המחשב",
  "הנדסת תוכנה",
  "הנדסת חשמל ואלקטרוניקה",
  "הנדסה ביו-רפואית",
  "משפטים",
  "מנהל עסקים",
  "כלכלה",
  "פסיכולוגיה",
  "חינוך",
  "רפואה",
  "סיעוד",
  "עבודה סוציאלית",
  "ביולוגיה",
  "כימיה",
  "פיזיקה",
  "מתמטיקה",
  "חינוך מיוחד",
  "עיצוב",
  "אדריכלות",
  "תקשורת",
  "מדעי המדינה",
];

/**
 * Seeds the default institution/field-of-study dropdown options on first
 * run, so the registry form isn't empty before an admin manages the lists
 * themselves. Only inserts when a category has zero options yet — never
 * overwrites or re-adds anything an admin has since deleted.
 */
async function seedListOptions() {
  const [institutionCount, fieldOfStudyCount] = await Promise.all([
    ListOption.countDocuments({ category: "institution" }),
    ListOption.countDocuments({ category: "fieldOfStudy" }),
  ]);

  if (institutionCount === 0) {
    await ListOption.insertMany(
      DEFAULT_INSTITUTIONS.map((name) => ({ category: "institution", name }))
    );
  }
  if (fieldOfStudyCount === 0) {
    await ListOption.insertMany(
      DEFAULT_FIELDS_OF_STUDY.map((name) => ({ category: "fieldOfStudy", name }))
    );
  }
}

module.exports = seedListOptions;

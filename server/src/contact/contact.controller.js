const mongoose = require("mongoose");
const { z } = require("zod");
const ContactGroup = require("./contactGroup.model");
const ContactPerson = require("./contactPerson.model");

/** An optional free-text field: blank/omitted becomes `null` rather than an empty string. */
const optionalTrimmedString = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const GroupInputSchema = z.object({
  title: z.string().trim().min(1).max(100),
});

// `group` is required on create (which group is this person joining?) but
// deliberately absent on update — editing a person's details never moves
// them to a different group through this form, so PersonUpdateSchema omits
// it entirely rather than requiring the client to resend it.
const PersonInputSchema = z.object({
  group: z
    .string()
    .trim()
    .refine((v) => mongoose.Types.ObjectId.isValid(v), { message: "קבוצה לא תקינה" }),
  name: z.string().trim().min(1).max(200),
  role: z.string().trim().min(1).max(200),
  mobile: optionalTrimmedString(50),
  phone: optionalTrimmedString(50),
  location: optionalTrimmedString(300),
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "אימייל לא תקין",
    }),
});

const PersonUpdateSchema = PersonInputSchema.omit({ group: true });

/**
 * GET /api/contact — public. Every group with its people nested inside
 * (sorted by creation order), so the client renders top-to-bottom with no
 * grouping logic of its own.
 */
async function listContact(req, res) {
  try {
    const [groups, people] = await Promise.all([
      ContactGroup.find().sort({ createdAt: 1 }),
      ContactPerson.find().sort({ createdAt: 1 }),
    ]);

    const result = groups.map((group) => ({
      ...group.toObject(),
      people: people.filter((person) => String(person.group) === String(group._id)),
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/** POST /api/contact/groups — admin-only. Creates a new contact table. */
async function createGroup(req, res) {
  const result = GroupInputSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "שם הקבוצה אינו תקין" });
  }

  try {
    const group = await new ContactGroup(result.data).save();
    res.status(201).json({ success: true, group });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/** PATCH /api/contact/groups/:id — admin-only. Renames a contact table. */
async function updateGroup(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  const result = GroupInputSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "שם הקבוצה אינו תקין" });
  }

  try {
    const group = await ContactGroup.findByIdAndUpdate(id, result.data, {
      new: true,
      runValidators: true,
    });
    if (!group) {
      return res.status(404).json({ success: false, message: "הקבוצה לא נמצאה" });
    }
    res.json({ success: true, group });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * DELETE /api/contact/groups/:id — admin-only. Deletes the group and
 * cascades to delete every ContactPerson in it — there's no DB-level
 * cascade for this, so it's done explicitly here (mirrors deleteEvent's
 * cascade delete of its Registrations in event.controller.js).
 */
async function deleteGroup(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  try {
    const group = await ContactGroup.findByIdAndDelete(id);
    if (!group) {
      return res.status(404).json({ success: false, message: "הקבוצה לא נמצאה" });
    }
    await ContactPerson.deleteMany({ group: group._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/** POST /api/contact/people — admin-only. Adds one person to a group. */
async function createPerson(req, res) {
  const result = PersonInputSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "פרטי איש הקשר אינם תקינים" });
  }

  try {
    const person = await new ContactPerson(result.data).save();
    res.status(201).json({ success: true, person });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/** PATCH /api/contact/people/:id — admin-only. Updates one person's fields. */
async function updatePerson(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  const result = PersonUpdateSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "פרטי איש הקשר אינם תקינים" });
  }

  try {
    const person = await ContactPerson.findByIdAndUpdate(id, result.data, {
      new: true,
      runValidators: true,
    });
    if (!person) {
      return res.status(404).json({ success: false, message: "איש הקשר לא נמצא" });
    }
    res.json({ success: true, person });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/** DELETE /api/contact/people/:id — admin-only. Removes one person. */
async function deletePerson(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  try {
    const person = await ContactPerson.findByIdAndDelete(id);
    if (!person) {
      return res.status(404).json({ success: false, message: "איש הקשר לא נמצא" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

module.exports = {
  listContact,
  createGroup,
  updateGroup,
  deleteGroup,
  createPerson,
  updatePerson,
  deletePerson,
};

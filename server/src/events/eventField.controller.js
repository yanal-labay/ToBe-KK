const mongoose = require("mongoose");
const { z } = require("zod");
const EventField = require("./eventField.model");
const EventFieldOption = require("./eventFieldOption.model");
const Event = require("./event.model");

const FieldNameSchema = z.object({ name: z.string().trim().min(1).max(100) });
const OptionNameSchema = z.object({ name: z.string().trim().min(1).max(100) });

/**
 * GET /api/event-fields — public. Every admin-defined field with its
 * checkbox options nested, oldest first (so "סוג אירוע", seeded first,
 * always leads) — one fetch gives the events page everything it needs to
 * render both the create/edit form's selects and the filter sidebar's
 * checkbox groups.
 */
async function listEventFields(req, res) {
  try {
    const [fields, options] = await Promise.all([
      EventField.find().sort({ createdAt: 1 }),
      EventFieldOption.find().sort({ name: 1 }),
    ]);
    const result = fields.map((field) => ({
      _id: field._id,
      name: field.name,
      options: options.filter((o) => o.field.equals(field._id)),
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/** POST /api/event-fields — admin-only. Creates a new field, e.g. "קהל יעד". */
async function createField(req, res) {
  const result = FieldNameSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "שם שדה לא תקין" });
  }

  try {
    const field = await new EventField(result.data).save();
    res.status(201).json({ success: true, field });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "שדה בשם זה כבר קיים" });
    }
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/** PATCH /api/event-fields/:id — admin-only. Renames a field. */
async function renameField(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  const result = FieldNameSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "שם שדה לא תקין" });
  }

  try {
    const field = await EventField.findByIdAndUpdate(id, result.data, {
      new: true,
      runValidators: true,
    });
    if (!field) {
      return res.status(404).json({ success: false, message: "השדה לא נמצא" });
    }
    res.json({ success: true, field });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "שדה בשם זה כבר קיים" });
    }
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * DELETE /api/event-fields/:id — admin-only. Deletes the field and every
 * one of its options, and pulls those option ids out of every event's
 * `fieldSelections` — unlike the plain-string admin-managed lists
 * elsewhere in this app, `Event.fieldSelections` holds real references, so
 * skipping this step would leave events pointing at deleted documents.
 */
async function deleteField(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  try {
    const field = await EventField.findByIdAndDelete(id);
    if (!field) {
      return res.status(404).json({ success: false, message: "השדה לא נמצא" });
    }
    const options = await EventFieldOption.find({ field: id });
    const optionIds = options.map((o) => o._id);
    await EventFieldOption.deleteMany({ field: id });
    if (optionIds.length > 0) {
      await Event.updateMany(
        { fieldSelections: { $in: optionIds } },
        { $pull: { fieldSelections: { $in: optionIds } } }
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/** POST /api/event-fields/:fieldId/options — admin-only. Adds a checkbox value to a field. */
async function createFieldOption(req, res) {
  const { fieldId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(fieldId)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  const result = OptionNameSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "שם אפשרות לא תקין" });
  }

  try {
    const field = await EventField.findById(fieldId);
    if (!field) {
      return res.status(404).json({ success: false, message: "השדה לא נמצא" });
    }
    const option = await new EventFieldOption({ field: fieldId, ...result.data }).save();
    res.status(201).json({ success: true, option });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "אפשרות זו כבר קיימת ברשימה" });
    }
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * DELETE /api/event-fields/:fieldId/options/:optionId — admin-only. Deletes
 * one checkbox value and pulls it out of every event's `fieldSelections`
 * that had it selected (same cascade reasoning as `deleteField` above).
 */
async function deleteFieldOption(req, res) {
  const { fieldId, optionId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(fieldId) || !mongoose.Types.ObjectId.isValid(optionId)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  try {
    const option = await EventFieldOption.findOneAndDelete({ _id: optionId, field: fieldId });
    if (!option) {
      return res.status(404).json({ success: false, message: "האפשרות לא נמצאה" });
    }
    await Event.updateMany({ fieldSelections: optionId }, { $pull: { fieldSelections: optionId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

module.exports = {
  listEventFields,
  createField,
  renameField,
  deleteField,
  createFieldOption,
  deleteFieldOption,
};

const mongoose = require("mongoose");
const { z } = require("zod");
const JobField = require("./jobField.model");
const JobFieldOption = require("./jobFieldOption.model");
const Job = require("./job.model");

const FieldNameSchema = z.object({ name: z.string().trim().min(1).max(100) });
const OptionNameSchema = z.object({ name: z.string().trim().min(1).max(100) });

/**
 * GET /api/job-fields — public. Every admin-defined field with its
 * checkbox options nested, oldest first (so "סוג משרה", seeded first,
 * always leads) — one fetch gives the jobs page everything it needs to
 * render both the create/edit form's selects and the filter sidebar's
 * checkbox groups.
 */
async function listJobFields(req, res) {
  try {
    const [fields, options] = await Promise.all([
      JobField.find().sort({ createdAt: 1 }),
      JobFieldOption.find().sort({ name: 1 }),
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

/** POST /api/job-fields — admin-only. Creates a new field, e.g. "רמת ניסיון". */
async function createField(req, res) {
  const result = FieldNameSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "שם שדה לא תקין" });
  }

  try {
    const field = await new JobField(result.data).save();
    res.status(201).json({ success: true, field });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "שדה בשם זה כבר קיים" });
    }
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/** PATCH /api/job-fields/:id — admin-only. Renames a field. */
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
    const field = await JobField.findByIdAndUpdate(id, result.data, {
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
 * DELETE /api/job-fields/:id — admin-only. Deletes the field and every
 * one of its options, and pulls those option ids out of every job's
 * `fieldSelections` — unlike the plain-string admin-managed lists
 * elsewhere in this app, `Job.fieldSelections` holds real references, so
 * skipping this step would leave jobs pointing at deleted documents.
 */
async function deleteField(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  try {
    const field = await JobField.findByIdAndDelete(id);
    if (!field) {
      return res.status(404).json({ success: false, message: "השדה לא נמצא" });
    }
    const options = await JobFieldOption.find({ field: id });
    const optionIds = options.map((o) => o._id);
    await JobFieldOption.deleteMany({ field: id });
    if (optionIds.length > 0) {
      await Job.updateMany(
        { fieldSelections: { $in: optionIds } },
        { $pull: { fieldSelections: { $in: optionIds } } }
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/** POST /api/job-fields/:fieldId/options — admin-only. Adds a checkbox value to a field. */
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
    const field = await JobField.findById(fieldId);
    if (!field) {
      return res.status(404).json({ success: false, message: "השדה לא נמצא" });
    }
    const option = await new JobFieldOption({ field: fieldId, ...result.data }).save();
    res.status(201).json({ success: true, option });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "אפשרות זו כבר קיימת ברשימה" });
    }
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * DELETE /api/job-fields/:fieldId/options/:optionId — admin-only. Deletes
 * one checkbox value and pulls it out of every job's `fieldSelections`
 * that had it selected (same cascade reasoning as `deleteField` above).
 */
async function deleteFieldOption(req, res) {
  const { fieldId, optionId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(fieldId) || !mongoose.Types.ObjectId.isValid(optionId)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  try {
    const option = await JobFieldOption.findOneAndDelete({ _id: optionId, field: fieldId });
    if (!option) {
      return res.status(404).json({ success: false, message: "האפשרות לא נמצאה" });
    }
    await Job.updateMany({ fieldSelections: optionId }, { $pull: { fieldSelections: optionId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

module.exports = {
  listJobFields,
  createField,
  renameField,
  deleteField,
  createFieldOption,
  deleteFieldOption,
};

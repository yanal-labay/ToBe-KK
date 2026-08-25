const mongoose = require("mongoose");
const { z } = require("zod");
const ScholarshipField = require("./scholarshipField.model");
const ScholarshipFieldOption = require("./scholarshipFieldOption.model");
const Scholarship = require("./scholarship.model");

const FieldNameSchema = z.object({ name: z.string().trim().min(1).max(100) });
const OptionNameSchema = z.object({ name: z.string().trim().min(1).max(100) });

/**
 * GET /api/scholarship-fields — public. Every admin-defined field with its
 * checkbox options nested, oldest first — one fetch gives the scholarships
 * page everything it needs to render both the create/edit form's checkbox
 * groups and the filter sidebar's checkbox groups.
 */
async function listScholarshipFields(req, res) {
  try {
    const [fields, options] = await Promise.all([
      ScholarshipField.find().sort({ createdAt: 1 }),
      ScholarshipFieldOption.find().sort({ name: 1 }),
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

/** POST /api/scholarship-fields — admin-only. Creates a new field. */
async function createField(req, res) {
  const result = FieldNameSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "שם שדה לא תקין" });
  }

  try {
    const field = await new ScholarshipField(result.data).save();
    res.status(201).json({ success: true, field });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "שדה בשם זה כבר קיים" });
    }
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/** PATCH /api/scholarship-fields/:id — admin-only. Renames a field. */
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
    const field = await ScholarshipField.findByIdAndUpdate(id, result.data, {
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
 * DELETE /api/scholarship-fields/:id — admin-only. Deletes the field and
 * every one of its options, and pulls those option ids out of every
 * scholarship's `fieldSelections` — since `Scholarship.fieldSelections`
 * holds real references, skipping this step would leave scholarships
 * pointing at deleted documents.
 */
async function deleteField(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  try {
    const field = await ScholarshipField.findByIdAndDelete(id);
    if (!field) {
      return res.status(404).json({ success: false, message: "השדה לא נמצא" });
    }
    const options = await ScholarshipFieldOption.find({ field: id });
    const optionIds = options.map((o) => o._id);
    await ScholarshipFieldOption.deleteMany({ field: id });
    if (optionIds.length > 0) {
      await Scholarship.updateMany(
        { fieldSelections: { $in: optionIds } },
        { $pull: { fieldSelections: { $in: optionIds } } }
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/** POST /api/scholarship-fields/:fieldId/options — admin-only. Adds a checkbox value to a field. */
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
    const field = await ScholarshipField.findById(fieldId);
    if (!field) {
      return res.status(404).json({ success: false, message: "השדה לא נמצא" });
    }
    const option = await new ScholarshipFieldOption({ field: fieldId, ...result.data }).save();
    res.status(201).json({ success: true, option });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "אפשרות זו כבר קיימת ברשימה" });
    }
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * DELETE /api/scholarship-fields/:fieldId/options/:optionId — admin-only.
 * Deletes one checkbox value and pulls it out of every scholarship's
 * `fieldSelections` that had it selected (same cascade reasoning as
 * `deleteField` above).
 */
async function deleteFieldOption(req, res) {
  const { fieldId, optionId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(fieldId) || !mongoose.Types.ObjectId.isValid(optionId)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  try {
    const option = await ScholarshipFieldOption.findOneAndDelete({ _id: optionId, field: fieldId });
    if (!option) {
      return res.status(404).json({ success: false, message: "האפשרות לא נמצאה" });
    }
    await Scholarship.updateMany(
      { fieldSelections: optionId },
      { $pull: { fieldSelections: optionId } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

module.exports = {
  listScholarshipFields,
  createField,
  renameField,
  deleteField,
  createFieldOption,
  deleteFieldOption,
};

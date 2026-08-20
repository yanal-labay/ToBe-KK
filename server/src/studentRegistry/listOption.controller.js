const mongoose = require("mongoose");
const { z } = require("zod");
const ListOption = require("./listOption.model");

const ListOptionInputSchema = z.object({
  category: z.enum(["institution", "fieldOfStudy"]),
  name: z.string().trim().min(1).max(200),
});

/**
 * GET /api/student-registry-options — public. Returns both lists at once
 * (grouped by category) so the registry form only needs one fetch.
 */
async function listOptions(req, res) {
  try {
    const options = await ListOption.find().sort({ name: 1 });
    res.json({
      institutions: options.filter((o) => o.category === "institution"),
      fieldsOfStudy: options.filter((o) => o.category === "fieldOfStudy"),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * POST /api/student-registry-options — admin-only. Adds one option to
 * either list, separate from submitting any registrant — the registry
 * form only ever *picks* from this list (or falls back to free text via
 * "אחר").
 */
async function createOption(req, res) {
  const result = ListOptionInputSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "פרטי הרשומה אינם תקינים" });
  }

  try {
    const option = await new ListOption(result.data).save();
    res.status(201).json({ success: true, option });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "אפשרות זו כבר קיימת ברשימה" });
    }
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/** DELETE /api/student-registry-options/:id — admin-only. */
async function deleteOption(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  try {
    const option = await ListOption.findByIdAndDelete(id);
    if (!option) {
      return res.status(404).json({ success: false, message: "האפשרות לא נמצאה" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

module.exports = { listOptions, createOption, deleteOption };

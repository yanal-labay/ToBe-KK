const mongoose = require("mongoose");
const { z } = require("zod");
const Tag = require("./tag.model");
const Scholarship = require("./scholarship.model");

const TagInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

/** GET /api/tags — public list of every tag, alphabetical. */
async function listTags(req, res) {
  try {
    const tags = await Tag.find().sort({ name: 1 });
    res.json(tags);
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * POST /api/tags — admin-only. Creates a new tag, separate from creating
 * any scholarship post — a post only ever picks from this existing list.
 */
async function createTag(req, res) {
  const result = TagInputSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "שם תגית לא תקין" });
  }

  try {
    const tag = await new Tag(result.data).save();
    res.status(201).json({ success: true, tag });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "תגית זו כבר קיימת" });
    }
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * DELETE /api/tags/:id — admin-only. Deletes the tag and pulls it out of
 * every scholarship's `tags` array, so nothing keeps a dangling reference.
 */
async function deleteTag(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה תגית לא תקין" });
  }

  try {
    const tag = await Tag.findByIdAndDelete(id);
    if (!tag) {
      return res.status(404).json({ success: false, message: "התגית לא נמצאה" });
    }
    await Scholarship.updateMany({ tags: id }, { $pull: { tags: id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

module.exports = { listTags, createTag, deleteTag };

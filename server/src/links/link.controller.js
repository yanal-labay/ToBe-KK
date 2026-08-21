const mongoose = require("mongoose");
const { z } = require("zod");
const LinkGroup = require("./linkGroup.model");
const LinkItem = require("./linkItem.model");

const GroupInputSchema = z.object({
  title: z.string().trim().min(1).max(100),
});

// `group` is required on create (which card is this item joining?) but
// deliberately absent on update — editing an item's details never moves it
// to a different card through this form, so LinkItemUpdateSchema omits it
// entirely rather than requiring the client to resend it (this exact gap
// was a real bug in the contact feature's first version).
const LinkItemInputSchema = z.object({
  group: z
    .string()
    .trim()
    .refine((v) => mongoose.Types.ObjectId.isValid(v), { message: "כרטיס לא תקין" }),
  headline: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000),
  url: z.string().trim().url("קישור לא תקין"),
});

const LinkItemUpdateSchema = LinkItemInputSchema.omit({ group: true });

const ReorderSchema = z.object({
  orderedIds: z.array(z.string().refine((v) => mongoose.Types.ObjectId.isValid(v))).min(1),
});

/**
 * GET /api/links — public. Every group with its items nested inside
 * (sorted by `order` first, then creation order as a tiebreaker for
 * anything that predates the reorder feature), so the client renders
 * top-to-bottom with no grouping logic of its own.
 */
async function listLinks(req, res) {
  try {
    const [groups, items] = await Promise.all([
      LinkGroup.find().sort({ order: 1, createdAt: 1 }),
      LinkItem.find().sort({ order: 1, createdAt: 1 }),
    ]);

    const result = groups.map((group) => ({
      ...group.toObject(),
      items: items.filter((item) => String(item.group) === String(group._id)),
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * POST /api/links/groups — admin-only. Creates a new links card, appended
 * after every existing one. Uses (max existing order) + 1 rather than a
 * document count — a plain count breaks once deletions leave gaps in the
 * order sequence (e.g. deleting the 2nd of 4 groups leaves orders 0,2,3),
 * which would make a new group collide with or sort before an existing one.
 */
async function createGroup(req, res) {
  const result = GroupInputSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "שם הכרטיס אינו תקין" });
  }

  try {
    const highest = await LinkGroup.findOne().sort({ order: -1 });
    const order = highest ? highest.order + 1 : 0;
    const group = await new LinkGroup({ ...result.data, order }).save();
    res.status(201).json({ success: true, group });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * PATCH /api/links/groups/reorder — admin-only. Sets every listed group's
 * `order` to its index in `orderedIds` (the admin's drag-to-reorder UI
 * sends the full new order every time, so this fully replaces it rather
 * than shifting individual positions).
 */
async function reorderGroups(req, res) {
  const result = ReorderSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "סדר לא תקין" });
  }

  try {
    await Promise.all(
      result.data.orderedIds.map((id, index) => LinkGroup.updateOne({ _id: id }, { order: index }))
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/** PATCH /api/links/groups/:id — admin-only. Renames a links card. */
async function updateGroup(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  const result = GroupInputSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "שם הכרטיס אינו תקין" });
  }

  try {
    const group = await LinkGroup.findByIdAndUpdate(id, result.data, {
      new: true,
      runValidators: true,
    });
    if (!group) {
      return res.status(404).json({ success: false, message: "הכרטיס לא נמצא" });
    }
    res.json({ success: true, group });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * DELETE /api/links/groups/:id — admin-only. Deletes the card and
 * cascades to delete every LinkItem in it.
 */
async function deleteGroup(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  try {
    const group = await LinkGroup.findByIdAndDelete(id);
    if (!group) {
      return res.status(404).json({ success: false, message: "הכרטיס לא נמצא" });
    }
    await LinkItem.deleteMany({ group: group._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * POST /api/links/items — admin-only. Adds one link item, appended after
 * every existing item in that card. Uses (max existing order) + 1 for the
 * same reason as createGroup — a plain count breaks once deletions leave
 * gaps in the order sequence.
 */
async function createItem(req, res) {
  const result = LinkItemInputSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "פרטי הקישור אינם תקינים" });
  }

  try {
    const highest = await LinkItem.findOne({ group: result.data.group }).sort({ order: -1 });
    const order = highest ? highest.order + 1 : 0;
    const item = await new LinkItem({ ...result.data, order }).save();
    res.status(201).json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * PATCH /api/links/items/reorder — admin-only. Sets every listed item's
 * `order` to its index in `orderedIds` — same full-replace semantics as
 * reorderGroups. The admin's drag UI only ever reorders items within one
 * card at a time, so `orderedIds` is that one card's item ids.
 */
async function reorderItems(req, res) {
  const result = ReorderSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "סדר לא תקין" });
  }

  try {
    await Promise.all(
      result.data.orderedIds.map((id, index) => LinkItem.updateOne({ _id: id }, { order: index }))
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/** PATCH /api/links/items/:id — admin-only. Updates one link item's fields. */
async function updateItem(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  const result = LinkItemUpdateSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "פרטי הקישור אינם תקינים" });
  }

  try {
    const item = await LinkItem.findByIdAndUpdate(id, result.data, {
      new: true,
      runValidators: true,
    });
    if (!item) {
      return res.status(404).json({ success: false, message: "הקישור לא נמצא" });
    }
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/** DELETE /api/links/items/:id — admin-only. Removes one link item. */
async function deleteItem(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  try {
    const item = await LinkItem.findByIdAndDelete(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "הקישור לא נמצא" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

module.exports = {
  listLinks,
  createGroup,
  updateGroup,
  deleteGroup,
  reorderGroups,
  createItem,
  updateItem,
  deleteItem,
  reorderItems,
};

const express = require("express");
const { requireAuth } = require("../userManagement/auth.middleware");
const {
  listLinks,
  createGroup,
  updateGroup,
  deleteGroup,
  reorderGroups,
  createItem,
  updateItem,
  deleteItem,
  reorderItems,
} = require("./link.controller");

const router = express.Router();

router.get("/", listLinks);

// The /reorder routes must be registered before their /:id sibling —
// Express matches routes in registration order, so ":id" would otherwise
// swallow the literal path "reorder" as an id.
router.post("/groups", requireAuth, createGroup);
router.patch("/groups/reorder", requireAuth, reorderGroups);
router.patch("/groups/:id", requireAuth, updateGroup);
router.delete("/groups/:id", requireAuth, deleteGroup);

router.post("/items", requireAuth, createItem);
router.patch("/items/reorder", requireAuth, reorderItems);
router.patch("/items/:id", requireAuth, updateItem);
router.delete("/items/:id", requireAuth, deleteItem);

module.exports = router;

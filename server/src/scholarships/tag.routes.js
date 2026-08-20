const express = require("express");
const { requireAuth } = require("../userManagement/auth.middleware");
const { listTags, createTag, deleteTag } = require("./tag.controller");

const router = express.Router();

router.get("/", listTags);
router.post("/", requireAuth, createTag);
router.delete("/:id", requireAuth, deleteTag);

module.exports = router;

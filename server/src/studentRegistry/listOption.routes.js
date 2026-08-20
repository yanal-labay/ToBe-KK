const express = require("express");
const { requireAuth } = require("../userManagement/auth.middleware");
const { listOptions, createOption, deleteOption } = require("./listOption.controller");

const router = express.Router();

router.get("/", listOptions);
router.post("/", requireAuth, createOption);
router.delete("/:id", requireAuth, deleteOption);

module.exports = router;

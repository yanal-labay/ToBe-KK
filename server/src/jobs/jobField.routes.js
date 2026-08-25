const express = require("express");
const { requireAuth } = require("../userManagement/auth.middleware");
const {
  listJobFields,
  createField,
  renameField,
  deleteField,
  createFieldOption,
  deleteFieldOption,
} = require("./jobField.controller");

const router = express.Router();

router.get("/", listJobFields);
router.post("/", requireAuth, createField);
router.patch("/:id", requireAuth, renameField);
router.delete("/:id", requireAuth, deleteField);
router.post("/:fieldId/options", requireAuth, createFieldOption);
router.delete("/:fieldId/options/:optionId", requireAuth, deleteFieldOption);

module.exports = router;

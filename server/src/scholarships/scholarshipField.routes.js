const express = require("express");
const { requireAuth } = require("../userManagement/auth.middleware");
const {
  listScholarshipFields,
  createField,
  renameField,
  deleteField,
  createFieldOption,
  deleteFieldOption,
} = require("./scholarshipField.controller");

const router = express.Router();

router.get("/", listScholarshipFields);
router.post("/", requireAuth, createField);
router.patch("/:id", requireAuth, renameField);
router.delete("/:id", requireAuth, deleteField);
router.post("/:fieldId/options", requireAuth, createFieldOption);
router.delete("/:fieldId/options/:optionId", requireAuth, deleteFieldOption);

module.exports = router;

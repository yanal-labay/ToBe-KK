const express = require("express");
const { requireAuth } = require("../userManagement/auth.middleware");
const {
  listContact,
  createGroup,
  updateGroup,
  deleteGroup,
  createPerson,
  updatePerson,
  deletePerson,
} = require("./contact.controller");

const router = express.Router();

router.get("/", listContact);

router.post("/groups", requireAuth, createGroup);
router.patch("/groups/:id", requireAuth, updateGroup);
router.delete("/groups/:id", requireAuth, deleteGroup);

router.post("/people", requireAuth, createPerson);
router.patch("/people/:id", requireAuth, updatePerson);
router.delete("/people/:id", requireAuth, deletePerson);

module.exports = router;

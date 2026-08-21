const express = require("express");
const { requireAuth } = require("../userManagement/auth.middleware");
const {
  listSchedule,
  createScheduleEntry,
  updateScheduleEntry,
  deleteScheduleEntry,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("./schedule.controller");

const router = express.Router();

router.get("/categories", listCategories);
router.post("/categories", requireAuth, createCategory);
router.patch("/categories/:id", requireAuth, updateCategory);
router.delete("/categories/:id", requireAuth, deleteCategory);

router.get("/", listSchedule);
router.post("/", requireAuth, createScheduleEntry);
router.patch("/:id", requireAuth, updateScheduleEntry);
router.delete("/:id", requireAuth, deleteScheduleEntry);

module.exports = router;

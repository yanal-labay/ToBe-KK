const express = require("express");
const { requireAuth } = require("../userManagement/auth.middleware");
const { upload } = require("./upload");
const {
  listScholarships,
  createScholarship,
  updateScholarship,
  deleteScholarship,
} = require("./scholarship.controller");

const router = express.Router();

router.get("/", listScholarships);
router.post("/", requireAuth, upload.single("photo"), createScholarship);
router.patch("/:id", requireAuth, upload.single("photo"), updateScholarship);
router.delete("/:id", requireAuth, deleteScholarship);

// Turn photo upload failures (bad file type, too large) into clean JSON responses
// instead of Express's default HTML error page.
router.use((err, req, res, next) => {
  if (!err) return next();
  res.status(400).json({ success: false, message: err.message || "העלאת התמונה נכשלה" });
});

module.exports = router;

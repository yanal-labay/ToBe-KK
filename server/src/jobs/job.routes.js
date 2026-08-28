const express = require("express");
const { requireAuth } = require("../userManagement/auth.middleware");
const { upload, toCloudinary } = require("./upload");
const {
  listJobs,
  listJobsAdmin,
  createJob,
  updateJob,
  deleteJob,
} = require("./job.controller");

const router = express.Router();

router.get("/", listJobs);
router.get("/admin", requireAuth, listJobsAdmin);
router.post("/", requireAuth, upload.single("photo"), toCloudinary, createJob);
router.patch("/:id", requireAuth, upload.single("photo"), toCloudinary, updateJob);
router.delete("/:id", requireAuth, deleteJob);

// Turn photo upload failures (bad file type, too large) into clean JSON responses
// instead of Express's default HTML error page.
router.use((err, req, res, next) => {
  if (!err) return next();
  res.status(400).json({ success: false, message: err.message || "העלאת התמונה נכשלה" });
});

module.exports = router;

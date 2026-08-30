const express = require("express");
const rateLimit = require("express-rate-limit");
const { requireAuth } = require("../userManagement/auth.middleware");
const { upload, toCloudinary } = require("./upload");
const {
  listJobs,
  listJobsAdmin,
  createJob,
  updateJob,
  deleteJob,
  applyToJob,
  listApplications,
  updateApplicationStatus,
  deleteApplication,
} = require("./job.controller");

const router = express.Router();

// Guards the public application endpoint against being used to spam the
// database or brute-force-probe job IDs; not applied to admin-only routes
// since those already require an authenticated session. Mirrors
// event.routes.js's registerLimiter.
const applyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many attempts. Please wait 1 minute.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/", listJobs);
router.get("/admin", requireAuth, listJobsAdmin);
router.post("/", requireAuth, upload.single("photo"), toCloudinary, createJob);
router.patch("/:id", requireAuth, upload.single("photo"), toCloudinary, updateJob);
router.delete("/:id", requireAuth, deleteJob);
router.post("/:id/apply", applyLimiter, applyToJob);
router.get("/:id/applications", requireAuth, listApplications);
router.patch("/:id/applications/:applicationId", requireAuth, updateApplicationStatus);
router.delete("/:id/applications/:applicationId", requireAuth, deleteApplication);

// Turn photo upload failures (bad file type, too large) into clean JSON responses
// instead of Express's default HTML error page.
router.use((err, req, res, next) => {
  if (!err) return next();
  res.status(400).json({ success: false, message: err.message || "העלאת התמונה נכשלה" });
});

module.exports = router;

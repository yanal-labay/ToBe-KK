const express = require("express");
const { requireAuth } = require("../userManagement/auth.middleware");
const { upload, toCloudinary } = require("./upload");
const { getHome, updateHomeContent, addHomePhoto, deleteHomePhoto } = require("./home.controller");

const router = express.Router();

router.get("/", getHome);
router.patch("/content", requireAuth, updateHomeContent);
router.post("/photos", requireAuth, upload.single("photo"), toCloudinary, addHomePhoto);
router.delete("/photos/:id", requireAuth, deleteHomePhoto);

// Turn photo upload failures (bad file type, too large) into clean JSON responses
// instead of Express's default HTML error page.
router.use((err, req, res, next) => {
  if (!err) return next();
  res.status(400).json({ success: false, message: err.message || "העלאת התמונה נכשלה" });
});

module.exports = router;

const express = require("express");
const rateLimit = require("express-rate-limit");
const { requireAuth } = require("../userManagement/auth.middleware");
const { upload } = require("./upload");
const {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  listRegistrations,
  updateRegistrationStatus,
  deleteRegistration,
} = require("./event.controller");

const router = express.Router();

// Guards the public registration endpoint against being used to spam the
// database or brute-force-probe event IDs; not applied to admin-only routes
// since those already require an authenticated session.
const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many attempts. Please wait 1 minute.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/", listEvents);
router.post("/", requireAuth, upload.single("photo"), createEvent);
router.patch("/:id", requireAuth, upload.single("photo"), updateEvent);
router.delete("/:id", requireAuth, deleteEvent);
router.post("/:id/register", registerLimiter, registerForEvent);
router.get("/:id/registrations", requireAuth, listRegistrations);
router.patch("/:id/registrations/:registrationId", requireAuth, updateRegistrationStatus);
router.delete("/:id/registrations/:registrationId", requireAuth, deleteRegistration);

// Turn photo upload failures (bad file type, too large) into clean JSON responses
// instead of Express's default HTML error page.
router.use((err, req, res, next) => {
  if (!err) return next();
  res.status(400).json({ success: false, message: err.message || "העלאת התמונה נכשלה" });
});

module.exports = router;

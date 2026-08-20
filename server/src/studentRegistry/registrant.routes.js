const express = require("express");
const rateLimit = require("express-rate-limit");
const { requireAuth } = require("../userManagement/auth.middleware");
const {
  createRegistrant,
  listRegistrants,
  updateRegistrant,
  deleteRegistrant,
} = require("./registrant.controller");

const router = express.Router();

// Guards the public sign-up endpoint against spam/abuse, same pattern as
// event registration's registerLimiter.
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

router.post("/", registerLimiter, createRegistrant);
router.get("/", requireAuth, listRegistrants);
router.patch("/:id", requireAuth, updateRegistrant);
router.delete("/:id", requireAuth, deleteRegistrant);

module.exports = router;

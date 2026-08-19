const express = require("express");
const rateLimit = require("express-rate-limit");
const { login, logout, me } = require("./auth.controller");
const { requireAuth } = require("./auth.middleware");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many login attempts. Please wait 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

module.exports = router;

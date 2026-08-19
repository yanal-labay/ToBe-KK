const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const User = require("./user.model");

const LoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const COOKIE_NAME = "token";
const TOKEN_TTL = "8h";

function signToken(user) {
  return jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1000,
  });
}

async function login(req, res) {
  const result = LoginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "Invalid email or password format" });
  }

  const { email, password } = result.data;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  const token = signToken(user);
  setAuthCookie(res, token);
  res.json({ success: true, admin: { email: user.email } });
}

function logout(req, res) {
  res.clearCookie(COOKIE_NAME);
  res.json({ success: true });
}

function me(req, res) {
  res.json({ admin: { email: req.admin.email } });
}

module.exports = { login, logout, me, COOKIE_NAME };

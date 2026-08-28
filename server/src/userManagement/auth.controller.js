const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const User = require("./user.model");

const LoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

// Name of the httpOnly cookie that carries the signed JWT session. Shared
// with auth.middleware.js so `requireAuth` reads the same cookie `login`
// sets.
const COOKIE_NAME = "token";

// How long a session lasts. Read by both the JWT's expiry and the cookie's
// max-age below, so the two can't drift apart — a cookie outliving its token
// would leave an admin looking logged in while every request 401s.
//
// There is deliberately no longer-lived "remember me" variant: a multi-week
// session is a bearer credential sitting in the browser, and it survives both
// logout elsewhere and account deletion (requireAuth checks the signature,
// never the database). Convenience comes from the browser's own password
// manager instead — see the autofill attributes on AdminLogin.jsx's inputs.
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours

/** Signs a session JWT for an authenticated admin user, expiring with its cookie. */
function signToken(user) {
  return jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: Math.floor(SESSION_MAX_AGE_MS / 1000), // a bare number is read as seconds
  });
}

/**
 * Sets the session cookie. `httpOnly` keeps it inaccessible to client-side
 * JS (XSS mitigation); `secure` is only enforced in production, so local dev
 * over plain http still works — which also means NODE_ENV must actually be
 * set to "production" on the host, or the session ships without it.
 *
 * `sameSite: "lax"` also blocks cross-site POST/PATCH/DELETE from carrying
 * this cookie, which is the app's only CSRF protection (there are no CSRF
 * tokens). It *requires* the client and API to be same-site: served from
 * different registrable domains, the browser won't send this cookie at all
 * and admin login silently stops working while public pages look fine.
 */
function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_MS,
  });
}

/** POST /api/auth/login — rate-limited (see loginLimiter in auth.routes.js). */
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

/** POST /api/auth/logout — clears the session cookie. No auth required. */
function logout(req, res) {
  res.clearCookie(COOKIE_NAME);
  res.json({ success: true });
}

/**
 * GET /api/auth/me — behind `requireAuth`, so `req.admin` is the decoded JWT
 * payload set by the middleware. Used by the client's session context to
 * check "am I still logged in" on load and to fetch the display email.
 */
function me(req, res) {
  res.json({ admin: { email: req.admin.email } });
}

module.exports = { login, logout, me, COOKIE_NAME };

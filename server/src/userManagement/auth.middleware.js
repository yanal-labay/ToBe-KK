const jwt = require("jsonwebtoken");
const { COOKIE_NAME } = require("./auth.controller");

/**
 * Express middleware guarding admin-only routes. Reads the session JWT from
 * the httpOnly cookie, verifies its signature/expiry, and — on success —
 * attaches the decoded payload as `req.admin` for downstream handlers.
 * Responds 401 (not just calling `next(err)`) so every protected route gets
 * a consistent JSON shape without needing its own auth-failure handling.
 */
function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired session" });
  }
}

module.exports = { requireAuth };

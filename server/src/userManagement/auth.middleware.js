const jwt = require("jsonwebtoken");
const { COOKIE_NAME } = require("./auth.controller");

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

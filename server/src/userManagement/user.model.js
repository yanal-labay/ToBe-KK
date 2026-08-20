const mongoose = require("mongoose");

/**
 * An admin account. There is only one role today ("admin") — this app has
 * no other authenticated user type; everyone else is an anonymous guest.
 * Created via `npm run seed:admin` (seedAdmin.js), not through any signup
 * flow — there is no public registration endpoint for admin accounts.
 */
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["admin"], default: "admin" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", UserSchema);

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
  // When this admin last opened the activity dropdown. Everything created
  // after it counts as "new" (see activity.controller.js). `null` means
  // never opened, so a fresh admin sees the full backlog as new — which is
  // correct, and avoids needing a backfill for accounts that predate this.
  lastSeenActivityAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", UserSchema);

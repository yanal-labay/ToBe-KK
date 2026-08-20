const mongoose = require("mongoose");

/**
 * A guest's sign-up for one Event. Guests register anonymously (no user
 * account) via the public "/register" endpoint; only admins can read the
 * list or change `status` (see event.routes.js).
 *
 * `status` tracks attendance and is set by an admin after the fact:
 * - "signed_up": the default, set at registration time.
 * - "arrived" / "did_not_arrive": set manually from the admin registrations
 *   panel, e.g. after checking people in at the door.
 *
 * Deleting the parent Event cascades to delete all of its registrations
 * (see deleteEvent in event.controller.js) — there is no foreign-key
 * constraint enforcing this at the database level, so that cleanup must
 * happen in application code.
 */
const RegistrationSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ["signed_up", "arrived", "did_not_arrive"],
    default: "signed_up",
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Registration", RegistrationSchema);

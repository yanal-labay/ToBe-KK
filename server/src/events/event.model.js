const mongoose = require("mongoose");

/**
 * An event published on the public "אירועים" page.
 *
 * - `date` and `time` are stored separately: `date` is a day-only Date, and
 *   `time` is a free "HH:mm" string (validated by the zod schema in
 *   event.controller.js, not by Mongoose) so the two can use plain
 *   `<input type="date">` / `<input type="time">` fields on the client
 *   without timezone conversion headaches.
 * - `price` is nullable: `null` means "free / no cost shown", any other
 *   number is rendered as "₪<price>" on the event card.
 * - `registrationDeadline` is required — every event must state a cutoff
 *   date for registration. It's a day-only cutoff *before* (or on) the
 *   event: registration closes once that day has fully passed, even
 *   though the event hasn't happened yet (see `isRegistrationClosed` in
 *   event.controller.js and EventCard.jsx, which share this same
 *   day-only comparison).
 * - `photoUrl` is a relative path under `/uploads/events/...` (see
 *   upload.js), or `null` if no photo was attached. It is served statically
 *   by the Express app, not stored as binary data in MongoDB.
 */
const EventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  time: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  price: { type: Number, default: null },
  registrationDeadline: { type: Date, required: true },
  photoUrl: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Event", EventSchema);

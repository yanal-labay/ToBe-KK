const mongoose = require("mongoose");

/**
 * The admin-editable text shown on the home page: a hero title+body above
 * the photo carousel, and a second, independent caption title+text below
 * it. Only one document is ever meant to exist — `home.controller.js`
 * upserts against an empty filter (`{}`) rather than tracking an id, so
 * there's exactly one "current" home text at a time. Each pair is
 * nullable and saved independently via `$set` (see updateHomeContent), so
 * editing one pair never touches the other; `home.controller.js` falls
 * back to default text for whichever pair hasn't been set yet.
 */
const HomeContentSchema = new mongoose.Schema({
  title: { type: String, default: null, trim: true },
  body: { type: String, default: null, trim: true },
  captionTitle: { type: String, default: null, trim: true },
  captionText: { type: String, default: null, trim: true },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("HomeContent", HomeContentSchema);

const mongoose = require("mongoose");

/**
 * The admin-editable title+body text shown on the home page. Only one
 * document is ever meant to exist — `home.controller.js` upserts against
 * an empty filter (`{}`) rather than tracking an id, so there's exactly
 * one "current" home text at a time.
 */
const HomeContentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  body: { type: String, required: true, trim: true },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("HomeContent", HomeContentSchema);

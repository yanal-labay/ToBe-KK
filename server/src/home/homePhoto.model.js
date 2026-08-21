const mongoose = require("mongoose");

/**
 * One admin-uploaded photo for the home page's rotating photo box. The two
 * seed images (tobe1.jpg/tobe2.jpg) are static files under client/ToBe/public
 * and are referenced directly by the client — they are never stored here,
 * so they can never be deleted through this collection.
 */
const HomePhotoSchema = new mongoose.Schema({
  photoUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("HomePhoto", HomePhotoSchema);

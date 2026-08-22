const mongoose = require("mongoose");

/**
 * One photo for the home page's rotating photo box. Includes the two
 * original launch photos (migrated here from client/ToBe/public/tobe1.jpg
 * and tobe2.jpg) as well as every admin-uploaded photo since.
 */
const HomePhotoSchema = new mongoose.Schema({
  photoUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("HomePhoto", HomePhotoSchema);

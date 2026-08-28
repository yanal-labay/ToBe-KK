const { createUploader } = require("../shared/cloudinaryUpload");

/**
 * Photo upload for the home-page carousel. Used on the add-photo route as
 * `upload.single("photo")` followed by `toCloudinary` — see home.routes.js.
 *
 * See shared/cloudinaryUpload.js for why these no longer touch local disk.
 */
module.exports = createUploader("home");

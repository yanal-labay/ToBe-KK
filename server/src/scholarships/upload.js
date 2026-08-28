const { createUploader } = require("../shared/cloudinaryUpload");

/**
 * Photo upload for scholarships. Used on the create/update routes as
 * `upload.single("photo")` followed by `toCloudinary` — see
 * scholarship.routes.js.
 *
 * See shared/cloudinaryUpload.js for why these no longer touch local disk.
 */
module.exports = createUploader("scholarships");

const { createUploader } = require("../shared/cloudinaryUpload");

/**
 * Photo upload for events. Used on the create/update routes as
 * `upload.single("photo")` followed by `toCloudinary` — see event.routes.js.
 *
 * Previously this module wrote to server/uploads/events/ on local disk. That
 * cannot work once deployed: Render clears the filesystem on every deploy and
 * restart, so every event photo would vanish. Uploads now go to Cloudinary and
 * `photoUrl` holds a full https:// URL instead of a "/uploads/…" path.
 */
module.exports = createUploader("events");

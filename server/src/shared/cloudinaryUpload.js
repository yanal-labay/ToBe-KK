const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");

// Reads CLOUDINARY_URL-style credentials from the individual env vars. Called
// once at require time; the SDK holds the config globally.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // always hand back https:// URLs, never protocol-relative
});

/** Root folder inside the Cloudinary media library, so this app's uploads stay grouped. */
const ROOT_FOLDER = "tobe-kk";

/**
 * Images are buffered in memory rather than written to disk, then streamed
 * straight to Cloudinary. Nothing ever touches the server's filesystem —
 * which is the point: Render wipes local storage on every deploy and
 * restart, so anything saved to server/uploads/ would disappear.
 *
 * The 5MB cap matches what the disk-based uploader enforced before.
 */
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    // A whitelist of concrete types, not `startsWith("image/")`. The old
    // check trusted the client-declared Content-Type and took the stored
    // extension from the user's filename, which let a .html or .js file
    // through as long as it *claimed* to be an image — and it was then
    // served from our own origin with an executable content type.
    //
    // Cloudinary independently verifies that the bytes really are an image
    // and rejects them otherwise, so this is now belt-and-braces. SVG is
    // excluded deliberately: it is a script-bearing format, not a picture.
    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED.includes(file.mimetype)) {
      return cb(new Error("הקובץ שהועלה חייב להיות תמונה (JPG, PNG, WEBP או GIF)"));
    }
    cb(null, true);
  },
});

/**
 * Sends one in-memory file to Cloudinary and resolves with its secure URL.
 * `upload_stream` is callback-based, hence the manual Promise wrapper.
 */
function uploadBufferToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `${ROOT_FOLDER}/${folder}`, resource_type: "image" },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    stream.end(buffer);
  });
}

/**
 * Cloudinary deletes by `public_id`, not by URL, so it has to be recovered
 * from the stored URL. A secure URL looks like:
 *
 *   https://res.cloudinary.com/<cloud>/image/upload/v1234567890/tobe-kk/events/abc123.png
 *                                                  └─ version ┘└──── public_id ────┘└ext┘
 *
 * Everything after the version segment and before the extension is the id.
 * Storing it as its own column would avoid the parsing, but that means a
 * schema change on four models for a value already present in the URL.
 *
 * Returns null for anything that isn't a Cloudinary URL — notably the legacy
 * "/uploads/events/…" paths still in the database from before this switch.
 */
function publicIdFromUrl(url) {
  const match = /\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/.exec(url || "");
  return match ? match[1] : null;
}

/**
 * Builds the upload middleware and matching delete helper for one content
 * type. Replaces four near-identical modules that differed only in their
 * folder name — which meant the upload-filter hardening above would
 * otherwise have had to be applied, correctly, four separate times.
 *
 * @param {string} folder - subfolder in the media library, e.g. "events".
 * @returns {{ upload: import("multer").Multer, deletePhoto: (url: string) => void }}
 */
function createUploader(folder) {
  return {
    upload: memoryUpload,

    /**
     * Express middleware to run *after* `upload.single("photo")`. Uploads
     * the buffered file and hangs the resulting URL on `req.photoUrl` for
     * the controller to store.
     *
     * Kept separate from multer so a failed Cloudinary call surfaces as a
     * normal middleware error and reaches the router's existing JSON error
     * handler, rather than being swallowed inside multer's storage engine.
     */
    async toCloudinary(req, res, next) {
      if (!req.file) return next();
      try {
        req.photoUrl = await uploadBufferToCloudinary(req.file.buffer, folder);
        next();
      } catch (err) {
        next(err);
      }
    },

    /**
     * Best-effort removal of a previously-uploaded photo. Called when a
     * photo is replaced or its record deleted. Failures are swallowed on
     * purpose — this is cleanup, not a critical path, and an orphaned
     * Cloudinary asset is not worth failing a user's delete over.
     *
     * Legacy "/uploads/…" paths resolve to no public_id and are ignored;
     * those files live on a filesystem this code no longer writes to.
     */
    deletePhoto(photoUrl) {
      const publicId = publicIdFromUrl(photoUrl);
      if (!publicId) return;
      cloudinary.uploader.destroy(publicId).catch(() => {});
    },
  };
}

module.exports = { createUploader, publicIdFromUrl };

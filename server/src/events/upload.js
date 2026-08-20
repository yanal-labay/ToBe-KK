const fs = require("fs");
const path = require("path");
const multer = require("multer");

// server/uploads/events/ — created on boot if missing. Gitignored; these are
// runtime-uploaded files, not part of the repo.
const uploadDir = path.join(__dirname, "..", "..", "uploads", "events");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  // Randomized filename (not the original) to avoid collisions and to
  // avoid trusting user-supplied filenames on disk.
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("הקובץ שהועלה חייב להיות תמונה"));
  }
  cb(null, true);
}

/**
 * Multer middleware for the optional event photo upload. Used as
 * `upload.single("photo")` on the create/update event routes. Rejects
 * non-image files and anything over 5MB — both failures reach the router's
 * error-handling middleware in event.routes.js, which turns them into a
 * clean JSON 400 instead of Express's default HTML error page.
 */
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

/**
 * Best-effort delete of a previously-uploaded event photo from disk.
 * Called when an event's photo is replaced on update, or when the event
 * itself is deleted. Silently does nothing if `photoUrl` is null/undefined
 * or the file is already gone — this is cleanup, not a critical path, so a
 * missing file is not treated as an error.
 *
 * @param {string|null|undefined} photoUrl - the event's stored `photoUrl`
 *   (e.g. "/uploads/events/12345-678.png"), or null if it never had one.
 */
function deletePhoto(photoUrl) {
  if (!photoUrl) return;
  const filePath = path.join(uploadDir, path.basename(photoUrl));
  fs.unlink(filePath, () => {});
}

module.exports = { upload, deletePhoto, uploadDir };

const fs = require("fs");
const path = require("path");
const multer = require("multer");

// server/uploads/scholarships/ — created on boot if missing. Gitignored;
// these are runtime-uploaded files, not part of the repo.
const uploadDir = path.join(__dirname, "..", "..", "uploads", "scholarships");
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
 * Multer middleware for the optional scholarship photo upload. Used as
 * `upload.single("photo")` on the create/update routes. Rejects non-image
 * files and anything over 5MB — both failures reach the router's
 * error-handling middleware in scholarship.routes.js, which turns them into
 * a clean JSON 400 instead of Express's default HTML error page.
 */
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

/**
 * Best-effort delete of a previously-uploaded scholarship photo from disk.
 * Called when a scholarship's photo is replaced on update, or when the
 * scholarship itself is deleted.
 *
 * @param {string|null|undefined} photoUrl - the scholarship's stored
 *   `photoUrl` (e.g. "/uploads/scholarships/12345-678.png"), or null.
 */
function deletePhoto(photoUrl) {
  if (!photoUrl) return;
  const filePath = path.join(uploadDir, path.basename(photoUrl));
  fs.unlink(filePath, () => {});
}

module.exports = { upload, deletePhoto, uploadDir };

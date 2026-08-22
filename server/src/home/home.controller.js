const mongoose = require("mongoose");
const { z } = require("zod");
const HomeContent = require("./homeContent.model");
const HomePhoto = require("./homePhoto.model");
const { deletePhoto } = require("./upload");

const DEFAULT_TITLE = "ברוכים הבאים למרכז הצעירים כפר כמא";
const DEFAULT_BODY =
  "כאן תוכלו למצוא מלגות, אירועים, משרות ועוד עדכונים למען הצעירים בכפר כמא. עמוד הבית עדיין בבנייה — בקרוב יתווסף כאן עוד תוכן.";

// Every field is optional here since the hero (title/body) and caption
// (captionTitle/captionText) pairs are saved independently by two separate
// editor instances (see HomeContentEditor.jsx) — a PATCH only ever
// includes the one pair being edited. The hero pair still needs actual
// text (it always has fallback default text to fall back to otherwise),
// but the caption pair is optional — the admin can leave it, or clear it
// back to, blank — so it only gets a max-length check, no min(1).
const HomeContentInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    body: z.string().trim().min(1).max(2000).optional(),
    captionTitle: z.string().trim().max(200).optional(),
    captionText: z.string().trim().max(2000).optional(),
  })
  .refine(
    (data) => (data.title !== undefined) === (data.body !== undefined),
    { message: "כותרת וטקסט צריכים להישלח יחד" }
  )
  .refine(
    (data) => (data.captionTitle !== undefined) === (data.captionText !== undefined),
    { message: "כותרת וטקסט צריכים להישלח יחד" }
  )
  .refine((data) => Object.keys(data).length > 0, { message: "לא נשלח תוכן לשמירה" });

/**
 * GET /api/home — public. Returns the home page's editable text (the hero
 * pair falls back to default text when the admin hasn't set any yet; the
 * caption pair has no such default and comes back `null` until the admin
 * chooses to fill it in — see HomeContentEditor.jsx) plus every
 * admin-uploaded carousel photo, oldest first.
 */
async function getHome(req, res) {
  try {
    const [content, photos] = await Promise.all([
      HomeContent.findOne(),
      HomePhoto.find().sort({ createdAt: 1 }),
    ]);

    res.json({
      title: content?.title ?? DEFAULT_TITLE,
      body: content?.body ?? DEFAULT_BODY,
      captionTitle: content?.captionTitle ?? null,
      captionText: content?.captionText ?? null,
      photos,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * PATCH /api/home/content — admin-only. Upserts the singleton content
 * document (there's only ever one "current" home text, so this always
 * targets the same document regardless of whether one exists yet). Uses
 * `$set` rather than a plain replacement object so that saving just the
 * hero pair (title/body) or just the caption pair (captionTitle/
 * captionText) never wipes out the other, unsaved pair.
 */
async function updateHomeContent(req, res) {
  const result = HomeContentInputSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "תוכן עמוד הבית אינו תקין" });
  }

  try {
    const content = await HomeContent.findOneAndUpdate(
      {},
      { $set: { ...result.data, updatedAt: Date.now() } },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ success: true, content });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * POST /api/home/photos — admin-only. Adds one photo to the home page's
 * rotating photo box. The photo was already written to disk by
 * `upload.single("photo")` (see home.routes.js) and is available as
 * `req.file`.
 */
async function addHomePhoto(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "יש לבחור תמונה להעלאה" });
  }

  try {
    const photo = await new HomePhoto({ photoUrl: `/uploads/home/${req.file.filename}` }).save();
    res.status(201).json({ success: true, photo });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/** DELETE /api/home/photos/:id — admin-only. Removes one carousel photo. */
async function deleteHomePhoto(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  try {
    const photo = await HomePhoto.findByIdAndDelete(id);
    if (!photo) {
      return res.status(404).json({ success: false, message: "התמונה לא נמצאה" });
    }
    deletePhoto(photo.photoUrl);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

module.exports = { getHome, updateHomeContent, addHomePhoto, deleteHomePhoto };

const mongoose = require("mongoose");
const { z } = require("zod");
const Event = require("./event.model");
const Registration = require("./registration.model");
const { deletePhoto } = require("./upload");

const objectIdString = z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), {
  message: "מזהה לא תקין",
});

/**
 * Validates the create/update event payload. Note this arrives as
 * `multipart/form-data` (because the photo upload shares the same request),
 * so every field is a plain string on `req.body` — `price` in particular is
 * transformed from a string into either `null` (blank / omitted, meaning
 * "free") or a validated non-negative number.
 */
const EventInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  date: z.coerce.date(),
  time: z.string().trim().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "שעה לא תקינה"),
  location: z.string().trim().min(1).max(200),
  price: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0), { message: "מחיר לא תקין" }),
  registrationDeadline: z.coerce.date({ invalid_type_error: "תאריך סגירת ההרשמה לא תקין" }),
  fieldSelections: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return [];
      try {
        const parsed = JSON.parse(v);
        if (!Array.isArray(parsed)) throw new Error();
        return parsed;
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "בחירת שדות לא תקינה" });
        return z.NEVER;
      }
    })
    .pipe(z.array(objectIdString)),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v !== "false"),
}).refine(
  (data) => data.registrationDeadline.getTime() <= data.date.getTime(),
  {
    message: "תאריך סגירת ההרשמה לא יכול להיות מאוחר מתאריך האירוע",
    path: ["registrationDeadline"],
  }
);

/**
 * True once an event's optional registration cutoff has fully passed (a
 * day-only comparison, so the deadline day itself still allows signing up),
 * or once the event itself has already happened. Guests are blocked from
 * registering server-side once this is true — see `registerForEvent` —
 * mirroring `isEventExpired`/`isRegistrationClosed` in EventCard.jsx so the
 * UI and the API agree on when registration is actually closed.
 */
function isRegistrationClosed(event) {
  const [hours, minutes] = event.time.split(":").map(Number);
  const eventDateTime = new Date(event.date);
  eventDateTime.setHours(hours, minutes, 0, 0);
  if (eventDateTime.getTime() < Date.now()) return true;

  if (!event.registrationDeadline) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(event.registrationDeadline);
  deadline.setHours(0, 0, 0, 0);
  return deadline.getTime() < today.getTime();
}

/** Validates a guest's registration payload (no authentication required). */
const RegisterSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{7,20}$/, "מספר טלפון לא תקין"),
});

/** Validates an admin's attendance-status update for one registration. */
const RegistrationStatusSchema = z.object({
  status: z.enum(["signed_up", "arrived", "did_not_arrive"]),
});

// Every event-listing query resolves `fieldSelections` down to
// `{ _id, name, field: { _id, name } }` so the client can render/filter by
// field+value without a separate round trip per event.
const FIELD_SELECTIONS_POPULATE = { path: "fieldSelections", populate: { path: "field" } };

/**
 * GET /api/events — public list of active events only, soonest date first.
 * Inactive events are excluded at the query level, not merely hidden in the
 * UI, so they never reach a guest's browser at all.
 *
 * `$ne: false` rather than `true`: events created before `isActive` existed
 * have no such key, and `{ isActive: true }` would exclude every one of
 * them. See the note in event.model.js.
 */
async function listEvents(req, res) {
  try {
    const events = await Event.find({ isActive: { $ne: false } })
      .sort({ date: 1 })
      .populate(FIELD_SELECTIONS_POPULATE);
    res.json(events);
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * GET /api/events/admin — admin-only. Lists every event regardless of
 * `isActive`, so the admin can see, reactivate, or delete inactive ones.
 *
 * Each event also carries a `registrationCount`, which the admin UI puts on the
 * "נרשמים" button so nobody has to open a panel to discover it is empty. It is
 * deliberately absent from the public `listEvents` above: how many people signed
 * up is admin-only information.
 *
 * Counted with one $group over the whole Registration collection rather than a
 * countDocuments per event, which would be an N+1 that grows with the list.
 * There is no $match stage because this endpoint returns every event, so the
 * relevant rows are the entire collection — a $in over every id would filter
 * nothing while blocking the `event` index. Add one back if this ever paginates.
 *
 * `.lean()` is required, not an optimisation: a plain property assigned to a
 * hydrated Mongoose document is dropped by res.json(), which serializes via
 * toJSON() and so only emits schema paths. Event declares no virtuals, getters
 * or toJSON options, so the lean objects serialize identically to before.
 */
async function listEventsAdmin(req, res) {
  try {
    const [events, counts] = await Promise.all([
      Event.find().sort({ date: 1 }).populate(FIELD_SELECTIONS_POPULATE).lean(),
      Registration.aggregate([{ $group: { _id: "$event", count: { $sum: 1 } } }]),
    ]);

    // Keyed by string on both sides: two distinct ObjectId instances with the
    // same hex are never equal under Map's SameValueZero lookup.
    const countByEvent = new Map(counts.map((row) => [String(row._id), row.count]));

    res.json(
      events.map((event) => ({
        ...event,
        registrationCount: countByEvent.get(String(event._id)) || 0,
      }))
    );
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * POST /api/events — admin-only. Creates a new event. The photo is optional;
 * when present it was already uploaded to Cloudinary by the
 * `upload.single("photo")` + `toCloudinary` middleware pair (see
 * event.routes.js), which leaves its URL on `req.photoUrl`.
 */
async function createEvent(req, res) {
  const result = EventInputSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "פרטי האירוע אינם תקינים" });
  }

  try {
    const photoUrl = req.photoUrl;
    const event = await new Event({ ...result.data, ...(photoUrl && { photoUrl }) }).save();
    res.status(201).json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * PATCH /api/events/:id — admin-only. Updates an event's fields. If a new
 * photo is uploaded, it replaces the old one and the old file is deleted
 * from disk (`deletePhoto`); if no photo is uploaded, the existing photo is
 * left untouched.
 */
async function updateEvent(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה אירוע לא תקין" });
  }

  const result = EventInputSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "פרטי האירוע אינם תקינים" });
  }

  try {
    const existing = await Event.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "האירוע לא נמצא" });
    }

    const updates = { ...result.data };
    if (req.file) {
      updates.photoUrl = req.photoUrl;
      deletePhoto(existing.photoUrl);
    }

    const event = await Event.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * DELETE /api/events/:id — admin-only. Deletes the event, its uploaded
 * photo (if any), and cascades to delete every Registration tied to it —
 * there is no DB-level cascade for this, so it's done explicitly here.
 */
async function deleteEvent(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה אירוע לא תקין" });
  }

  try {
    const event = await Event.findByIdAndDelete(id);
    if (!event) {
      return res.status(404).json({ success: false, message: "האירוע לא נמצא" });
    }
    deletePhoto(event.photoUrl);
    await Registration.deleteMany({ event: event._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * POST /api/events/:id/register — public, rate-limited (see registerLimiter
 * in event.routes.js). Guests register with no account: just name/email/
 * phone, stored as a Registration with the default "signed_up" status.
 */
async function registerForEvent(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה אירוע לא תקין" });
  }

  const result = RegisterSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "פרטי ההרשמה אינם תקינים" });
  }

  try {
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: "האירוע לא נמצא" });
    }
    if (isRegistrationClosed(event)) {
      return res.status(400).json({ success: false, message: "ההרשמה לאירוע זה נסגרה" });
    }

    const registration = await new Registration({ event: event._id, ...result.data }).save();
    res.status(201).json({ success: true, registration });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * GET /api/events/:id/registrations — admin-only. Lists everyone registered
 * for one event, in signup order. Powers the admin registrants table and
 * status-summary chart.
 */
async function listRegistrations(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "מזהה אירוע לא תקין" });
  }

  try {
    const registrations = await Registration.find({ event: id }).sort({ createdAt: 1 });
    res.json(registrations);
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * PATCH /api/events/:id/registrations/:registrationId — admin-only. Sets
 * one registrant's attendance status (e.g. after checking them in at the
 * door). `event: id` is included in the query filter so a registration
 * can't be updated through the wrong event's URL.
 */
async function updateRegistrationStatus(req, res) {
  const { id, registrationId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(registrationId)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  const result = RegistrationStatusSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "סטטוס לא תקין" });
  }

  try {
    const registration = await Registration.findOneAndUpdate(
      { _id: registrationId, event: id },
      { status: result.data.status },
      { new: true, runValidators: true }
    );
    if (!registration) {
      return res.status(404).json({ success: false, message: "ההרשמה לא נמצאה" });
    }
    res.json({ success: true, registration });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

/**
 * DELETE /api/events/:id/registrations/:registrationId — admin-only. Lets
 * an admin remove one registrant (e.g. spam or a mistaken entry) from the
 * table in RegistrationsPanel.jsx. `event: id` is included in the query
 * filter so a registration can't be deleted through the wrong event's URL.
 */
async function deleteRegistration(req, res) {
  const { id, registrationId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(registrationId)) {
    return res.status(400).json({ success: false, message: "מזהה לא תקין" });
  }

  try {
    const registration = await Registration.findOneAndDelete({ _id: registrationId, event: id });
    if (!registration) {
      return res.status(404).json({ success: false, message: "ההרשמה לא נמצאה" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

module.exports = {
  listEvents,
  listEventsAdmin,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  listRegistrations,
  updateRegistrationStatus,
  deleteRegistration,
};

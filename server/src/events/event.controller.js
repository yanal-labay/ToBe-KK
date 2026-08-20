const mongoose = require("mongoose");
const { z } = require("zod");
const Event = require("./event.model");
const Registration = require("./registration.model");
const { deletePhoto } = require("./upload");

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
});

const RegisterSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{7,20}$/, "מספר טלפון לא תקין"),
});

const RegistrationStatusSchema = z.object({
  status: z.enum(["signed_up", "arrived", "did_not_arrive"]),
});

async function listEvents(req, res) {
  try {
    const events = await Event.find().sort({ date: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

async function createEvent(req, res) {
  const result = EventInputSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "פרטי האירוע אינם תקינים" });
  }

  try {
    const photoUrl = req.file ? `/uploads/events/${req.file.filename}` : undefined;
    const event = await new Event({ ...result.data, ...(photoUrl && { photoUrl }) }).save();
    res.status(201).json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

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
      updates.photoUrl = `/uploads/events/${req.file.filename}`;
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

    const registration = await new Registration({ event: event._id, ...result.data }).save();
    res.status(201).json({ success: true, registration });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
}

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

module.exports = {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  listRegistrations,
  updateRegistrationStatus,
};

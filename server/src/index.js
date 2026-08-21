const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const { z } = require("zod");
const authRoutes = require("./userManagement/auth.routes");
const eventRoutes = require("./events/event.routes");
const scholarshipRoutes = require("./scholarships/scholarship.routes");
const tagRoutes = require("./scholarships/tag.routes");
const studentRegistryRoutes = require("./studentRegistry/registrant.routes");
const listOptionRoutes = require("./studentRegistry/listOption.routes");
const seedListOptions = require("./studentRegistry/seedListOptions");
const jobRoutes = require("./jobs/job.routes");
const scheduleRoutes = require("./schedule/schedule.routes");
const homeRoutes = require("./home/home.routes");
const contactRoutes = require("./contact/contact.routes");

dotenv.config();

const app = express();

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// ZOD VALIDATION
const BuySchema = z.object({
  email: z
    .string()
    .trim()
    .regex(emailRegex, { message: "Please enter a valid email address" }),
});

app.use(helmet());
app.use(morgan("dev"));
// `credentials: true` + an explicit origin (not "*") is required for the
// browser to send/accept the httpOnly session cookie cross-origin between
// the Vite dev server and this API.
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// API responses (and the static uploads below) are never cached — admin
// content changes frequently and auth state must never be served stale.
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// Serves uploaded event photos. Helmet's default Cross-Origin-Resource-Policy
// ("same-origin") would otherwise silently block the client (a different
// origin in dev) from loading these images via <img>, so it's relaxed to
// "cross-origin" for this path only.
app.use(
  "/uploads",
  (req, res, next) => {
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.join(__dirname, "..", "uploads"))
);

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/scholarships", scholarshipRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/student-registry", studentRegistryRoutes);
app.use("/api/student-registry-options", listOptionRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/contact", contactRoutes);

const buyActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many attempts. Please wait 1 minute.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const MONGO_URI = process.env.MONGO_URI || "";
if (!MONGO_URI) {
  console.error("CRITICAL: MONGO_URI is missing from .env!");
} else {
  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log("DB STATUS: Connected Successfully");
      return seedListOptions();
    })
    .catch((err) => console.error("DB CONNECTION ERROR:", err.message));
}

// --- Legacy scaffolding below ---
// Order/TestEntry and their /api/test, /api/status, /api/orders, /api/buy,
// /api/reset routes are leftover boilerplate from an earlier "limited spots"
// campaign template. They are not part of the current app (events, auth) and
// aren't wired into any page — left as-is rather than removed since that's
// outside the scope of whatever asked for changes near them.
const Order = mongoose.model(
  "Order",
  new mongoose.Schema({
    email: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  })
);

// Simple model used only to sanity-check the DB connection end-to-end.
const TestEntry = mongoose.model(
  "TestEntry",
  new mongoose.Schema({
    name: { type: String, required: true },
    number: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
  })
);

app.post("/api/test", async (req, res) => {
  try {
    const { name, number } = req.body;
    if (!name || typeof number !== "number") {
      return res
        .status(400)
        .json({ success: false, message: "name (string) and number (number) are required" });
    }
    const entry = await new TestEntry({ name, number }).save();
    res.json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database Error" });
  }
});

app.get("/api/test", async (req, res) => {
  try {
    const entries = await TestEntry.find().sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json([]);
  }
});

app.get("/api/status", async (req, res) => {
  try {
    const count = await Order.countDocuments();
    res.json({ remaining: Math.max(0, 5 - count), soldOut: count >= 5 });
  } catch (err) {
    res.status(500).json({ error: "Sync failed" });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json([]);
  }
});

app.post("/api/buy", buyActionLimiter, async (req, res) => {
  try {
    const result = BuySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error.message,
      });
    }

    const { email } = result.data;
    const count = await Order.countDocuments();
    if (count >= 5)
      return res.status(400).json({ message: "Campaign Sold Out!" });

    await new Order({ email }).save();
    res.json({ success: true, message: "Spot Secured!" });
  } catch (err) {
    res.status(500).json({ message: "Database Error" });
  }
});

app.post("/api/reset", async (req, res) => {
  try {
    await Order.deleteMany({});
    res.json({ message: "System Reset Successful" });
  } catch (err) {
    res.status(500).json({ message: "Reset Failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "127.0.0.1", () => {
  console.log(`Server is running on http://127.0.0.1:${PORT}`);
});

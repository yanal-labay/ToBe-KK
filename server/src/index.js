// Loaded before any of this app's own modules are required. That ordering is
// load-bearing: shared/cloudinaryUpload.js configures the Cloudinary SDK at
// require time, so if dotenv ran after the route imports below it would see
// an empty process.env and every upload would fail with "Must supply
// api_key". Third-party requires above are safe either way.
require("dotenv").config();

const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const authRoutes = require("./userManagement/auth.routes");
const eventRoutes = require("./events/event.routes");
const scholarshipRoutes = require("./scholarships/scholarship.routes");
const studentRegistryRoutes = require("./studentRegistry/registrant.routes");
const listOptionRoutes = require("./studentRegistry/listOption.routes");
const seedListOptions = require("./studentRegistry/seedListOptions");
const jobRoutes = require("./jobs/job.routes");
const jobFieldRoutes = require("./jobs/jobField.routes");
const eventFieldRoutes = require("./events/eventField.routes");
const seedEventFields = require("./events/seedEventFields");
const seedJobFields = require("./jobs/seedJobFields");
const scholarshipFieldRoutes = require("./scholarships/scholarshipField.routes");
const scheduleRoutes = require("./schedule/schedule.routes");
const homeRoutes = require("./home/home.routes");
const contactRoutes = require("./contact/contact.routes");
const linkRoutes = require("./links/link.routes");
const activityRoutes = require("./activity/activity.routes");

const app = express();

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
app.use("/api/scholarship-fields", scholarshipFieldRoutes);
app.use("/api/student-registry", studentRegistryRoutes);
app.use("/api/student-registry-options", listOptionRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/job-fields", jobFieldRoutes);
app.use("/api/event-fields", eventFieldRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/links", linkRoutes);
app.use("/api/activity", activityRoutes);

// Cheap liveness probe — no database, no auth. Used as the target of the
// keep-alive ping below, and as something to point Render's health check at.
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", db: mongoose.connection.readyState === 1 });
});

// Anything that matched no router above. Without this, Express answers with
// its own HTML page ("Cannot GET /api/evnts"), and the client — which calls
// res.json() on every response — surfaces that as a JSON parse error rather
// than a clean failure. Hebrew message to match the per-resource 404s in the
// controllers ("האירוע לא נמצא" and friends).
//
// Deliberately unscoped rather than "/api/*": this server only serves /api
// and /uploads. If the built client is ever served from here too, this must
// move below that static mount, or it will swallow the client's own routes.
app.use((req, res) => {
  res.status(404).json({ success: false, message: "הכתובת המבוקשת לא נמצאה" });
});

// Last-resort error handler. The four-argument signature is what marks it as
// one to Express — it is not interchangeable with the 404 above, and it has
// to stay last.
//
// Express 5 forwards a rejected promise out of an async handler here
// automatically. That matters for `login` (auth.controller.js), the one
// DB-touching handler with no try/catch of its own, on a router with no local
// error middleware: without this, a Mongo outage answers a login attempt with
// Express's default HTML error page, stack trace included.
//
// The four routers that mount their own upload-error middleware (events,
// scholarships, jobs, home) still handle their errors first; this only
// catches what they don't.
app.use((err, req, res, next) => {
  // A response already streaming (a partially-sent static file) can't be
  // rewritten — hand it back to Express to close out.
  if (res.headersSent) return next(err);
  console.error("UNHANDLED ERROR:", err);
  // body-parser tags its own errors with a status — malformed JSON is a
  // client mistake (400), not a server fault. Anything untagged is a real
  // 500. The error's own message is logged, never sent.
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: status >= 500 ? "Server error" : "Bad request",
  });
});

// Without a signing secret, `login` throws and `requireAuth` rejects every
// token — the server boots and looks healthy, then nobody can log in. Say so
// at startup rather than leaving it to be discovered at the login screen.
if (!process.env.JWT_SECRET) {
  console.error("CRITICAL: JWT_SECRET is missing! Login will not work.");
}

const MONGO_URI = process.env.MONGO_URI || "";
if (!MONGO_URI) {
  console.error("CRITICAL: MONGO_URI is missing from .env!");
} else {
  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log("DB STATUS: Connected Successfully");
      return Promise.all([seedListOptions(), seedJobFields(), seedEventFields()]);
    })
    .catch((err) => console.error("DB CONNECTION ERROR:", err.message));
}

const PORT = process.env.PORT || 5000;

// Render routes external traffic *into* the container, so in production the
// server has to listen on every interface — bound to 127.0.0.1 it would be
// unreachable from outside and the deploy would fail its health check with no
// obvious symptom. Locally we keep binding to loopback so the dev server
// isn't exposed to everyone else on the network.
const HOST = process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1";

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});

// Render's free tier stops the container after 15 minutes without traffic,
// and waking it again takes the better part of a minute — which a visitor
// experiences as the site simply not loading. Pinging ourselves every 14
// minutes keeps it below that threshold.
//
// RENDER_EXTERNAL_URL is injected by Render, so this stays dormant locally
// and in any other environment; there's nothing to disable in development.
const KEEP_ALIVE_URL = process.env.RENDER_EXTERNAL_URL;
if (KEEP_ALIVE_URL) {
  const FOURTEEN_MINUTES = 14 * 60 * 1000;
  setInterval(() => {
    // Failures are ignored on purpose: a missed ping only risks a cold start,
    // and an unhandled rejection here would take the whole server down.
    fetch(`${KEEP_ALIVE_URL}/api/health`).catch(() => {});
  }, FOURTEEN_MINUTES);
  console.log(`Keep-alive ping enabled for ${KEEP_ALIVE_URL}`);
}

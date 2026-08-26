const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
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
const seedJobFields = require("./jobs/seedJobFields");
const scholarshipFieldRoutes = require("./scholarships/scholarshipField.routes");
const scheduleRoutes = require("./schedule/schedule.routes");
const homeRoutes = require("./home/home.routes");
const contactRoutes = require("./contact/contact.routes");
const linkRoutes = require("./links/link.routes");

dotenv.config();

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
app.use("/api/schedule", scheduleRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/links", linkRoutes);

const MONGO_URI = process.env.MONGO_URI || "";
if (!MONGO_URI) {
  console.error("CRITICAL: MONGO_URI is missing from .env!");
} else {
  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log("DB STATUS: Connected Successfully");
      return Promise.all([seedListOptions(), seedJobFields()]);
    })
    .catch((err) => console.error("DB CONNECTION ERROR:", err.message));
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, "127.0.0.1", () => {
  console.log(`Server is running on http://127.0.0.1:${PORT}`);
});

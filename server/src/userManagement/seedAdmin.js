require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("./user.model");

async function seedAdmin() {
  const { MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  if (!MONGO_URI) throw new Error("MONGO_URI is missing from .env");
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
  }

  await mongoose.connect(MONGO_URI);

  const email = ADMIN_EMAIL.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await User.findOneAndUpdate(
    { email },
    { email, passwordHash, role: "admin" },
    { upsert: true, new: true }
  );

  console.log(`Admin user ready: ${admin.email}`);
  await mongoose.disconnect();
}

seedAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exit(1);
  });

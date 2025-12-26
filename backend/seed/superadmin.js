require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Admin = require("../models/Admin");

async function run() {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;

  if (!email || !password) {
    console.error("Missing SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD in .env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const passwordHash = await bcrypt.hash(password, 12);

  let existing = await Admin.findOne({ email: email.toLowerCase() });

  if (existing) {
    existing.passwordHash = passwordHash;
    existing.role = "superadmin";
    await existing.save();
    console.log("✅ Superadmin password RESET for:", existing.email);
    process.exit(0);
  }

  const admin = await Admin.create({
    email,
    passwordHash,
    role: "superadmin",
  });

  console.log("✅ Superadmin created:", admin.email);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

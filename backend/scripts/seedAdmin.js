import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const pass = process.argv[3];

  if (!email || !pass) {
    console.log("Usage: node scripts/seedAdmin.js admin@email.com StrongPassword123!");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(pass, 12);

  // IMPORTANT:
  // If your model is Admin, this works: prisma.admin
  // If your model is User, change prisma.admin -> prisma.user
  const delegateName = "admin"; // <-- change to "user" if needed
  const delegate = prisma[delegateName];

  if (!delegate) {
    console.log("❌ Prisma delegate not found:", delegateName);
    console.log("Available models:", Object.keys(prisma).filter(k => !k.startsWith("$")));
    process.exit(1);
  }

  await delegate.upsert({
    where: { email },
    create: { email, passwordHash, name: "Admin" },
    update: { passwordHash },
  });

  console.log("✅ Admin ready:", email);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

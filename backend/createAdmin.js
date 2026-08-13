const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("123456", 10);

  await prisma.user.create({
    data: {
      name: "Main Admin",
      email: "admin@test.com",
      password: hashedPassword,
      role: "admin",
    },
  });

  console.log("✅ Admin created successfully");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
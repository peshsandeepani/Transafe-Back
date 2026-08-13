const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function resetPassword() {
  const hashedPassword = await bcrypt.hash("123456", 10);

  const user = await prisma.user.update({
    where: {
      email: "lankaadmin@test.com",
    },
    data: {
      password: hashedPassword,
    },
  });

  console.log("Password reset done for:", user.email);
}

resetPassword()
  .catch((error) => {
    console.log(error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
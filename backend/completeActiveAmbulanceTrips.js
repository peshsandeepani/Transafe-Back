require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Scanning ambulance trips with status Active/active...");

  const result = await prisma.ambulanceTrip.updateMany({
    where: {
      status: {
        in: ["Active", "active"],
      },
    },
    data: {
      status: "Completed",
    },
  });

  console.log(`Updated ${result.count} ambulance trip(s) to Completed.`);
}

main()
  .catch((error) => {
    console.error("Repair script failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

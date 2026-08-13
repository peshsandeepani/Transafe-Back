const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  try {
    // 1. Create a police department if it doesn't exist
    let policeDepartment = await prisma.policeDepartment.findFirst({
      where: { stationCode: "PS001" },
    });

    if (!policeDepartment) {
      policeDepartment = await prisma.policeDepartment.create({
        data: {
          stationName: "Main Police Station",
          stationCode: "PS001",
          division: "City Division",
          address: "123 Main Street",
          phone: "+94 11 234 5678",
          emergencyNumber: "119",
          officerInCharge: "Inspector Silva",
          email: "mainpolice@test.com",
          latitude: 6.9271,
          longitude: 80.7789,
          district: "Colombo",
          province: "Western",
          status: "Active",
        },
      });
      console.log("✅ Police Department created:", policeDepartment.stationName);
    } else {
      console.log("✓ Police Department already exists:", policeDepartment.stationName);
    }

    // 2. Create or update police_admin user
    const hashedPassword = await bcrypt.hash("123456", 10);
    
    let policeAdmin = await prisma.user.findFirst({
      where: { role: "police_admin" },
    });

    if (!policeAdmin) {
      policeAdmin = await prisma.user.create({
        data: {
          name: "Police Admin",
          email: "police@test.com",
          password: hashedPassword,
          role: "police_admin",
          policeDepartmentId: policeDepartment.id,
        },
      });
      console.log("✅ Police Admin user created and assigned to department");
    } else {
      // Update existing police_admin to assign department
      policeAdmin = await prisma.user.update({
        where: { id: policeAdmin.id },
        data: {
          policeDepartmentId: policeDepartment.id,
        },
      });
      console.log("✅ Police Admin user updated with department assignment");
    }

    console.log("\n📋 Setup Summary:");
    console.log(`- Police Station: ${policeDepartment.stationName}`);
    console.log(`- Admin Email: ${policeAdmin.email}`);
    console.log(`- Admin Password: 123456`);
    console.log(`- Department ID: ${policeDepartment.id}`);
    console.log(`- User ID: ${policeAdmin.id}`);
    console.log("\n✅ Police Admin setup complete!");

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

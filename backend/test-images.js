const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkImages() {
  try {
    const incidents = await prisma.roadIncident.findMany({
      where: {
        imageUrl: {
          not: null,
        },
      },
      select: {
        id: true,
        type: true,
        imageUrl: true,
        createdAt: true,
      },
      take: 5,
    });

    console.log("Recent incidents with images:");
    console.log(JSON.stringify(incidents, null, 2));

    if (incidents.length > 0) {
      console.log("\n✅ Image URLs found:");
      incidents.forEach((inc) => {
        const fullUrl = `http://172.20.10.9:5000${inc.imageUrl}`;
        console.log(`- ID ${inc.id}: ${fullUrl}`);
      });
    } else {
      console.log("\n❌ No incidents with images found");
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkImages();

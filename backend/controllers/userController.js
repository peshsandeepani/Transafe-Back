const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        assignedVehicleId: true,
        hospitalId: true,
        phone: true,
        licenseNumber: true,
      },
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

module.exports = {
  getUsers,
};
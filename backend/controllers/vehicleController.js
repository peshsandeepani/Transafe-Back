const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const createVehicle = async (req, res) => {
  try {
    const { vehicleNumber, type, driverName, gpsDeviceId, status, hospitalId } = req.body;

    const vehicle = await prisma.vehicle.create({
      data: {
        vehicleNumber,
        type,
        driverName,
        gpsDeviceId,
        status,
        hospitalId: hospitalId ? Number(hospitalId) : null,
      },
    });

    res.status(201).json({
      message: "Vehicle created successfully",
      vehicle,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getVehicles = async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      orderBy: { id: "desc" },
    });

    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicleNumber, type, driverName, gpsDeviceId, status, hospitalId } = req.body;

    const vehicle = await prisma.vehicle.update({
      where: { id: Number(id) },
      data: {
        vehicleNumber,
        type,
        driverName,
        gpsDeviceId,
        status,
        hospitalId: hospitalId ? Number(hospitalId) : null,
      },
    });

    res.json({
      message: "Vehicle updated successfully",
      vehicle,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.vehicle.delete({
      where: { id: Number(id) },
    });

    res.json({
      message: "Vehicle deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createVehicle,
  getVehicles,
  updateVehicle,
  deleteVehicle,
};
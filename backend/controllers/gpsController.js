const { PrismaClient } = require("@prisma/client");
const { rtdb } = require("../config/firebaseAdmin");

const prisma = new PrismaClient();

const updateGPS = async (req, res) => {
  try {
    const { vehicleId, latitude, longitude, speed, heading } = req.body;

    if (!vehicleId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        message: "vehicleId, latitude and longitude are required",
      });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({
        message: "Invalid latitude or longitude",
      });
    }

    const parsedHeading =
      heading !== undefined && heading !== null && heading !== ""
        ? Number(heading)
        : null;

    const vehicleData = {
      vehicleId,
      latitude: lat,
      longitude: lng,
      speed: Number(speed || 0),
      heading: parsedHeading,
      updatedAt: new Date(),
    };

    // Save latest location in memory
    const trackedVehicles = req.app.locals.trackedVehicles || [];

    const index = trackedVehicles.findIndex(
      (vehicle) => vehicle.vehicleId === vehicleId
    );

    if (index >= 0) {
      trackedVehicles[index] = vehicleData;
    } else {
      trackedVehicles.push(vehicleData);
    }

    req.app.locals.trackedVehicles = trackedVehicles;

    // Update active ambulance trip location in database
    if (vehicleId.startsWith("AMB")) {
      const activeTrip = await prisma.ambulanceTrip.findFirst({
        where: {
          ambulanceId: vehicleId,
          status: "Active",
        },
      });

      if (activeTrip) {
        await prisma.ambulanceTrip.update({
          where: {
            id: activeTrip.id,
          },
          data: {
            currentLatitude: lat,
            currentLongitude: lng,
          },
        });
      }
    }

    const io = req.app.get("io");

    // Realtime GPS update
    io.emit("gpsUpdate", vehicleData);

    // Realtime ambulance warning
    if (vehicleId.startsWith("AMB")) {
      io.emit("nearbyEmergencyAlert", {
        ambulanceId: vehicleId,
        latitude: lat,
        longitude: lng,
        distance: "0.30",
        message: "🚨 Ambulance behind you. Please give way safely.",
      });
    }

    // --- Firebase Realtime Database: store the latest location ---
    try {
      await rtdb.ref(`liveLocations/${vehicleId}`).set({
        vehicleId,
        latitude: lat,
        longitude: lng,
        speed: Number(speed || 0),
        updatedAt: new Date().toISOString(),
      });
    } catch (fbError) {
      console.log("Firebase RTDB write error (updateGPS):", fbError.message);
    }

    res.json({
      message: "GPS updated successfully",
      vehicle: vehicleData,
    });
  } catch (error) {
    console.error("GPS update error:", error);
    res.status(500).json({ error: error.message });
  }
};

const getVehicleLocation = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const trackedVehicles = req.app.locals.trackedVehicles || [];

    const vehicle = trackedVehicles.find(
      (item) => item.vehicleId === vehicleId
    );

    if (!vehicle) {
      return res.status(404).json({
        message: "Vehicle not found",
      });
    }

    res.json(vehicle);
  } catch (error) {
    console.error("Get vehicle location error:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  updateGPS,
  getVehicleLocation,
};
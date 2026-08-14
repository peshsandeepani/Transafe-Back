const { PrismaClient } = require("@prisma/client");
const { rtdb } = require("../config/firebaseAdmin");

const prisma = new PrismaClient();

const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const calculateBearing = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  const dLon = toRad(lon2 - lon1);

  const y = Math.sin(dLon) * Math.cos(toRad(lat2));

  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.cos(dLon);

  const bearing = Math.atan2(y, x);

  return (toDeg(bearing) + 360) % 360;
};

const angleDiff = (angle1, angle2) => {
  return Math.abs((angle1 - angle2 + 180) % 360 - 180);
};

const getDriverWarningState = (distanceKm, vehicleInFront, directionMatch) => {
  if (distanceKm > 1.2) {
    return {
      status: "still_far",
      label: "Still far",
      message: "Ambulance is still far away. Keep driving normally.",
    };
  }

  if (distanceKm > 0.5) {
    return {
      status: "approaching",
      label: "Approaching",
      message: "Ambulance is approaching. Stay alert and keep a safe distance.",
    };
  }

  if (distanceKm > 0.18) {
    return {
      status: "near_driver",
      label: "Near driver",
      message: "Ambulance is very near. Please give way carefully.",
    };
  }

  if (distanceKm > 0.05 && vehicleInFront && directionMatch) {
    return {
      status: "at_driver_location",
      label: "At driver location",
      message: "Ambulance is at your exact location. Stop and give way.",
    };
  }

  if (vehicleInFront && directionMatch) {
    return {
      status: "passing_driver",
      label: "Passing driver",
      message: "Ambulance is passing your vehicle. Give way now.",
    };
  }

  return {
    status: "approaching",
    label: "Approaching",
    message: "Ambulance is approaching. Please give way safely.",
  };
};

const startTrip = async (req, res) => {
  try {
    const {
      ambulanceId,
      driverName,
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
    } = req.body;

    const trip = await prisma.ambulanceTrip.create({
      data: {
        ambulanceId,
        driverName,
        startLatitude: Number(startLatitude),
        startLongitude: Number(startLongitude),
        endLatitude: Number(endLatitude),
        endLongitude: Number(endLongitude),
        currentLatitude: Number(startLatitude),
        currentLongitude: Number(startLongitude),
        status: "Active",
      },
    });

    const io = req.app.get("io");

    io.emit("ambulanceTripStarted", trip);

    res.status(201).json({
      message: "Ambulance trip started",
      trip,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const getActiveTrips = async (req, res) => {
  try {
    const trips = await prisma.ambulanceTrip.findMany({
      where: {
        status: {
          in: ["Active", "active"],
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    res.json(trips);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, heading } = req.body;

    const ambulanceLatitude = Number(latitude);
    const ambulanceLongitude = Number(longitude);

    const existingTrip = await prisma.ambulanceTrip.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!existingTrip) {
      return res.status(404).json({
        message: "Ambulance trip not found",
      });
    }

    const explicitAmbulanceHeading =
      heading !== undefined && heading !== null && heading !== ""
        ? Number(heading)
        : null;

    const ambulanceHeading =
      explicitAmbulanceHeading !== null
        ? explicitAmbulanceHeading
        : existingTrip.currentLatitude !== ambulanceLatitude ||
          existingTrip.currentLongitude !== ambulanceLongitude
        ? calculateBearing(
            existingTrip.currentLatitude,
            existingTrip.currentLongitude,
            ambulanceLatitude,
            ambulanceLongitude
          )
        : null;

    const trip = await prisma.ambulanceTrip.update({
      where: {
        id: Number(id),
      },
      data: {
        currentLatitude: ambulanceLatitude,
        currentLongitude: ambulanceLongitude,
      },
    });

    const io = req.app.get("io");

    io.emit("ambulanceLocationUpdate", trip);

    const nearbyVehicles = req.app.locals.trackedVehicles || [];

    for (const vehicle of nearbyVehicles) {
      if (vehicle.vehicleId === trip.ambulanceId) {
        continue;
      }

      const distance = calculateDistanceKm(
        ambulanceLatitude,
        ambulanceLongitude,
        vehicle.latitude,
        vehicle.longitude
      );

      if (distance > 1) {
        io.emit("clearAmbulanceWarning", {
          vehicleId: vehicle.vehicleId,
          ambulanceId: trip.ambulanceId,
        });

        try {
          await rtdb.ref(`driverWarnings/${vehicle.vehicleId}`).remove();
        } catch (fbError) {
          console.log("Firebase ambulance warning clear error:", fbError.message);
        }

        continue;
      }

      const vehicleHeading = vehicle.heading;
      let directionMatch = true;
      let vehicleInFront = true;

      // If heading data exists, use strict directional checks
      if (vehicleHeading != null && ambulanceHeading != null) {
        directionMatch = angleDiff(ambulanceHeading, vehicleHeading) <= 45;

        const bearingToVehicle = calculateBearing(
          ambulanceLatitude,
          ambulanceLongitude,
          vehicle.latitude,
          vehicle.longitude
        );

        vehicleInFront = angleDiff(ambulanceHeading, bearingToVehicle) <= 70;
      }
      // If heading data is missing, allow warning based on distance alone

      // Show warning if within distance range OR (if heading checks are available, they pass)
      if (distance <= 1.2 && (vehicleHeading == null || ambulanceHeading == null || (directionMatch && vehicleInFront))) {
        const warningState = getDriverWarningState(
          Number(distance.toFixed(2)),
          vehicleInFront,
          directionMatch
        );

        console.log(`[Ambulance Warning] Vehicle: ${vehicle.vehicleId}, Ambulance: ${trip.ambulanceId}, Distance: ${distance.toFixed(2)} km, State: ${warningState.status}`);

        const warningPayload = {
          vehicleId: vehicle.vehicleId,
          ambulanceId: trip.ambulanceId,
          ambulanceLatitude,
          ambulanceLongitude,
          distance: distance.toFixed(2),
          status: warningState.status,
          label: warningState.label,
          message: warningState.message,
          createdAt: new Date().toISOString(),
        };

        io.emit("nearbyDriverWarning", warningPayload);

        try {
          await rtdb.ref(`driverWarnings/${vehicle.vehicleId}`).set(warningPayload);
        } catch (fbError) {
          console.log("Firebase ambulance warning write error:", fbError.message);
        }
      } else {
        console.log(`[Clear Warning] Vehicle: ${vehicle.vehicleId}, Ambulance: ${trip.ambulanceId}, Distance: ${distance.toFixed(2)} km (out of range or direction mismatch)`);
        
        io.emit("clearAmbulanceWarning", {
          vehicleId: vehicle.vehicleId,
          ambulanceId: trip.ambulanceId,
        });

        try {
          await rtdb.ref(`driverWarnings/${vehicle.vehicleId}`).remove();
        } catch (fbError) {
          console.log("Firebase ambulance warning clear error:", fbError.message);
        }
      }
    }

    res.json({
      message: "Ambulance location updated",
      trip,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const endTrip = async (req, res) => {
  try {
    const { id } = req.params;

    const trip = await prisma.ambulanceTrip.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    const updatedTrip = await prisma.ambulanceTrip.update({
      where: {
        id: Number(id),
      },
      data: {
        status: "Completed",
      },
    });

    const io = req.app.get("io");

    io.emit("ambulanceTripEnded", updatedTrip);

    io.emit("clearAmbulanceWarningAll", {
      ambulanceId: updatedTrip.ambulanceId,
    });

    res.json({
      message: "Ambulance trip completed successfully",
      trip: updatedTrip,
    });
  } catch (error) {
    console.error("End trip error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const getCompletedTrips = async (req, res) => {
  try {
    const trips = await prisma.ambulanceTrip.findMany({
      where: {
        status: {
          in: ["Completed", "completed"],
        },
      },
      orderBy: {
        id: "desc",
      },
      take: 50,
    });

    res.json(trips);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

const getHospitalTripsSimple = async (req, res) => {
  try {
    const { hospitalId } = req.params;

    const ambulances = await prisma.vehicle.findMany({
      where: {
        hospitalId: Number(hospitalId),
      },
    });

    const hospitalDrivers = await prisma.user.findMany({
      where: {
        role: "ambulance_driver",
        hospitalId: Number(hospitalId),
        assignedVehicleId: {
          not: null,
        },
      },
      select: {
        assignedVehicleId: true,
      },
    });

    const ambulanceNumbers = Array.from(
      new Set(
        [
          ...ambulances
            .filter((a) => String(a.type).toLowerCase() === "ambulance")
            .map((a) => String(a.vehicleNumber)),
          ...hospitalDrivers
            .map((d) => d.assignedVehicleId)
            .filter(Boolean)
            .map((id) => String(id)),
        ].filter(Boolean)
      )
    );

    if (ambulanceNumbers.length === 0) {
      return res.json({
        activeTrips: [],
        completedTrips: [],
        total: 0,
        ambulanceCount: ambulances.length,
      });
    }

    const relevantTrips = await prisma.ambulanceTrip.findMany({
      where: {
        status: {
          in: ["Active", "active", "Completed", "completed"],
        },
      },
      orderBy: {
        id: "desc",
      },
      take: 500,
    });

    const ambulanceNumbersSet = new Set(
      ambulanceNumbers.map((number) => String(number).toLowerCase())
    );

    const hospitalTrips = relevantTrips.filter((trip) =>
      ambulanceNumbersSet.has(String(trip.ambulanceId || "").toLowerCase())
    );

    const normalizeStatus = (status) =>
      String(status || "").trim().toLowerCase();

    const activeTrips = hospitalTrips.filter(
      (trip) => normalizeStatus(trip.status) === "active"
    );

    const completedTrips = hospitalTrips.filter(
      (trip) => normalizeStatus(trip.status) === "completed"
    );

    res.json({
      activeTrips,
      completedTrips,
      total: activeTrips.length + completedTrips.length,
      ambulanceCount: ambulances.length,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const completeAllTrips = async (req, res) => {
  try {
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

    res.json({
      message: "All active ambulance trips marked as completed",
      updatedCount: result.count,
    });
  } catch (error) {
    console.error("Complete all ambulance trips error:", error);
    res.status(500).json({
      error: error.message,
    });
  }
};

const deleteAllTrips = async (req, res) => {
  try {
    const result = await prisma.ambulanceTrip.deleteMany({});

    res.json({
      message: "All ambulance trips cleared",
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("Delete all ambulance trips error:", error);
    res.status(500).json({
      error: error.message,
    });
  }
};

module.exports = {
  startTrip,
  getActiveTrips,
  updateLocation,
  endTrip,
  getCompletedTrips,
  getHospitalTripsSimple,
  completeAllTrips,
  deleteAllTrips,
};
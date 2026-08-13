const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { rtdb } = require("../config/firebaseAdmin");

const router = express.Router();
const prisma = new PrismaClient();

let vehicles = [];

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

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const isVehicleAhead = (
  ambulanceLat,
  ambulanceLon,
  ambulanceHeading,
  vehicleLat,
  vehicleLon
) => {
  if (ambulanceHeading === null || ambulanceHeading === undefined) {
    return false;
  }

  const bearingToVehicle = calculateBearing(
    ambulanceLat,
    ambulanceLon,
    vehicleLat,
    vehicleLon
  );

  let angleDifference = Math.abs(ambulanceHeading - bearingToVehicle);

  if (angleDifference > 180) {
    angleDifference = 360 - angleDifference;
  }

  return angleDifference < 90;
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
      label: "At driver's exact location",
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

router.get("/vehicles", (req, res) => {
  res.json(vehicles);
});

router.get("/vehicle/:vehicleId", (req, res) => {
  const vehicle = vehicles.find(
    (v) => v.vehicleId === req.params.vehicleId
  );

  if (!vehicle) {
    return res.status(404).json({
      message: "Vehicle not found",
    });
  }

  res.json(vehicle);
});

router.post("/update", async (req, res) => {
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

    const previousVehicle = vehicles.find(
      (v) => v.vehicleId === vehicleId
    );

    const explicitHeading =
      heading !== undefined && heading !== null && heading !== ""
        ? Number(heading)
        : null;

    const computedHeading =
      explicitHeading !== null
        ? explicitHeading
        : previousVehicle
        ? calculateBearing(
            previousVehicle.latitude,
            previousVehicle.longitude,
            lat,
            lng
          )
        : null;

    const updatedVehicle = {
      vehicleId,
      latitude: lat,
      longitude: lng,
      speed: Number(speed || 0),
      heading: computedHeading,
      updatedAt: new Date(),
    };

    const index = vehicles.findIndex((v) => v.vehicleId === vehicleId);

    if (index !== -1) {
      vehicles[index] = updatedVehicle;
    } else {
      vehicles.push(updatedVehicle);
    }

    req.app.locals.trackedVehicles = vehicles;

    const io = req.app.get("io");

    // update database for ambulance active trip
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

      // check nearby normal vehicles
      for (const vehicle of vehicles) {
        if (vehicle.vehicleId.startsWith("AMB")) continue;

        const distance = calculateDistance(
          lat,
          lng,
          vehicle.latitude,
          vehicle.longitude
        );

        const vehicleAhead = isVehicleAhead(
          lat,
          lng,
          updatedVehicle.heading,
          vehicle.latitude,
          vehicle.longitude
        );

        if (distance <= 1 && vehicleAhead) {
          const warningState = getDriverWarningState(
            Number(distance.toFixed(2)),
            vehicleAhead,
            true
          );

          const warningPayload = {
            vehicleId: vehicle.vehicleId,
            ambulanceId: vehicleId,
            ambulanceLatitude: lat,
            ambulanceLongitude: lng,
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
            console.log("Firebase warning write error:", fbError.message);
          }
        } else {
          io.emit("clearAmbulanceWarning", {
            vehicleId: vehicle.vehicleId,
            ambulanceId: vehicleId,
          });

          try {
            await rtdb.ref(`driverWarnings/${vehicle.vehicleId}`).remove();
          } catch (fbError) {
            console.log("Firebase warning clear error:", fbError.message);
          }
        }
      }
    }

    io.emit("gpsUpdate", updatedVehicle);

    // --- Firebase Realtime Database: store the latest location ---
    try {
      await rtdb.ref(`liveLocations/${vehicleId}`).set({
        vehicleId,
        latitude: lat,
        longitude: lng,
        speed: Number(speed || 0),
        heading: updatedVehicle.heading,
        updatedAt: new Date().toISOString(),
      });
    } catch (fbError) {
      console.log("Firebase RTDB write error (gpsRoutes update):", fbError.message);
    }

    res.json({
      message: "GPS updated",
      vehicle: updatedVehicle,
    });
  } catch (error) {
    console.error("GPS update error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
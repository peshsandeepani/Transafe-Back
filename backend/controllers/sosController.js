const { PrismaClient } = require("@prisma/client");
const { firestore, FieldValue } = require("../config/firebaseAdmin");
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

const createSOS = async (req, res) => {
  try {
    const { latitude, longitude, senderName, senderRole, vehicleId } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        message: "Latitude and longitude are required",
      });
    }

    const sos = await prisma.sOSAlert.create({
      data: {
        latitude: Number(latitude),
        longitude: Number(longitude),
        senderName,
        senderRole,
        vehicleId: vehicleId || null,
        status: "Active",
        userId: req.user.id,
      },
    });

    const io = req.app.get("io");

    // Main admin receives all SOS alerts
    io.emit("newSOSAlertAdmin", sos);

    // Nearby hospitals within 10 km
    const hospitals = await prisma.hospital.findMany();
    const nearbyHospitals = [];

    for (const hospital of hospitals) {
      if (hospital.latitude == null || hospital.longitude == null) continue;

      const distance = calculateDistanceKm(
        Number(latitude),
        Number(longitude),
        Number(hospital.latitude),
        Number(hospital.longitude)
      );

      if (distance <= 10) {
        nearbyHospitals.push({
          hospitalId: hospital.id,
          hospitalName: hospital.name,
          distance: Number(distance.toFixed(2)),
        });

        io.emit("nearbyHospitalSOSAlert", {
          ...sos,
          hospitalId: hospital.id,
          hospitalName: hospital.name,
          distance: Number(distance.toFixed(2)),
        });
      }
    }

    // Nearby police stations within 10 km
    const policeDepartments = await prisma.policeDepartment.findMany();
    const nearbyPoliceDepartments = [];

    for (const police of policeDepartments) {
      if (police.latitude == null || police.longitude == null) continue;

      const distance = calculateDistanceKm(
        Number(latitude),
        Number(longitude),
        Number(police.latitude),
        Number(police.longitude)
      );

      if (distance <= 10) {
        nearbyPoliceDepartments.push({
          policeDepartmentId: police.id,
          policeStationName: police.stationName,
          distance: Number(distance.toFixed(2)),
        });

        io.emit("nearbyPoliceSOSAlert", {
          ...sos,
          policeDepartmentId: police.id,
          policeStationName: police.stationName,
          distance: Number(distance.toFixed(2)),
          title: "🆘 Nearby SOS Emergency",
          message: `${senderName || "A user"} needs emergency help nearby.`,
        });
      }
    }

    // --- Firebase: write one live document covering everything above ---
    try {
      await firestore
        .collection("liveSOSAlerts")
        .doc(String(sos.id))
        .set({
          ...sos,
          senderPhone: req.user.phone || null,
          nearbyHospitals,
          nearbyPoliceDepartments,
          sharedWith: [],
          createdAtServer: FieldValue.serverTimestamp(),
        });
    } catch (fbError) {
      console.log("Firestore write error (createSOS):", fbError.message);
    }

    res.status(201).json({
      message: "SOS alert created successfully",
      sos,
    });
  } catch (error) {
    console.log("Create SOS error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const getSOSAlerts = async (req, res) => {
  try {
    const alerts = await prisma.sOSAlert.findMany({
      orderBy: {
        id: "desc",
      },
    });

    res.json(alerts);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const shareSOSAlert = async (req, res) => {
  try {
    const { sosId, driverId } = req.body;

    if (!sosId || !driverId) {
      return res.status(400).json({
        error: "SOS ID and Driver ID are required",
      });
    }

    const sos = await prisma.sOSAlert.findUnique({
      where: {
        id: Number(sosId),
      },
    });

    if (!sos) {
      return res.status(404).json({
        error: "SOS alert not found",
      });
    }

    if (req.user.role !== "hospital_admin") {
      return res.status(403).json({
        error: "Only hospital admins can share SOS alerts",
      });
    }

    const driver = await prisma.user.findUnique({
      where: {
        id: Number(driverId),
      },
    });

    if (!driver || driver.hospitalId !== req.user.hospitalId) {
      return res.status(403).json({
        error: "Driver does not belong to your hospital",
      });
    }

    let updatedSharedWith = [];

    try {
      updatedSharedWith = Array.isArray(sos.sharedWith)
        ? sos.sharedWith
        : JSON.parse(sos.sharedWith || "[]");
    } catch (e) {
      updatedSharedWith = [];
    }

    if (!updatedSharedWith.includes(Number(driverId))) {
      updatedSharedWith.push(Number(driverId));
    }

    const updatedSOS = await prisma.sOSAlert.update({
      where: {
        id: Number(sosId),
      },
      data: {
        sharedWith: updatedSharedWith,
      },
    });

    const sosCreator = await prisma.user.findUnique({
      where: {
        id: sos.userId,
      },
      select: {
        name: true,
        phone: true,
      },
    });

    const hospital = await prisma.hospital.findUnique({
      where: {
        id: req.user.hospitalId,
      },
    });

    const io = req.app.get("io");

    io.emit("sosAlertShared", {
      sosId: sos.id,
      sosAlert: updatedSOS,
      hospitalName: hospital?.name || "Hospital",
      senderName: sosCreator?.name || "Unknown",
      senderPhone: sosCreator?.phone || "Not provided",
      driverId: driver.id,
      driverName: driver.name,
    });

    // --- Firebase: update the same live document with the share info ---
    try {
      await firestore
        .collection("liveSOSAlerts")
        .doc(String(sos.id))
        .set(
          {
            ...updatedSOS,
            sharedWith: updatedSharedWith,
            lastSharedWith: {
              driverId: driver.id,
              driverName: driver.name,
              hospitalName: hospital?.name || "Hospital",
              senderName: sosCreator?.name || "Unknown",
              senderPhone: sosCreator?.phone || "Not provided",
              sharedAtServer: FieldValue.serverTimestamp(),
            },
          },
          { merge: true }
        );
    } catch (fbError) {
      console.log("Firestore write error (shareSOSAlert):", fbError.message);
    }

    res.json({
      message: "SOS alert shared successfully",
      sos: updatedSOS,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const resolveSOSAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const sos = await prisma.sOSAlert.update({
      where: {
        id: Number(id),
      },
      data: {
        status: "Resolved",
      },
    });

    const io = req.app.get("io");
    io.emit("sosAlertResolved", {
      id: sos.id,
      status: sos.status,
    });

    try {
      await firestore
        .collection("liveSOSAlerts")
        .doc(String(sos.id))
        .set(
          {
            status: "Resolved",
            resolvedAtServer: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    } catch (fbError) {
      console.log("Firestore write error (resolveSOSAlert):", fbError.message);
    }

    res.json({
      message: "SOS alert resolved successfully",
      sos,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: error.message,
    });
  }
};

module.exports = {
  createSOS,
  getSOSAlerts,
  shareSOSAlert,
  resolveSOSAlert,
};
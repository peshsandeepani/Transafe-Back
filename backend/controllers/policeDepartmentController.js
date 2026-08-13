const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const { firestore, FieldValue } = require("../config/firebaseAdmin");

const prisma = new PrismaClient();

const createPoliceDepartment = async (req, res) => {
  try {
    const {
      stationName,
      stationCode,
      division,
      address,
      phone,
      emergencyNumber,
      officerInCharge,
      email,
      latitude,
      longitude,
      district,
      province,
      adminName,
      adminEmail,
      adminPassword,
    } = req.body;

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const existingStation = await prisma.policeDepartment.findUnique({
  where: {
    stationCode,
  },
});

if (existingStation) {
  return res.status(400).json({
    error: "This police station code already exists. Please use another station code.",
  });
}

    const policeDepartment = await prisma.policeDepartment.create({
      data: {
        stationName,
        stationCode,
        division,
        address,
        phone,
        emergencyNumber,
        officerInCharge,
        email,
        latitude: Number(latitude),
        longitude: Number(longitude),
        district,
        province,
      },
    });
    

    const policeAdmin = await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: "police_admin",
        policeDepartmentId: policeDepartment.id,
      },
    });

    res.status(201).json({
      message: "Police department and police admin created successfully",
      policeDepartment,
      policeAdmin,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

const getPoliceDepartments = async (req, res) => {
  try {
    if (req.user?.role === "police_admin") {
      if (!req.user?.policeDepartmentId) {
        return res.status(400).json({
          error:
            "Police administrator account not assigned to any police station.",
        });
      }

      const department = await prisma.policeDepartment.findUnique({
        where: { id: req.user.policeDepartmentId },
      });

      if (!department) {
        return res.status(404).json({
          error: "Police station assignment not found in the system",
        });
      }

      return res.json([department]);
    }

    const departments = await prisma.policeDepartment.findMany({
      orderBy: { id: "desc" },
    });

    res.json(departments);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

const createPoliceOfficer = async (req, res) => {
  try {
    const {
      officerName,
      officerEmail,
      officerPassword,
      licenseNumber,
    } = req.body;

    if (!req.user.policeDepartmentId) {
      return res.status(403).json({
        error: "Police admin must belong to a police department",
      });
    }

    const hashedPassword = await bcrypt.hash(officerPassword, 10);

    const policeOfficer = await prisma.user.create({
      data: {
        name: officerName,
        email: officerEmail,
        password: hashedPassword,
        role: "police_officer",
        licenseNumber: licenseNumber || null,
        policeDepartmentId: req.user.policeDepartmentId,
      },
    });

    res.status(201).json({
      message: "Police officer registered successfully",
      officer: policeOfficer,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

const getPoliceOfficers = async (req, res) => {
  try {
    if (!req.user.policeDepartmentId) {
      return res.status(403).json({
        error: "Police admin must belong to a police department",
      });
    }

    const officers = await prisma.user.findMany({
      where: {
        role: "police_officer",
        policeDepartmentId: req.user.policeDepartmentId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        licenseNumber: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(officers);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

const updatePoliceOfficer = async (req, res) => {
  try {
    const { officerId } = req.params;
    const { officerName, licenseNumber } = req.body;

    if (!req.user.policeDepartmentId) {
      return res.status(403).json({
        error: "Police admin must belong to a police department",
      });
    }

    const officer = await prisma.user.findUnique({
      where: { id: Number(officerId) },
    });

    if (!officer || officer.policeDepartmentId !== req.user.policeDepartmentId) {
      return res.status(403).json({
        error: "You can only update officers in your department",
      });
    }

    const updatedOfficer = await prisma.user.update({
      where: { id: Number(officerId) },
      data: {
        name: officerName || officer.name,
        licenseNumber: licenseNumber || officer.licenseNumber,
      },
      select: {
        id: true,
        name: true,
        email: true,
        licenseNumber: true,
        createdAt: true,
      },
    });

    res.json({
      message: "Officer updated successfully",
      officer: updatedOfficer,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

const deletePoliceOfficer = async (req, res) => {
  try {
    const { officerId } = req.params;

    if (!req.user.policeDepartmentId) {
      return res.status(403).json({
        error: "Police admin must belong to a police department",
      });
    }

    const officer = await prisma.user.findUnique({
      where: { id: Number(officerId) },
    });

    if (!officer || officer.policeDepartmentId !== req.user.policeDepartmentId) {
      return res.status(403).json({
        error: "You can only delete officers in your department",
      });
    }

    await prisma.user.delete({
      where: { id: Number(officerId) },
    });

    res.json({ message: "Officer deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

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

const getNearbyIncidentsForPolice = async (req, res) => {
  try {
    const { radius = 10 } = req.body;

    if (!req.user.policeDepartmentId) {
      return res.status(403).json({
        error: "Police admin must belong to a police department",
      });
    }

    const policeDept = await prisma.policeDepartment.findUnique({
      where: { id: req.user.policeDepartmentId },
    });

    if (!policeDept) {
      return res.status(404).json({
        error: "Police department not found",
      });
    }

   const allIncidents = await prisma.roadIncident.findMany({
  where: {
    status: {
     in: ["Active", "Responding", "Hospital Responding", "Police Responding"],
    
    },
  },
  orderBy: { createdAt: "desc" },
});

    const nearbyIncidents = allIncidents
      .map((incident) => {
        const distance = calculateDistanceKm(
          policeDept.latitude,
          policeDept.longitude,
          incident.latitude,
          incident.longitude
        );

        return {
          ...incident,
          distance: parseFloat(distance.toFixed(2)),
        };
      })
      .filter((incident) => incident.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    res.json({
      message: `Found ${nearbyIncidents.length} incidents within ${radius}km`,
      incidents: nearbyIncidents,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

const getNearbySOSAlertsForPolice = async (req, res) => {
  try {
    const { radius = 10 } = req.body;

    if (!req.user.policeDepartmentId) {
      return res.status(403).json({
        error: "Police admin must belong to a police department",
      });
    }

    const policeDept = await prisma.policeDepartment.findUnique({
      where: { id: req.user.policeDepartmentId },
    });

    if (!policeDept) {
      return res.status(404).json({
        error: "Police department not found",
      });
    }

    const allAlerts = await prisma.sOSAlert.findMany({
      where: { status: "Active" },
      orderBy: { createdAt: "desc" },
    });

    const nearbyAlerts = allAlerts
      .map((alert) => {
        const distance = calculateDistanceKm(
          policeDept.latitude,
          policeDept.longitude,
          alert.latitude,
          alert.longitude
        );

        return {
          ...alert,
          distance: parseFloat(distance.toFixed(2)),
        };
      })
      .filter((alert) => alert.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    res.json({
      message: `Found ${nearbyAlerts.length} SOS alerts within ${radius}km`,
      alerts: nearbyAlerts,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

const policeRespondToIncident = async (req, res) => {
  try {
    const { incidentId } = req.body;

    if (!incidentId) {
      return res.status(400).json({
        error: "incidentId is required",
      });
    }

    if (!req.user?.policeDepartmentId) {
      return res.status(403).json({
        error: "Police admin must belong to a police department",
      });
    }

    const incident = await prisma.roadIncident.findUnique({
      where: { id: Number(incidentId) },
    });

    if (!incident) {
      return res.status(404).json({
        error: "Road incident not found",
      });
    }

    const policeDept = await prisma.policeDepartment.findUnique({
      where: { id: req.user.policeDepartmentId },
    });

    const updatedIncident = await prisma.roadIncident.update({
      where: { id: Number(incidentId) },
      data: {
        respondingDriverId: req.user.policeDepartmentId,
        respondingDriverName: policeDept?.stationName || "Police Station",
       status: "Police Responding",
      },
    });

    const policeOfficers = await prisma.user.findMany({
      where: {
        policeDepartmentId: req.user.policeDepartmentId,
        role: "police_officer",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });

    const io = req.app.get("io");

    const reporterId = incident.reportedBy || incident.userId || incident.reporterId;

    if (io && reporterId) {
      io.emit("incidentNotification", {
        userId: reporterId,
        type: "Police Response",
        title: "🚔 Police Response",
        message: `🚔 Noted: ${
          policeDept?.stationName || "Police"
        } is responding to your road incident report.`,
        incidentId: incident.id,
        status: "Responding",
      });

      io.emit("roadIncidentPoliceResponse", {
        userId: reporterId,
        incidentId: incident.id,
        message: `🚔 Noted: ${
          policeDept?.stationName || "Police"
        } is responding to your road incident report.`,
      status: "Police Responding",
      });
    }

    if (io) {
      io.emit("policeIncidentResponse", {
        incidentId: incident.id,
        incident: updatedIncident,
        policeDepartmentId: req.user.policeDepartmentId,
        policeDepartmentName: policeDept?.stationName || "Police Station",
        message: `🚔 ${
          policeDept?.stationName || "Police"
        } is responding to incident`,
      });
    }

    // --- Firebase: update the live road incident document with police response ---
    try {
      await firestore
        .collection("liveRoadIncidents")
        .doc(String(incident.id))
        .set(
          {
            ...updatedIncident,
            policeResponding: {
              policeDepartmentId: req.user.policeDepartmentId,
              policeDepartmentName: policeDept?.stationName || "Police Station",
              respondedAtServer: FieldValue.serverTimestamp(),
            },
          },
          { merge: true }
        );
    } catch (fbError) {
      console.log("Firestore write error (policeRespondToIncident):", fbError.message);
    }

    res.status(200).json({
      message: "Police marked as responding to incident",
      incident: updatedIncident,
      officers: policeOfficers,
      notification: {
        sent: !!reporterId,
        userId: reporterId || null,
        message: "Notification sent to incident reporter",
      },
    });
  } catch (error) {
    console.log("Police respond incident error:", error);
    res.status(500).json({ error: error.message });
  }
};

const policeRespondToSOSAlert = async (req, res) => {
  try {
    const { sosId } = req.body;

    if (!sosId) {
      return res.status(400).json({
        error: "sosId is required",
      });
    }

    const sosAlert = await prisma.sOSAlert.findUnique({
      where: { id: Number(sosId) },
    });

    if (!sosAlert) {
      return res.status(404).json({
        error: "SOS alert not found",
      });
    }

    const policeDept = await prisma.policeDepartment.findUnique({
      where: { id: req.user.policeDepartmentId },
    });

    let respondingUnits = [];

    try {
      respondingUnits = Array.isArray(sosAlert.sharedWith)
        ? sosAlert.sharedWith
        : JSON.parse(sosAlert.sharedWith || "[]");
    } catch (e) {
      respondingUnits = [];
    }

    if (!respondingUnits.includes(req.user.policeDepartmentId)) {
      respondingUnits.push(req.user.policeDepartmentId);
    }

    const updatedSOS = await prisma.sOSAlert.update({
      where: { id: Number(sosId) },
      data: {
        sharedWith: respondingUnits,
      },
    });

    const io = req.app.get("io");

    const sosCreator = await prisma.user.findUnique({
      where: { id: sosAlert.userId },
      select: { name: true, phone: true },
    });

    const policeOfficers = await prisma.user.findMany({
      where: { policeDepartmentId: req.user.policeDepartmentId },
      select: { id: true, name: true, email: true, phone: true },
    });

    io.emit("sosNotification", {
      userId: sosAlert.userId,
      type: "Police Response",
      message: `🚔 Noted: ${
        policeDept?.stationName || "Police"
      } has noted your SOS alert`,
      sosId: sosAlert.id,
      status: "Police responding",
    });

    try {
      await firestore.collection("userNotifications").add({
        userId: sosAlert.userId,
        title: "🚔 Police Response",
        message: `🚔 Noted: ${policeDept?.stationName || "Police"} has noted your SOS alert.`,
        sosId: sosAlert.id,
        type: "Police Response",
        status: "Police responding",
        createdAtServer: FieldValue.serverTimestamp(),
      });
    } catch (fbError) {
      console.log("Firestore write error (policeRespondToSOSAlert):", fbError.message);
    }

    io.emit("policeSOSResponse", {
      sosId: sosAlert.id,
      sosAlert: updatedSOS,
      policeDepartmentId: req.user.policeDepartmentId,
      policeDepartmentName: policeDept?.stationName || "Police Station",
      senderName: sosCreator?.name || "Unknown",
      senderPhone: sosCreator?.phone || "Not provided",
      message: `🚔 ${
        policeDept?.stationName || "Police"
      } is responding to your SOS`,
    });

    // --- Firebase: update the live SOS alert document with police response ---
    try {
      await firestore
        .collection("liveSOSAlerts")
        .doc(String(sosAlert.id))
        .set(
          {
            ...updatedSOS,
            sharedWith: respondingUnits,
            policeResponding: {
              policeDepartmentId: req.user.policeDepartmentId,
              policeDepartmentName: policeDept?.stationName || "Police Station",
              respondedAtServer: FieldValue.serverTimestamp(),
            },
          },
          { merge: true }
        );
    } catch (fbError) {
      console.log("Firestore write error (policeRespondToSOSAlert):", fbError.message);
    }

    res.status(200).json({
      message: "Police marked as responding to SOS alert",
      sosAlert: updatedSOS,
      officers: policeOfficers,
      notification: {
        sent: true,
        message: "Notification sent to SOS alert sender",
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

const assignPoliceAdminToDepartment = async (req, res) => {
  try {
    const { policeAdminEmail, policeDepartmentId } = req.body;

    if (!policeAdminEmail || !policeDepartmentId) {
      return res.status(400).json({
        error: "Police admin email and department ID are required",
      });
    }

    const department = await prisma.policeDepartment.findUnique({
      where: { id: Number(policeDepartmentId) },
    });

    if (!department) {
      return res.status(404).json({
        error: "Police department not found",
      });
    }

    const policeAdmin = await prisma.user.findUnique({
      where: { email: policeAdminEmail },
    });

    if (!policeAdmin) {
      return res.status(404).json({
        error: "Police administrator user not found",
      });
    }

    if (policeAdmin.role !== "police_admin") {
      return res.status(400).json({
        error: "User is not a police administrator",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: policeAdmin.id },
      data: { policeDepartmentId: Number(policeDepartmentId) },
    });

    res.status(200).json({
      message: "Police administrator assigned to department successfully",
      user: updatedUser,
      department,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

const shareIncidentWithOfficers = async (req, res) => {
  try {
    const { incidentId, officerIds } = req.body;

    if (!incidentId || !officerIds || !Array.isArray(officerIds)) {
      return res.status(400).json({
        error: "incidentId and officerIds array are required",
      });
    }

    const incident = await prisma.roadIncident.findUnique({
      where: { id: Number(incidentId) },
    });

    if (!incident) {
      return res.status(404).json({
        error: "Incident not found",
      });
    }

    const io = req.app.get("io");

    const policeDept = await prisma.policeDepartment.findUnique({
      where: { id: req.user.policeDepartmentId },
    });

    for (const officerId of officerIds) {
      const officer = await prisma.user.findUnique({
        where: { id: Number(officerId) },
        select: { name: true, email: true, phone: true },
      });

      if (officer) {
        io.emit("officerNotification", {
          officerId: Number(officerId),
          type: "New Incident Alert",
          message: `📍 New incident nearby from ${
            policeDept?.stationName || "Police"
          }`,
          incidentId: incident.id,
          incidentType: incident.type,
          location: incident.locationName,
          latitude: incident.latitude,
          longitude: incident.longitude,
        });

        // --- Firebase: write officer notification ---
        try {
          const notificationId = `${Date.now()}_${officerId}`;
          await firestore
            .collection("policeOfficerNotifications")
            .doc(notificationId)
            .set({
              officerId: Number(officerId),
              type: "New Incident Alert",
              message: `📍 New incident nearby from ${policeDept?.stationName || "Police"}`,
              incidentId: incident.id,
              incidentType: incident.type,
              location: incident.locationName,
              latitude: incident.latitude,
              longitude: incident.longitude,
              read: false,
              createdAtServer: FieldValue.serverTimestamp(),
            });
        } catch (fbError) {
          console.log("Firestore write error (shareIncidentWithOfficers):", fbError.message);
        }
      }
    }

    res.status(200).json({
      message: "Incident shared with officers successfully",
      incidentId,
      sharedWithCount: officerIds.length,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

const shareSOSWithOfficers = async (req, res) => {
  try {
    const { sosId, officerIds } = req.body;

    if (!sosId || !officerIds || !Array.isArray(officerIds)) {
      return res.status(400).json({
        error: "sosId and officerIds array are required",
      });
    }

    const sosAlert = await prisma.sOSAlert.findUnique({
      where: { id: Number(sosId) },
    });

    if (!sosAlert) {
      return res.status(404).json({
        error: "SOS alert not found",
      });
    }

    const io = req.app.get("io");

    const policeDept = await prisma.policeDepartment.findUnique({
      where: { id: req.user.policeDepartmentId },
    });

    for (const officerId of officerIds) {
      const officer = await prisma.user.findUnique({
        where: { id: Number(officerId) },
        select: { name: true, email: true, phone: true },
      });

      if (officer) {
        io.emit("officerNotification", {
          officerId: Number(officerId),
          type: "SOS Alert",
          message: `🆘 SOS alert from ${
            sosAlert.senderName
          } - ${policeDept?.stationName || "Police"} responding`,
          sosId: sosAlert.id,
          senderName: sosAlert.senderName,
          latitude: sosAlert.latitude,
          longitude: sosAlert.longitude,
        });

        // --- Firebase: write officer notification ---
        try {
          const notificationId = `${Date.now()}_${officerId}`;
          await firestore
            .collection("policeOfficerNotifications")
            .doc(notificationId)
            .set({
              officerId: Number(officerId),
              type: "SOS Alert",
              message: `🆘 SOS alert from ${sosAlert.senderName} - ${policeDept?.stationName || "Police"} responding`,
              sosId: sosAlert.id,
              senderName: sosAlert.senderName,
              latitude: sosAlert.latitude,
              longitude: sosAlert.longitude,
              read: false,
              createdAtServer: FieldValue.serverTimestamp(),
            });
        } catch (fbError) {
          console.log("Firestore write error (shareSOSWithOfficers):", fbError.message);
        }
      }
    }

    res.status(200).json({
      message: "SOS alert shared with officers successfully",
      sosId,
      sharedWithCount: officerIds.length,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createPoliceDepartment,
  getPoliceDepartments,
  createPoliceOfficer,
  getPoliceOfficers,
  updatePoliceOfficer,
  deletePoliceOfficer,
  getNearbyIncidentsForPolice,
  getNearbySOSAlertsForPolice,
  policeRespondToIncident,
  policeRespondToSOSAlert,
  assignPoliceAdminToDepartment,
  shareIncidentWithOfficers,
  shareSOSWithOfficers,
};
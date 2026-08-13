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

const createIncident = async (req, res) => {
  try {
    const { type, description, latitude, longitude, locationName } = req.body;

    const imageUrl = req.file
      ? `/uploads/incidents/${req.file.filename}`
      : null;

    const incident = await prisma.roadIncident.create({
      data: {
        type,
        description,
        latitude: Number(latitude),
        longitude: Number(longitude),
        locationName: locationName || "Location name not available",
        imageUrl,
        reportedBy: req.user.id,
        status: "Active",
      },
    });

    const io = req.app.get("io");
   

io.emit("nearbyPoliceRoadIncidentAlert", {
  policeDepartmentId: incident.policeDepartmentId,
  type: incident.type,
  description: incident.description,
  distance: incident.distance || "0.50",
  latitude: incident.latitude,
  longitude: incident.longitude,
});

    // Notify main admin / general incident listeners
    io.emit("newRoadIncident", incident);

    // Notify hospital admins
    io.emit("newRoadIncidentHospitalAlert", {
      id: incident.id,
      type: incident.type,
      description: incident.description,
      latitude: incident.latitude,
      longitude: incident.longitude,
      locationName: incident.locationName,
      imageUrl: incident.imageUrl,
      status: incident.status,
      message: `🚨 New road incident reported: ${incident.type}`,
    });

    // Notify nearby police stations within 10km
    const policeDepartments = await prisma.policeDepartment.findMany();

    for (const police of policeDepartments) {
      if (police.latitude == null || police.longitude == null) continue;

      const distance = calculateDistanceKm(
        Number(latitude),
        Number(longitude),
        Number(police.latitude),
        Number(police.longitude)
      );

      if (distance <= 10) {
        io.emit("nearbyPoliceRoadIncidentAlert", {
          ...incident,
          policeDepartmentId: police.id,
          policeStationName: police.stationName,
          distance: Number(distance.toFixed(2)),
        });

        console.log(
          `Road incident sent to nearby police station ${police.stationName} - ${distance.toFixed(2)} km`
        );
      }
    }

    // Notify nearby tracked vehicles within 5km
    const trackedVehicles = req.app.locals.trackedVehicles || [];

    trackedVehicles.forEach((vehicle) => {
      const distance = calculateDistanceKm(
        Number(latitude),
        Number(longitude),
        Number(vehicle.latitude),
        Number(vehicle.longitude)
      );

      if (distance <= 5) {
        io.emit("roadIncidentNearbyWarning", {
          vehicleId: vehicle.vehicleId,
          incidentId: incident.id,
          type: incident.type,
          description: incident.description,
          latitude: incident.latitude,
          longitude: incident.longitude,
          locationName: incident.locationName,
          imageUrl: incident.imageUrl,
          distance: distance.toFixed(2),
          message: `🚨 ${incident.type} reported nearby`,
        });

        console.log(
          `Road incident warning sent to ${vehicle.vehicleId} - ${distance.toFixed(2)} km`
        );
      }
    });

    // --- Firebase: write one live document covering everything above ---
    try {
      const nearbyHospitals = [];
      const nearbyPoliceDepartments = [];

      // Get nearby hospitals within 10km
      const hospitals = await prisma.hospital.findMany();
      for (const hospital of hospitals) {
        if (hospital.latitude == null || hospital.longitude == null) continue;
        const dist = calculateDistanceKm(
          Number(latitude),
          Number(longitude),
          Number(hospital.latitude),
          Number(hospital.longitude)
        );
        if (dist <= 10) {
          nearbyHospitals.push({
            hospitalId: hospital.id,
            hospitalName: hospital.name,
            distance: Number(dist.toFixed(2)),
          });
        }
      }

      // Get nearby police departments within 10km
      for (const police of policeDepartments) {
        if (police.latitude == null || police.longitude == null) continue;
        const dist = calculateDistanceKm(
          Number(latitude),
          Number(longitude),
          Number(police.latitude),
          Number(police.longitude)
        );
        if (dist <= 10) {
          nearbyPoliceDepartments.push({
            policeDepartmentId: police.id,
            policeStationName: police.stationName,
            distance: Number(dist.toFixed(2)),
          });
        }
      }

      await firestore
        .collection("liveRoadIncidents")
        .doc(String(incident.id))
        .set({
          ...incident,
          nearbyHospitals,
          nearbyPoliceDepartments,
          sharedWith: [],
          createdAtServer: FieldValue.serverTimestamp(),
        });
    } catch (fbError) {
      console.log("Firestore write error (createIncident):", fbError.message);
    }

    res.status(201).json({
      message: "Road incident reported",
      incident,
    });
  } catch (error) {
    console.log("Create incident error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};
const getIncidents = async (req, res) => {
  try {
    const incidents = await prisma.roadIncident.findMany({
      orderBy: {
        id: "desc",
      },
    });

    res.json(incidents);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const resolveIncident = async (req, res) => {
  try {
    const { id } = req.params;

    const incident = await prisma.roadIncident.update({
      where: {
        id: Number(id),
      },
      data: {
        status: "Resolved",
      },
    });

    res.json({
      message: "Incident resolved",
      incident,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const deleteIncident = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.roadIncident.delete({
      where: {
        id: Number(id),
      },
    });

    res.json({
      message: "Incident deleted",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: error.message,
    });
  }
};

// NEW: Get nearby road incidents within specified radius (default 10km)
const getNearbyIncidents = async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.body;

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        error: "Invalid latitude or longitude",
      });
    }

    // Get all active incidents
    const allIncidents = await prisma.roadIncident.findMany({
      where: {
  status: {
     in: ["Active", "Responding", "Hospital Responding", "Police Responding"],
  },

      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate distance and filter nearby incidents
    const nearbyIncidents = allIncidents
      .map((incident) => {
        const distance = calculateDistanceKm(lat, lon, incident.latitude, incident.longitude);
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

// NEW: Share road incident with specific driver
const shareRoadIncident = async (req, res) => {
  try {
    const { incidentId, driverId } = req.body;

    if (!incidentId || !driverId) {
      return res.status(400).json({
        error: "incidentId and driverId are required",
      });
    }

    const incident = await prisma.roadIncident.findUnique({
      where: {
        id: Number(incidentId),
      },
    });

    if (!incident) {
      return res.status(404).json({
        error: "Road incident not found",
      });
    }

    // Verify the driver exists
    const driver = await prisma.user.findUnique({
      where: {
        id: Number(driverId),
      },
    });

    if (!driver) {
      return res.status(404).json({
        error: "Driver not found",
      });
    }

    // Add driver ID to sharedWith array
    let updatedSharedWith = [];

    try {
      updatedSharedWith = Array.isArray(incident.sharedWith)
        ? incident.sharedWith
        : JSON.parse(incident.sharedWith || "[]");
    } catch (e) {
      updatedSharedWith = [];
    }

    if (!updatedSharedWith.includes(driverId)) {
      updatedSharedWith.push(driverId);
    }

    const updatedIncident = await prisma.roadIncident.update({
      where: {
        id: Number(incidentId),
      },
      data: {
        sharedWith: updatedSharedWith,
      },
    });

    const io = req.app.get("io");

    // Emit socket event to specific driver
    io.emit("incidentShared", {
      incidentId: incident.id,
      incident: updatedIncident,
      driverId: driver.id,
      driverName: driver.name,
      type: incident.type,
      description: incident.description,
    });

    // --- Firebase: update the same live document with share info ---
    try {
      await firestore
        .collection("liveRoadIncidents")
        .doc(String(incident.id))
        .set(
          {
            ...updatedIncident,
            sharedWith: updatedSharedWith,
            lastSharedWith: {
              driverId: driver.id,
              driverName: driver.name,
              sharedAtServer: FieldValue.serverTimestamp(),
            },
          },
          { merge: true }
        );
    } catch (fbError) {
      console.log("Firestore write error (shareRoadIncident):", fbError.message);
    }

    res.json({
      message: "Road incident shared successfully",
      incident: updatedIncident,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

// NEW: Driver responds to road incident
const respondToIncident = async (req, res) => {
  try {
    const { incidentId } = req.body;
    const driverId = req.user.id;
    const driverName = req.user.name;

    if (!incidentId) {
      return res.status(400).json({
        error: "incidentId is required",
      });
    }

    const incident = await prisma.roadIncident.findUnique({
      where: {
        id: Number(incidentId),
      },
    });

    if (!incident) {
      return res.status(404).json({
        error: "Road incident not found",
      });
    }

    // Update incident with responding driver info
    const updatedIncident = await prisma.roadIncident.update({
      where: {
        id: Number(incidentId),
      },
      data: {
        respondingDriverId: driverId,
        respondingDriverName: driverName,
      status: "Responding",
      },
    });

    const io = req.app.get("io");

    // Emit socket event that someone is responding
    io.emit("incidentResponse", {
      incidentId: incident.id,
      incident: updatedIncident,
      driverId: driverId,
      driverName: driverName,
      message: `${driverName} is responding to incident`,
    });

    // --- Firebase: update the live document with response info ---
    try {
      await firestore
        .collection("liveRoadIncidents")
        .doc(String(incident.id))
        .set(
          {
            ...updatedIncident,
            lastResponder: {
              driverId: driverId,
              driverName: driverName,
              respondedAtServer: FieldValue.serverTimestamp(),
            },
          },
          { merge: true }
        );
    } catch (fbError) {
      console.log("Firestore write error (respondToIncident):", fbError.message);
    }

    res.status(201).json({
      message: "Now responding to incident",
      incident: updatedIncident,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

// NEW: Resolve road incident (updated version with better validation)
const respondToIncidentAndResolve = async (req, res) => {
  try {
    const { incidentId } = req.body;
    const driverId = req.user.id;

    if (!incidentId) {
      return res.status(400).json({
        error: "incidentId is required",
      });
    }

    const incident = await prisma.roadIncident.findUnique({
      where: {
        id: Number(incidentId),
      },
    });

    if (!incident) {
      return res.status(404).json({
        error: "Road incident not found",
      });
    }

    // Only the responding driver can resolve
    if (incident.respondingDriverId !== driverId) {
      return res.status(403).json({
        error: "Only the responding driver can resolve this incident",
      });
    }

    const updatedIncident = await prisma.roadIncident.update({
      where: {
        id: Number(incidentId),
      },
      data: {
        status: "Resolved",
        respondingDriverId: null,
        respondingDriverName: null,
      },
    });

    const io = req.app.get("io");

    // Emit socket event that incident is resolved
    io.emit("incidentResolved", {
      incidentId: incident.id,
      incident: updatedIncident,
      message: `Incident ${incident.id} has been resolved`,
    });

    // --- Firebase: update the live document with resolved status ---
    try {
      await firestore
        .collection("liveRoadIncidents")
        .doc(String(incident.id))
        .set(
          {
            ...updatedIncident,
            resolvedAtServer: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    } catch (fbError) {
      console.log("Firestore write error (respondToIncidentAndResolve):", fbError.message);
    }

    res.json({
      message: "Road incident marked as resolved",
      incident: updatedIncident,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

// NEW: Hospital responds to road incident
const hospitalRespondToIncident = async (req, res) => {
  try {
    const incidentId = req.params.id;
    const hospitalId = req.user.hospitalId;

    if (!incidentId) {
      return res.status(400).json({
        error: "incidentId is required",
      });
    }

    if (req.user.role !== "hospital_admin") {
      return res.status(403).json({
        error: "Only hospital admins can respond to incidents",
      });
    }

    const incident = await prisma.roadIncident.findUnique({
      where: {
        id: Number(incidentId),
      },
    });

    if (!incident) {
      return res.status(404).json({
        error: "Road incident not found",
      });
    }

    const hospital = await prisma.hospital.findUnique({
      where: {
        id: hospitalId,
      },
    });

    const hospitalName =
      hospital?.name || req.user.hospitalName || "Hospital";

    const updatedIncident = await prisma.roadIncident.update({
      where: {
        id: Number(incidentId),
      },
      data: {
        respondingDriverId: hospitalId,
        respondingDriverName: hospitalName,
        status: "Hospital Responding",
      },
    });

    const io = req.app.get("io");

    io.emit("incidentHospitalResponse", {
      incidentId: incident.id,
      reporterId: incident.reportedBy,
      title: "🏥 Hospital Response",
      message: `🏥 Noted: ${hospitalName} is responding to your road incident report.`,
      status: "Hospital Responding",
      hospitalId,
      hospitalName,
      hospitalPhone: hospital?.phone || "Not provided",
      incident: updatedIncident,
    });

    try {
      if (incident.reportedBy) {
        await firestore.collection("userNotifications").add({
          userId: incident.reportedBy,
          title: "🏥 Hospital Response",
          message: `🏥 Noted: ${hospitalName} is responding to your road incident report.`,
          incidentId: incident.id,
          type: "Hospital Response",
          status: "Hospital Responding",
          createdAtServer: FieldValue.serverTimestamp(),
        });
      }
    } catch (fbError) {
      console.log("Firestore write error (hospitalRespondToIncident):", fbError.message);
    }

    io.emit("incidentHospitalResponding", {
      incidentId: incident.id,
      incident: updatedIncident,
      hospitalName,
      message: `${hospitalName} is responding to incident`,
    });

    // --- Firebase: update the live document with hospital response ---
    try {
      await firestore
        .collection("liveRoadIncidents")
        .doc(String(incident.id))
        .set(
          {
            ...updatedIncident,
            hospitalResponding: {
              hospitalId,
              hospitalName,
              hospitalPhone: hospital?.phone || "Not provided",
              respondedAtServer: FieldValue.serverTimestamp(),
            },
          },
          { merge: true }
        );
    } catch (fbError) {
      console.log("Firestore write error (hospitalRespondToIncident):", fbError.message);
    }

    res.status(200).json({
      message: "Hospital marked as responding",
      incident: updatedIncident,
      notification: {
        sent: true,
        reporterId: incident.reportedBy,
      },
    });
  } catch (error) {
    console.log("Hospital respond incident error:", error);
    res.status(500).json({ error: error.message });
  }
};

// NEW: Hospital shares incident with specific driver
const hospitalShareRoadIncident = async (req, res) => {
  try {
    const incidentId = req.params.id;
    const { driverId } = req.body;
    const hospitalId = req.user.hospitalId;

    if (!incidentId || !driverId) {
      return res.status(400).json({
        error: "Incident ID and Driver ID are required",
      });
    }

    // Verify user is hospital admin
    if (req.user.role !== "hospital_admin") {
      return res.status(403).json({
        error: "Only hospital admins can share incidents",
      });
    }

    const incident = await prisma.roadIncident.findUnique({
      where: {
        id: Number(incidentId),
      },
    });

    if (!incident) {
      return res.status(404).json({
        error: "Road incident not found",
      });
    }

    // Verify the driver belongs to the hospital
    const driver = await prisma.user.findUnique({
      where: {
        id: Number(driverId),
      },
    });

    if (!driver || driver.hospitalId !== hospitalId) {
      return res.status(403).json({
        error: "Driver does not belong to your hospital",
      });
    }

    // Add driver ID to sharedWith array if not already present
    let updatedSharedWith = [];
    
    try {
      updatedSharedWith = Array.isArray(incident.sharedWith) 
        ? incident.sharedWith 
        : JSON.parse(incident.sharedWith || "[]");
    } catch (e) {
      updatedSharedWith = [];
    }

    if (!updatedSharedWith.includes(driverId)) {
      updatedSharedWith.push(driverId);
    }

    const updatedIncident = await prisma.roadIncident.update({
      where: {
        id: Number(incidentId),
      },
      data: {
        sharedWith: updatedSharedWith,
      },
    });

    const hospital = await prisma.hospital.findUnique({
      where: {
        id: hospitalId,
      },
    });

    const io = req.app.get("io");

    // Emit socket event to the specific driver
    io.emit("roadIncidentSharedWithDriver", {
      incidentId: incident.id,
      incident: updatedIncident,
      driverId: driver.id,
      driverName: driver.name,
      hospitalName: hospital?.name || "Hospital",
      hospitalPhone: hospital?.phone || "Not provided",
      type: incident.type,
      description: incident.description,
      location: incident.locationName,
      distance: incident.distance,
      imageUrl: incident.imageUrl,
      message: `🚨 ${hospital?.name || "Hospital"} shared a road incident with you`,
    });

    // --- Firebase: update the live document with hospital share info ---
    try {
      await firestore
        .collection("liveRoadIncidents")
        .doc(String(incident.id))
        .set(
          {
            ...updatedIncident,
            sharedWith: updatedSharedWith,
            lastSharedBy: {
              hospitalId: hospitalId,
              hospitalName: hospital?.name || "Hospital",
              driverId: driver.id,
              driverName: driver.name,
              sharedAtServer: FieldValue.serverTimestamp(),
            },
          },
          { merge: true }
        );
    } catch (fbError) {
      console.log("Firestore write error (hospitalShareRoadIncident):", fbError.message);
    }

    console.log(`Road incident shared with driver ${driver.name}`);

    res.status(200).json({
      message: "Incident shared with driver successfully",
      incident: updatedIncident,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createIncident,
  getIncidents,
  resolveIncident,
  deleteIncident,
  getNearbyIncidents,
  shareRoadIncident,
  respondToIncident,
  respondToIncidentAndResolve,
  hospitalRespondToIncident,      // NEW
  hospitalShareRoadIncident,       // NEW
};
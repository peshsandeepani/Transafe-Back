const { PrismaClient } = require("@prisma/client");
const { firestore, FieldValue } = require("../config/firebaseAdmin");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

const createHospital = async (req, res) => {
  try {
    const {
      hospitalName,
      hospitalType,
      address,
      phone,
      email,
      latitude,
      longitude,
      adminEmail,
      adminPassword,
      registrationNumber,
      importantInfo,
    } = req.body;

    const hospital = await prisma.hospital.create({
      data: {
        name: hospitalName,
        type: hospitalType,
        address,
        phone,
        email,
        latitude: Number(latitude),
        longitude: Number(longitude),
        registrationNumber,
        importantInfo,
      },
    });
  
   

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const hospitalAdmin = await prisma.user.create({
      data: {
        name: `${hospitalName} Admin`,
        email: adminEmail,
        password: hashedPassword,
        role: "hospital_admin",
        hospitalId: hospital.id,
      },
    });

    res.status(201).json({
      message: "Hospital and hospital admin created",
      hospital,
      hospitalAdmin,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const getHospitals = async (req, res) => {
  try {
    const hospitals = await prisma.hospital.findMany({
      orderBy: {
        id: "desc",
      },
    });

    res.json(hospitals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMyHospital = async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId;

    if (!hospitalId) {
      return res.status(400).json({
        message: "Hospital ID not found for this user",
      });
    }

    const hospital = await prisma.hospital.findUnique({
      where: {
        id: Number(hospitalId),
      },
    });

    const ambulanceDrivers = await prisma.user.findMany({
      where: {
        hospitalId: Number(hospitalId),
        role: "ambulance_driver",
      },
      select: {
        id: true,
        name: true,
        email: true,
        assignedVehicleId: true,
        createdAt: true,
      },
    });

    res.json({
      hospital,
      ambulanceDrivers,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getHospitalById = async (req, res) => {
  try {
    const { hospitalId } = req.params;

    const hospital = await prisma.hospital.findUnique({
      where: {
        id: Number(hospitalId),
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        address: true,
        phone: true,
        email: true,
      },
    });

    if (!hospital) {
      return res.status(404).json({
        message: "Hospital not found",
      });
    }

    res.json(hospital);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createAmbulanceDriver = async (req, res) => {
  try {
    const {
      driverName,
      driverEmail,
      driverPassword,
      ambulanceNumber,
      gpsDeviceId,
    } = req.body;

    const hashedPassword = await bcrypt.hash(driverPassword, 10);

    const ambulanceDriver = await prisma.user.create({
      data: {
        name: driverName,
        email: driverEmail,
        password: hashedPassword,
        role: "ambulance_driver",
        assignedVehicleId: ambulanceNumber,
        hospitalId: req.user.hospitalId,
      },
    });

    await prisma.vehicle.create({
  data: {
    vehicleNumber: ambulanceNumber,
    type: "Ambulance",
    driverName,
    gpsDeviceId,
    status: "Active",
    hospitalId: req.user.hospitalId,
  },
});

    res.status(201).json({
      message: "Ambulance driver registered successfully",
      ambulanceDriver,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAmbulanceDrivers = async (req, res) => {
  try {
    const ambulanceDrivers = await prisma.user.findMany({
      where: {
        role: "ambulance_driver",
        hospitalId: req.user.hospitalId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        assignedVehicleId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(ambulanceDrivers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const getHospitalAmbulances = async (req, res) => {
  try {
    const { hospitalId } = req.params;

    const ambulanceDrivers = await prisma.user.findMany({
      where: {
        role: "ambulance_driver",
        hospitalId: Number(hospitalId),
      },
      select: {
        id: true,
        name: true,
        email: true,
        assignedVehicleId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(ambulanceDrivers);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};
const hospitalRespondToSOS = async (req, res) => {
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

    const hospital = await prisma.hospital.findUnique({
      where: { id: req.user.hospitalId },
    });

    const updatedSOS = await prisma.sOSAlert.update({
      where: { id: Number(sosId) },
      data: {
        status: "Responding",
      },
    });

    const io = req.app.get("io");

    io.emit("sosNotification", {
      userId: sosAlert.userId,
      type: "Hospital Response",
      title: "🏥 Hospital Response",
      message: `🏥 Noted: ${
        hospital?.name || "Hospital"
      } is responding to your SOS alert.`,
      sosId: sosAlert.id,
      status: "Responding",
    });

    try {
      await firestore
        .collection("liveSOSAlerts")
        .doc(String(sosAlert.id))
        .set(
          {
            status: "Responding",
            hospitalResponding: {
              hospitalId: hospital?.id,
              hospitalName: hospital?.name || "Hospital",
              hospitalPhone: hospital?.phone || "Not provided",
              respondedAtServer: FieldValue.serverTimestamp(),
            },
          },
          { merge: true }
        );

      await firestore.collection("userNotifications").add({
        userId: sosAlert.userId,
        title: "🏥 Hospital Response",
        message: `🏥 Noted: ${hospital?.name || "Hospital"} is responding to your SOS alert.`,
        sosId: sosAlert.id,
        type: "Hospital Response",
        status: "Responding",
        createdAtServer: FieldValue.serverTimestamp(),
      });
    } catch (fbError) {
      console.log("Firestore write error (hospitalRespondToSOS):", fbError.message);
    }

    res.status(200).json({
      message: "Hospital marked as responding to SOS",
      sosAlert: updatedSOS,
      notification: {
        sent: true,
        userId: sosAlert.userId,
      },
    });
  } catch (error) {
    console.log("Hospital respond SOS error:", error);
    res.status(500).json({ error: error.message });
  }
};
const getMyHospitalAmbulances = async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId;

    if (!hospitalId) {
      return res.status(400).json({
        message: "Hospital ID not found for this user",
      });
    }

    const ambulanceDrivers = await prisma.user.findMany({
      where: {
        role: "ambulance_driver",
        hospitalId: Number(hospitalId),
      },
      select: {
        id: true,
        name: true,
        email: true,
        assignedVehicleId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(ambulanceDrivers);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

module.exports = {
  createHospital,
  getHospitals,
  getMyHospital,
  getHospitalById,
  createAmbulanceDriver,
  getHospitalAmbulances,
  hospitalRespondToSOS,
  getAmbulanceDrivers,
  getMyHospitalAmbulances,
};
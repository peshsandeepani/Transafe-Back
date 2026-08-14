const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { auth } = require("../config/firebaseAdmin");

const prisma = new PrismaClient();

const normalizeRideVehicleType = (value) => {
  if (value === undefined || value === null) return null;

  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");

  const mapped = {
    tuk_tuk: "tuk_tuk",
    tuktuk: "tuk_tuk",
    bike: "bike",
    car: "car",
  };

  const finalValue = mapped[normalized] || normalized;

  if (!["tuk_tuk", "bike", "car"].includes(finalValue)) {
    throw new Error(
      `Invalid vehicle type: "${value}". Valid values are: tuk_tuk, bike, car`
    );
  }

  return finalValue;
};

const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      licenseNumber,
      hospitalId,
      vehicleNumber,
      vehicleType,
      gpsDeviceId,
      assignedVehicleId,
      becomeRideDriver,
      rideDriver,
    } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    const driverScopePayload = rideDriver || null;
    const wantRideDriver = Boolean(becomeRideDriver) || role === "driver" || role === "ambulance_driver";
    const finalRole = wantRideDriver ? "rider" : role;

    const isVehicleRole =
      role === "driver" || role === "ambulance_driver" || wantRideDriver;

    const finalVehicleNumber = vehicleNumber || assignedVehicleId || driverScopePayload?.vehicleNumber;
    const rawVehicleType = vehicleType || driverScopePayload?.vehicleType || null;
    const finalVehicleType = normalizeRideVehicleType(rawVehicleType);
    const finalLicenseNumber = licenseNumber || driverScopePayload?.licenseNumber || null;
    const finalPhone = phone || driverScopePayload?.phone || null;
    const finalGpsDeviceId = gpsDeviceId || driverScopePayload?.gpsDeviceId || null;
    const finalVehicleMake = driverScopePayload?.vehicleMake || null;
    const finalVehicleModel = driverScopePayload?.vehicleModel || null;

    if (wantRideDriver) {
      if (
        !finalPhone ||
        !finalLicenseNumber ||
        !finalVehicleNumber ||
        !finalVehicleType
      ) {
        return res.status(400).json({
          message: "Ride driver registration requires phone, licenseNumber, vehicleNumber, and vehicleType",
        });
      }
    }

    if (isVehicleRole) {
      if (
        !finalPhone ||
        !finalLicenseNumber ||
        !finalVehicleNumber ||
        !finalVehicleType ||
        !finalGpsDeviceId
      ) {
        return res.status(400).json({
          message: "Driver and vehicle information are required",
        });
      }

      const existingVehicle = await prisma.vehicle.findUnique({
        where: {
          vehicleNumber: finalVehicleNumber,
        },
      });

      if (existingVehicle) {
        return res.status(400).json({
          message: "Vehicle number already exists",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let user;

    await prisma.$transaction(async (tx) => {
      user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: finalRole,
          phone: isVehicleRole ? finalPhone : phone || null,
          licenseNumber: isVehicleRole
            ? finalLicenseNumber
            : licenseNumber || null,
          hospitalId: hospitalId ? Number(hospitalId) : null,
          assignedVehicleId: isVehicleRole ? finalVehicleNumber : null,
        },
      });

      if (wantRideDriver) {
        await tx.rideDriver.create({
          data: {
            userId: user.id,
            vehicleType: finalVehicleType,
            vehicleMake: finalVehicleMake,
            vehicleModel: finalVehicleModel,
            vehicleNumber: finalVehicleNumber,
            licenseNumber: finalLicenseNumber,
            isOnline: true,
          },
        });
      }

      if (isVehicleRole) {
        await tx.vehicle.create({
          data: {
            vehicleNumber: finalVehicleNumber,
            type: finalVehicleType,
            driverName: name,
            gpsDeviceId: finalGpsDeviceId,
            status: "Active",
            hospitalId: user.hospitalId ? Number(user.hospitalId) : undefined,
          },
        });
      }
    });

    const driverProfile = wantRideDriver
      ? await prisma.rideDriver.findUnique({
          where: {
            userId: user.id,
          },
        })
      : null;

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        hospitalId: user.hospitalId,
        policeDepartmentId: user.policeDepartmentId,
        assignedVehicleId: user.assignedVehicleId,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedVehicleId: user.assignedVehicleId,
        hospitalId: user.hospitalId,
        policeDepartmentId: user.policeDepartmentId,
        phone: user.phone,
        licenseNumber: user.licenseNumber,
        isRideDriver: Boolean(driverProfile),
        rideDriverProfile: driverProfile,
      },
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid password",
      });
    }

    let hospital = null;
    let policeDepartment = null;

    if (user.hospitalId) {
      hospital = await prisma.hospital.findUnique({
        where: {
          id: user.hospitalId,
        },
      });
    }

    if (user.policeDepartmentId) {
      policeDepartment = await prisma.policeDepartment.findUnique({
        where: {
          id: user.policeDepartmentId,
        },
      });
    }

    const driverProfile = await prisma.rideDriver.findUnique({
      where: {
        userId: user.id,
      },
    });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        hospitalId: user.hospitalId,
        policeDepartmentId: user.policeDepartmentId,
        assignedVehicleId: user.assignedVehicleId,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.status(200).json({
      message: "Login successful",
      token,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedVehicleId: user.assignedVehicleId,
        hospitalId: user.hospitalId,
        policeDepartmentId: user.policeDepartmentId,
        phone: user.phone,
        licenseNumber: user.licenseNumber,
        hospital,
        policeDepartment,
        isRideDriver: Boolean(driverProfile),
        rideDriverProfile: driverProfile,
      },
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { firebaseIdToken, idToken } = req.body;
    const firebaseToken = firebaseIdToken || idToken;

    if (!firebaseToken) {
      return res.status(400).json({
        message: "Firebase ID token is required",
      });
    }

    const decoded = await auth.verifyIdToken(firebaseToken);

    if (!decoded.email) {
      return res.status(400).json({
        message: "Google account did not return a verified email",
      });
    }

    let user = await prisma.user.findUnique({
      where: { email: decoded.email },
    });

    if (user && user.role !== "driver") {
      return res.status(403).json({
        message: "Google Sign-In is only available for driver accounts",
      });
    }

    if (!user) {
      const temporaryPassword = await bcrypt.hash(
        `${Date.now()}-${crypto.randomUUID()}`,
        10
      );

      user = await prisma.user.create({
        data: {
          name: decoded.name || decoded.email.split("@")[0],
          email: decoded.email,
          password: temporaryPassword,
          role: "driver",
          phone: null,
          licenseNumber: null,
          hospitalId: null,
          policeDepartmentId: null,
          assignedVehicleId: null,
        },
      });
    }

    let hospital = null;
    let policeDepartment = null;

    if (user.hospitalId) {
      hospital = await prisma.hospital.findUnique({
        where: {
          id: user.hospitalId,
        },
      });
    }

    if (user.policeDepartmentId) {
      policeDepartment = await prisma.policeDepartment.findUnique({
        where: {
          id: user.policeDepartmentId,
        },
      });
    }

    const driverProfile = await prisma.rideDriver.findUnique({
      where: {
        userId: user.id,
      },
    });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        hospitalId: user.hospitalId,
        policeDepartmentId: user.policeDepartmentId,
        assignedVehicleId: user.assignedVehicleId,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    return res.status(200).json({
      message: "Google login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedVehicleId: user.assignedVehicleId,
        hospitalId: user.hospitalId,
        policeDepartmentId: user.policeDepartmentId,
        phone: user.phone,
        licenseNumber: user.licenseNumber,
        hospital,
        policeDepartment,
        isRideDriver: Boolean(driverProfile),
        rideDriverProfile: driverProfile,
      },
    });
  } catch (error) {
    console.log(error);

    return res.status(401).json({
      message: "Google authentication failed",
      error: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  googleLogin,
};
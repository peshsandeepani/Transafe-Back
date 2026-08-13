const express = require("express");
const router = express.Router();

const {
  createHospital,
  getHospitals,
  getMyHospital,
  getHospitalById,
  getHospitalAmbulances,
  createAmbulanceDriver,
  getAmbulanceDrivers,
  getMyHospitalAmbulances,
  hospitalRespondToSOS,
} = require("../controllers/hospitalController");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

router.post("/", createHospital);

router.get("/", protect, authorizeRoles("admin"), getHospitals);

router.get(
  "/my-hospital",
  protect,
  authorizeRoles("hospital_admin"),
  getMyHospital
);

router.get(
  "/ambulance-drivers",
  protect,
  authorizeRoles("hospital_admin"),
  getAmbulanceDrivers
);

router.post(
  "/respond-sos",
  protect,
  authorizeRoles("hospital_admin"),
  hospitalRespondToSOS
);

router.post(
  "/ambulance-drivers",
  protect,
  authorizeRoles("hospital_admin"),
  createAmbulanceDriver
);

router.get(
  "/ambulances",
  protect,
  authorizeRoles("hospital_admin"),
  getMyHospitalAmbulances
);

router.get("/:hospitalId", protect, getHospitalById);

router.get(
  "/:hospitalId/ambulances",
  protect,
  authorizeRoles("admin"),
  getHospitalAmbulances
);

module.exports = router;
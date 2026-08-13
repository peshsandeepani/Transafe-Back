const express = require("express");
const router = express.Router();

const {
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
} = require("../controllers/policeDepartmentController");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// Admin-only creation endpoint
router.post("/", protect, authorizeRoles("admin"), createPoliceDepartment);

// Get departments (admin gets all, police_admin gets their own)
router.get("/", protect, authorizeRoles("admin", "police_admin"), getPoliceDepartments);

// Police Officer Management (police_admin only)
router.post(
  "/officers",
  protect,
  authorizeRoles("police_admin"),
  createPoliceOfficer
);

router.get(
  "/officers",
  protect,
  authorizeRoles("police_admin"),
  getPoliceOfficers
);

router.put(
  "/officers/:officerId",
  protect,
  authorizeRoles("police_admin"),
  updatePoliceOfficer
);

router.delete(
  "/officers/:officerId",
  protect,
  authorizeRoles("police_admin"),
  deletePoliceOfficer
);

// Get Nearby Incidents and SOS Alerts for Police
router.post(
  "/nearby-incidents",
  protect,
  authorizeRoles("police_admin"),
  getNearbyIncidentsForPolice
);

router.post(
  "/nearby-sos",
  protect,
  authorizeRoles("police_admin"),
  getNearbySOSAlertsForPolice
);

// Police Response to Incidents
router.post(
  "/respond-incident",
  protect,
  authorizeRoles("police_admin"),
  policeRespondToIncident
);

router.post(
  "/respond-sos",
  protect,
  authorizeRoles("police_admin"),
  policeRespondToSOSAlert
);

// Admin endpoint to assign police_admin to a department
router.post(
  "/assign-admin",
  protect,
  authorizeRoles("admin"),
  assignPoliceAdminToDepartment
);

// Share incident with police officers
router.post(
  "/share-incident",
  protect,
  authorizeRoles("police_admin"),
  shareIncidentWithOfficers
);

// Share SOS alert with police officers
router.post(
  "/share-sos",
  protect,
  authorizeRoles("police_admin"),
  shareSOSWithOfficers
);

module.exports = router;
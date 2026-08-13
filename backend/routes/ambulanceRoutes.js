const express = require("express");
const router = express.Router();

const {
  startTrip,
  getActiveTrips,
  updateLocation,
  endTrip,
  getCompletedTrips,
  getHospitalTripsSimple,
  completeAllTrips,
  deleteAllTrips,
} = require("../controllers/ambulanceController");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

router.post(
  "/start",
  protect,
  authorizeRoles("admin", "hospital_admin", "ambulance_driver"),
  startTrip
);

router.get(
  "/active",
  protect,
  authorizeRoles("admin", "hospital_admin", "ambulance_driver", "emergency_team"),
  getActiveTrips
);

router.get(
  "/completed",
  protect,
  authorizeRoles("admin", "hospital_admin", "ambulance_driver", "emergency_team"),
  getCompletedTrips
);

router.get(
  "/hospital/:hospitalId",
  protect,
  authorizeRoles("admin", "hospital_admin"),
  getHospitalTripsSimple
);

// Optional old route
router.put(
  "/:id/location",
  protect,
  authorizeRoles("admin", "hospital_admin", "ambulance_driver"),
  updateLocation
);

router.put(
  "/:id/end",
  protect,
  authorizeRoles("admin", "hospital_admin", "ambulance_driver"),
  endTrip
);

router.put(
  "/complete-all",
  protect,
  authorizeRoles("admin"),
  completeAllTrips
);

router.delete(
  "/all",
  protect,
  authorizeRoles("admin"),
  deleteAllTrips
);

module.exports = router;
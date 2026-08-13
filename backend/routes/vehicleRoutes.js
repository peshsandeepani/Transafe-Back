const express = require("express");
const router = express.Router();

const {
  createVehicle,
  getVehicles,
  updateVehicle,
  deleteVehicle,
} = require("../controllers/vehicleController");

const protect = require("../middleware/authMiddleware");

router.post("/", protect, createVehicle);
router.get("/", protect, getVehicles);
router.put("/:id", protect, updateVehicle);
router.delete("/:id", protect, deleteVehicle);

const authorizeRoles = require("../middleware/roleMiddleware");

router.post("/", protect, authorizeRoles("admin", "transport_manager"), createVehicle);
router.get("/", protect, authorizeRoles("admin", "transport_manager"), getVehicles);
router.put("/:id", protect, authorizeRoles("admin", "transport_manager"), updateVehicle);
router.delete("/:id", protect, authorizeRoles("admin"), deleteVehicle);

module.exports = router;
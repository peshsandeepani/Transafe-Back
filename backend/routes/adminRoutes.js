const express = require("express");
const router = express.Router();

const { getAdminStats } = require("../controllers/adminController");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

router.get("/stats", protect, authorizeRoles("admin"), getAdminStats);

module.exports = router;

const express = require("express");

const {
  createSOS,
  getSOSAlerts,
  shareSOSAlert,
  resolveSOSAlert,
} = require("../controllers/sosController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/create", protect, createSOS);
router.get("/", protect, getSOSAlerts);
router.post("/share", protect, shareSOSAlert);
router.put("/:id/resolved", protect, resolveSOSAlert);

module.exports = router;
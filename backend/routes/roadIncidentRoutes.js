const express = require("express");
const router = express.Router();

const multer = require("multer");
const path = require("path");

const {
  createIncident,
  getIncidents,
  resolveIncident,
  getNearbyIncidents,
  shareRoadIncident,
  respondToIncident,
  respondToIncidentAndResolve,
  hospitalRespondToIncident,      // NEW
  hospitalShareRoadIncident,       // NEW
} = require("../controllers/roadIncidentController");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../uploads/incidents");
    cb(null, dir);
  },

  filename: (req, file, cb) => {
    cb(
      null,
      Date.now() +
        "-" +
        Math.round(Math.random() * 1e9) +
        path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage });

router.get("/", protect, 
   authorizeRoles(
    "admin",
    "hospital_admin",
    "ambulance_driver",
    "driver",
    "police"
  ),
  getIncidents);

router.post(
  "/",
  protect,
   authorizeRoles(
    "admin",
    "hospital_admin",
    "ambulance_driver",
    "driver",
    "police"
  ),
  upload.single("image"),
  createIncident
);

router.put(
  "/:id/resolve",
  protect,
  resolveIncident
);

// NEW ROUTES FOR SHARING & RESPONSE SYSTEM

// Get nearby incidents within radius (10km default)
router.post(
  "/nearby",
  protect,
  getNearbyIncidents
);

// Share incident with specific driver
router.post(
  "/:id/share",
  protect,
  shareRoadIncident
);

// Driver responds to incident
router.post(
  "/:id/respond",
  protect,
  respondToIncident
);

// Driver marks incident as resolved
router.put(
  "/:id/resolved",
  protect,
  respondToIncidentAndResolve
);

// HOSPITAL ADMIN ROUTES

// Hospital responds to incident (sends notification to reporter)
router.post(
  "/:id/hospital-respond",
  protect,
  hospitalRespondToIncident
);

// Hospital shares incident with specific driver
router.post(
  "/:id/hospital-share",
  protect,
  authorizeRoles("hospital_admin"),
  hospitalShareRoadIncident
);

module.exports = router;
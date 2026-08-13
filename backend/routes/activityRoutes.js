const express = require("express");
const protect = require("../middleware/authMiddleware");
const { getMyActivities } = require("../controllers/activityController");

const router = express.Router();

router.get("/me", protect, getMyActivities);

module.exports = router;

const express = require("express");
const protect = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
  registerDriver,
  getDriverProfile,
  setDriverOnlineStatus,
  createRideRequest,
  getRideRequests,
  acceptRideRequest,
  declineRideRequest,
  updateRideStatus,
  completeRide,
  initPayHerePayment,
  payHereWebhook,
  rateRideRequest,
} = require("../controllers/rideController");

const router = express.Router();

// Legacy / current route family kept stable for existing screens.
router.post("/drivers/register", protect, registerDriver);
router.get("/drivers/me", protect, getDriverProfile);
router.patch("/drivers/online", protect, setDriverOnlineStatus);

router.post("/requests", protect, createRideRequest);
router.get("/requests", protect, getRideRequests);
router.patch("/requests/:id/accept", protect, acceptRideRequest);
router.patch("/requests/:id/decline", protect, declineRideRequest);
router.patch("/requests/:id/status", protect, updateRideStatus);
router.post("/requests/:id/complete", protect, completeRide);
router.post("/requests/:id/payhere", protect, initPayHerePayment);
router.post("/payhere/webhook", payHereWebhook);
router.post("/requests/:id/rate", protect, rateRideRequest);

// User-requested route aliases for the new ride-booking contract.
router.post("/register", protect, registerDriver);
router.patch("/status", protect, setDriverOnlineStatus);
router.post("/request", protect, createRideRequest);
router.get("/requests", protect, getRideRequests);
router.patch("/:id/accept", protect, acceptRideRequest);
router.patch("/:id/decline", protect, declineRideRequest);
router.patch("/:id/status", protect, updateRideStatus);
router.post("/:id/complete", protect, completeRide);
router.post("/:id/rate", protect, rateRideRequest);

module.exports = router;

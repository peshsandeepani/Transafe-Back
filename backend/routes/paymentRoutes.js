const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  getPaymentMethods,
  savePaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  getMyPayments,
  payHereWebhook,
} = require("../controllers/paymentController");

const router = express.Router();

// Protected routes (require authentication)
router.get("/methods", protect, getPaymentMethods);
router.post("/methods", protect, savePaymentMethod);
router.delete("/methods/:id", protect, deletePaymentMethod);
router.patch("/methods/:id/set-default", protect, setDefaultPaymentMethod);
router.get("/me", protect, getMyPayments);

// Webhook route (no auth, but must verify PayHere signature)
router.post("/webhook/payhere", payHereWebhook);

module.exports = router;

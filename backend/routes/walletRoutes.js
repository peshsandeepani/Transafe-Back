const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  getWallet,
  getTransactions,
  getBalance,
  getTransactionSummary,
} = require("../controllers/walletController");

const router = express.Router();

// All wallet routes require authentication
router.get("/", protect, getWallet);
router.get("/balance", protect, getBalance);
router.get("/transactions", protect, getTransactions);
router.post("/transactions/summary", protect, getTransactionSummary);

module.exports = router;

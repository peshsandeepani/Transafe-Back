const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  getSavedAddresses,
  createSavedAddress,
  updateSavedAddress,
  deleteSavedAddress,
} = require("../controllers/savedAddressController");

const router = express.Router();

router.get("/", protect, getSavedAddresses);
router.post("/", protect, createSavedAddress);
router.put("/:id", protect, updateSavedAddress);
router.delete("/:id", protect, deleteSavedAddress);

module.exports = router;

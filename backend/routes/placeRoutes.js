const express = require("express");
const { getPlaceSuggestions } = require("../controllers/placeController");

const router = express.Router();

router.get("/search", getPlaceSuggestions);

module.exports = router;

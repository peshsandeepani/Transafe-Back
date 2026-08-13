const express = require("express");
const router = express.Router();

const { register, login, googleLogin } = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleLogin);
router.post("/google-login", googleLogin);

router.get("/profile", protect, (req, res) => {
  res.json({
    message: "Protected profile route working",
    user: req.user,
  });
});

module.exports = router;
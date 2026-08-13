const express = require("express");
const router = express.Router();

const {
  createStudent,
  getMyStudents,
  updateStudent,
  deleteStudent,
} = require("../controllers/studentController");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

router.post("/", protect, authorizeRoles("user", "admin"), createStudent);
router.get("/my-children", protect, authorizeRoles("user", "admin"), getMyStudents);
router.put("/:id", protect, authorizeRoles("user", "admin"), updateStudent);
router.delete("/:id", protect, authorizeRoles("user", "admin"), deleteStudent);

module.exports = router;
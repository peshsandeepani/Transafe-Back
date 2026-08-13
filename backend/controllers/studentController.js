const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const createStudent = async (req, res) => {
  try {
    const { name, grade, school, busId } = req.body;

    const student = await prisma.student.create({
      data: {
        name,
        grade,
        school,
        busId,
        parentId: req.user.id,
      },
    });

    res.status(201).json({
      message: "Student added successfully",
      student,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMyStudents = async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      where: {
        parentId: req.user.id,
      },
      orderBy: {
        id: "desc",
      },
    });

    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, grade, school, busId } = req.body;

    const student = await prisma.student.update({
      where: {
        id: Number(id),
      },
      data: {
        name,
        grade,
        school,
        busId,
      },
    });

    res.json({
      message: "Student updated successfully",
      student,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.student.delete({
      where: {
        id: Number(id),
      },
    });

    res.json({
      message: "Student deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createStudent,
  getMyStudents,
  updateStudent,
  deleteStudent,
};
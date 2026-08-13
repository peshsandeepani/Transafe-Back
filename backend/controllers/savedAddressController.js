const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const getSavedAddresses = async (req, res) => {
  try {
    const addresses = await prisma.savedAddress.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ addresses });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load saved addresses", error: error.message });
  }
};

const createSavedAddress = async (req, res) => {
  try {
    const { label, address, latitude, longitude } = req.body;
    if (!label?.trim() || !address?.trim() || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: "label, address, latitude, and longitude are required" });
    }

    const savedAddress = await prisma.savedAddress.create({
      data: {
        userId: req.user.id,
        label: label.trim(),
        address: address.trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
      },
    });
    return res.status(201).json({ address: savedAddress });
  } catch (error) {
    return res.status(500).json({ message: "Unable to save address", error: error.message });
  }
};

const deleteSavedAddress = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.savedAddress.findFirst({ where: { id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ message: "Saved address not found" });

    await prisma.savedAddress.delete({ where: { id } });
    return res.status(200).json({ message: "Saved address removed" });
  } catch (error) {
    return res.status(500).json({ message: "Unable to remove saved address", error: error.message });
  }
};

const updateSavedAddress = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { label, address, latitude, longitude } = req.body;
    const existing = await prisma.savedAddress.findFirst({ where: { id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ message: "Saved address not found" });
    if (!label?.trim() || !address?.trim() || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: "label, address, latitude, and longitude are required" });
    }

    const updated = await prisma.savedAddress.update({
      where: { id },
      data: { label: label.trim(), address: address.trim(), latitude: Number(latitude), longitude: Number(longitude) },
    });
    return res.status(200).json({ address: updated });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update saved address", error: error.message });
  }
};

module.exports = { getSavedAddresses, createSavedAddress, updateSavedAddress, deleteSavedAddress };

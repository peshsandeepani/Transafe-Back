const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const getMyActivities = async (req, res) => {
  try {
    const userId = Number(req.user?.id);

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const [rides, incidents, sosAlerts] = await Promise.all([
      prisma.rideRequest.findMany({
        where: { riderId: userId },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { id: true, status: true, tripType: true, pickupAddress: true, destinationAddress: true, fareEstimate: true, createdAt: true },
      }),
      prisma.roadIncident.findMany({
        where: { reportedBy: userId },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { id: true, type: true, description: true, locationName: true, status: true, createdAt: true },
      }),
      prisma.sOSAlert.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { id: true, senderName: true, status: true, createdAt: true },
      }),
    ]);

    const activities = [
      ...rides.map((item) => ({ ...item, kind: "ride", title: "Ride booking", detail: item.destinationAddress || "Destination unavailable", occurredAt: item.createdAt })),
      ...incidents.map((item) => ({ ...item, kind: "incident", title: item.type || "Road incident", detail: item.locationName || item.description || "Incident reported", occurredAt: item.createdAt })),
      ...sosAlerts.map((item) => ({ ...item, kind: "sos", title: "SOS alert", detail: item.status || "Emergency alert", occurredAt: item.createdAt })),
    ].sort((left, right) => new Date(right.occurredAt) - new Date(left.occurredAt));

    return res.status(200).json({ activities: activities.slice(0, 50) });
  } catch (error) {
    console.error("Activity history error:", error);
    return res.status(500).json({ message: "Unable to load activity history", error: error.message });
  }
};

module.exports = { getMyActivities };

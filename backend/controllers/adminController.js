const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const getAdminStats = async (req, res) => {
  try {
    const [
      incidentsTotal,
      resolvedIncidents,
      sosTotal,
      resolvedSos,
      hospitals,
      policeDepartments,
      drivers,
      officers,
    ] = await Promise.all([
      prisma.roadIncident.count(),
      prisma.roadIncident.count({
        where: {
          status: "Resolved",
        },
      }),
      prisma.sOSAlert.count(),
      prisma.sOSAlert.count({
        where: {
          status: "Resolved",
        },
      }),
      prisma.hospital.count(),
      prisma.policeDepartment.count(),
      prisma.user.count({
        where: {
          role: "ambulance_driver",
        },
      }),
      prisma.user.count({
        where: {
          role: "police_officer",
        },
      }),
    ]);

    const rideChargeAggregate = await prisma.walletTransaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        type: "TripCharge",
        status: "Completed",
      },
    });

    const totalChargeAmount = Math.abs(Number(rideChargeAggregate._sum.amount || 0));
    const transafeFeeIncome = (totalChargeAmount * 0.2).toFixed(2);
    const calculatedDriverEarnings = (totalChargeAmount * 0.8).toFixed(2);

    const rawChargeTransactions = await prisma.walletTransaction.findMany({
      where: {
        type: "TripCharge",
        status: "Completed",
        relatedTripId: {
          not: null,
        },
      },
      select: {
        relatedTripId: true,
        amount: true,
      },
    });

    const tripIds = [...new Set(rawChargeTransactions.map((tx) => tx.relatedTripId))].filter(Boolean);

    const trips = tripIds.length > 0
      ? await prisma.rideTrip.findMany({
          where: { id: { in: tripIds } },
          include: {
            rideRequest: true,
          },
        })
      : [];

    const tripVehicleTypeMap = trips.reduce((map, trip) => {
      const vehicleType = trip.rideRequest?.vehicleType || "unknown";
      map[trip.id] = vehicleType;
      return map;
    }, {});

    const vehicleEarnings = {
      car: { riderIncome: 0, driverEarnings: 0, appFee: 0 },
      bike: { riderIncome: 0, driverEarnings: 0, appFee: 0 },
      tuk_tuk: { riderIncome: 0, driverEarnings: 0, appFee: 0 },
      unknown: { riderIncome: 0, driverEarnings: 0, appFee: 0 },
    };

    rawChargeTransactions.forEach((tx) => {
      const vehicleType = tripVehicleTypeMap[tx.relatedTripId] || "unknown";
      const chargeAmount = Math.abs(Number(tx.amount || 0));
      const appFee = chargeAmount * 0.2;
      const driverShare = chargeAmount * 0.8;
      if (!vehicleEarnings[vehicleType]) {
        vehicleEarnings[vehicleType] = { riderIncome: 0, driverEarnings: 0, appFee: 0 };
      }
      vehicleEarnings[vehicleType].riderIncome += chargeAmount;
      vehicleEarnings[vehicleType].driverEarnings += driverShare;
      vehicleEarnings[vehicleType].appFee += appFee;
    });

    Object.keys(vehicleEarnings).forEach((type) => {
      vehicleEarnings[type].riderIncome = vehicleEarnings[type].riderIncome.toFixed(2);
      vehicleEarnings[type].driverEarnings = vehicleEarnings[type].driverEarnings.toFixed(2);
      vehicleEarnings[type].appFee = vehicleEarnings[type].appFee.toFixed(2);
    });

    res.json({
      incidents: {
        total: incidentsTotal,
        resolved: resolvedIncidents,
      },
      sos: {
        total: sosTotal,
        resolved: resolvedSos,
      },
      hospitals,
      policeDepartments,
      drivers,
      officers,
      totalRiderIncome: totalChargeAmount.toFixed(2),
      totalDriverEarnings: calculatedDriverEarnings,
      transafeFeeIncome,
      vehicleEarnings,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: error.message,
    });
  }
};

module.exports = {
  getAdminStats,
};

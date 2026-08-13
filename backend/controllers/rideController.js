const { PrismaClient } = require("@prisma/client");
const { firestore, FieldValue } = require("../config/firebaseAdmin");
const { buildCheckoutPayload, validateNotification, chargeByToken } = require("../services/payhereService");
const prisma = new PrismaClient();

const normalizeVehicleType = (vehicleType) => {
  if (!vehicleType) {
    return null;
  }

  const allowed = {
    tuk_tuk: "tuk_tuk",
    tuk: "tuk_tuk",
    bike: "bike",
    motorbike: "bike",
    motor_bike: "bike",
    car: "car",
    flex: "car",
  };

  return allowed[vehicleType] || vehicleType;
};

const getDriver = async (userId) => {
  return prisma.rideDriver.findUnique({
    where: { userId },
  });
};

/**
 * Attempt to auto-charge rider when trip is completed
 * This initiates a charge via PayHere token if:
 * 1. Payment method is "card"
 * 2. Rider has a default payment method stored
 * 3. Payment hasn't already been attempted
 * 
 * The actual completion is confirmed via webhook
 */
const attemptAutoCharge = async (rideRequest) => {
  try {
    // Only attempt card charges
    if (rideRequest.paymentMethod !== "card") {
      console.log("Skipping auto-charge: payment method is", rideRequest.paymentMethod);
      return null;
    }

    // Get rider's default payment method
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        userId: rideRequest.riderId,
        isDefault: true,
      },
    });

    if (!paymentMethod) {
      console.log("No default payment method found for rider:", rideRequest.riderId);
      return null;
    }

    // Determine fare amount
    const fareAmount = rideRequest.finalFare || rideRequest.fareEstimate || 0;
    if (fareAmount <= 0) {
      console.log("Invalid fare amount:", fareAmount);
      return null;
    }

    // Generate order ID for PayHere (format: trip_{rideId}_{riderId})
    const orderId = `trip_${rideRequest.id}_${rideRequest.riderId}`;

    // Ensure rider has a wallet
    let riderWallet = await prisma.wallet.findUnique({
      where: { userId: rideRequest.riderId },
    });

    if (!riderWallet) {
      riderWallet = await prisma.wallet.create({
        data: {
          userId: rideRequest.riderId,
          balance: 0,
          currency: "LKR",
        },
      });
    }

    // Create pending wallet transaction for the charge
    const walletTransaction = await prisma.walletTransaction.create({
      data: {
        walletId: riderWallet.id,
        type: "TripCharge",
        amount: -fareAmount, // Negative for charge
        relatedTripId: null, // Will update once we have trip ID
        status: "Pending", // Will be updated by webhook
        description: `Charge for ride #${rideRequest.id}`,
      },
    });

    // Attempt the charge via PayHere
    const chargeResult = await chargeByToken({
      payhereToken: paymentMethod.payhereToken,
      orderId,
      amount: fareAmount,
      currency: "LKR",
      description: `SafeZone Ride #${rideRequest.id}`,
    });

    if (!chargeResult.success) {
      console.error("PayHere charge failed:", chargeResult);
      
      // Update transaction status to Failed
      await prisma.walletTransaction.update({
        where: { id: walletTransaction.id },
        data: { status: "Failed" },
      });

      return {
        success: false,
        error: chargeResult.error,
        transactionId: walletTransaction.id,
      };
    }

    // Charge initiated successfully (will be confirmed by webhook)
    console.log("Auto-charge initiated:", {
      orderId,
      amount: fareAmount,
      transactionId: chargeResult.transactionId,
    });

    return {
      success: true,
      transactionId: chargeResult.transactionId,
      walletTransactionId: walletTransaction.id,
      status: chargeResult.status,
    };
  } catch (error) {
    console.error("Auto-charge error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

const registerDriver = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const {
      vehicleType,
      vehicleMake,
      vehicleModel,
      vehicleNumber,
      licenseNumber,
    } = req.body;

    const normalizedVehicleType = normalizeVehicleType(vehicleType);

    if (!normalizedVehicleType) {
      return res.status(400).json({ message: "vehicleType is required" });
    }

    const existing = await getDriver(userId);

    if (existing) {
      const updated = await prisma.rideDriver.update({
        where: { userId },
        data: {
          vehicleType: normalizedVehicleType,
          vehicleMake,
          vehicleModel,
          vehicleNumber,
          licenseNumber,
          isOnline: req.body.isOnline ?? existing.isOnline,
          lastKnownLatitude: req.body.lastKnownLatitude ?? existing.lastKnownLatitude,
          lastKnownLongitude: req.body.lastKnownLongitude ?? existing.lastKnownLongitude,
        },
      });

      return res.status(200).json({ message: "Driver profile updated", driver: updated });
    }

    const driver = await prisma.rideDriver.create({
      data: {
        userId,
        vehicleType: normalizedVehicleType,
        vehicleMake,
        vehicleModel,
        vehicleNumber,
        licenseNumber,
        isOnline: Boolean(req.body.isOnline),
        lastKnownLatitude: req.body.lastKnownLatitude ?? null,
        lastKnownLongitude: req.body.lastKnownLongitude ?? null,
      },
    });

    return res.status(201).json({ message: "Driver profile created", driver });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to register driver", error: error.message });
  }
};

const getDriverProfile = async (req, res) => {
  try {
    const driver = await prisma.rideDriver.findUnique({
      where: { userId: req.user.id },
      include: {
        user: true,
      },
    });

    if (!driver) {
      return res.status(404).json({ message: "Driver profile not found" });
    }

    return res.status(200).json({ driver });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to load driver profile", error: error.message });
  }
};

const setDriverOnlineStatus = async (req, res) => {
  try {
    const { isOnline } = req.body;
    const driver = await prisma.rideDriver.findUnique({
      where: { userId: req.user.id },
    });

    if (!driver) {
      return res.status(404).json({ message: "Driver profile not found" });
    }

    const updated = await prisma.rideDriver.update({
      where: { id: driver.id },
      data: {
        isOnline: Boolean(isOnline),
        lastSeenAt: new Date(),
      },
    });

    return res.status(200).json({ message: "Driver availability updated", driver: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to update driver status", error: error.message });
  }
};

const createRideRequest = async (req, res) => {
  try {
    const riderId = req.user?.id;

    if (!riderId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const {
      pickupLatitude,
      pickupLongitude,
      pickupAddress,
      destinationLatitude,
      destinationLongitude,
      destinationAddress,
      stopLatitude,
      stopLongitude,
      stopAddress,
      returnDropLatitude,
      returnDropLongitude,
      returnDropAddress,
      vehicleType,
      fareEstimate,
      paymentMethod,
      tripType,
    } = req.body;

    const normalizedVehicleType = normalizeVehicleType(vehicleType);
    const normalizedTripType = tripType === "round_trip" ? "round_trip" : "one_way";

    const requestStopLatitude = stopLatitude ?? destinationLatitude;
    const requestStopLongitude = stopLongitude ?? destinationLongitude;
    const requestStopAddress = stopAddress ?? destinationAddress;

    const requestReturnDropLatitude = normalizedTripType === "round_trip"
      ? (returnDropLatitude ?? pickupLatitude)
      : null;

    const requestReturnDropLongitude = normalizedTripType === "round_trip"
      ? (returnDropLongitude ?? pickupLongitude)
      : null;

    const requestReturnDropAddress = normalizedTripType === "round_trip"
      ? (returnDropAddress || "Same as pickup")
      : null;

    if (
      pickupLatitude === undefined ||
      pickupLongitude === undefined ||
      requestStopLatitude === undefined ||
      requestStopLongitude === undefined ||
      !normalizedVehicleType
    ) {
      return res.status(400).json({ message: "Ride coordinates and vehicleType are required" });
    }

    const request = await prisma.rideRequest.create({
      data: {
        riderId,
        pickupLatitude: Number(pickupLatitude),
        pickupLongitude: Number(pickupLongitude),
        pickupAddress: pickupAddress || null,
        destinationLatitude: Number(requestStopLatitude),
        destinationLongitude: Number(requestStopLongitude),
        destinationAddress: requestStopAddress || null,
        stopLatitude: Number(requestStopLatitude),
        stopLongitude: Number(requestStopLongitude),
        stopAddress: requestStopAddress || null,
        returnDropLatitude: Number(requestReturnDropLatitude),
        returnDropLongitude: Number(requestReturnDropLongitude),
        returnDropAddress: requestReturnDropAddress || null,
        vehicleType: normalizedVehicleType,
        tripType: normalizedTripType,
        fareEstimate: fareEstimate ? Number(fareEstimate) : null,
        paymentMethod: paymentMethod || null,
        status: "requested",
      },
    });

    const rider = await prisma.user.findUnique({
      where: { id: riderId },
    });

    await firestore
      .collection("liveRideRequests")
      .doc(String(request.id))
      .set(
        {
          id: String(request.id),
          rideRequestId: request.id,
          riderId: request.riderId,
          riderName: rider?.name || "Rider",
          pickupLatitude: Number(request.pickupLatitude),
          pickupLongitude: Number(request.pickupLongitude),
          pickupAddress: request.pickupAddress || "",
          destinationLatitude: Number(request.destinationLatitude),
          destinationLongitude: Number(request.destinationLongitude),
          destinationAddress: request.destinationAddress || "",
          stopLatitude: request.stopLatitude ?? null,
          stopLongitude: request.stopLongitude ?? null,
          stopAddress: request.stopAddress || "",
          returnDropLatitude: request.returnDropLatitude ?? null,
          returnDropLongitude: request.returnDropLongitude ?? null,
          returnDropAddress: request.returnDropAddress || "Same as pickup",
          vehicleType: request.vehicleType,
          tripType: request.tripType,
          status: request.status,
          fareEstimate: request.fareEstimate || null,
          paymentMethod: request.paymentMethod || "cash",
          createdAt: new Date().toISOString(),
          createdAtServer: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return res.status(201).json({
      message: "Ride requested",
      request,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to create ride request", error: error.message });
  }
};

const getRideRequests = async (req, res) => {
  try {
    const openRequests = await prisma.rideRequest.findMany({
      where: {
        status: {
          in: ["requested", "accepted", "driver_en_route", "picked_up", "in_progress"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        rider: true,
        acceptedDriver: true,
      },
    });

    return res.status(200).json({ requests: openRequests });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to load ride requests", error: error.message });
  }
};

const acceptRideRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await getDriver(req.user.id);

    if (!driver) {
      return res.status(404).json({ message: "Driver profile not found" });
    }

    const request = await prisma.rideRequest.findUnique({
      where: { id: Number(id) },
    });

    if (!request) {
      return res.status(404).json({ message: "Ride request not found" });
    }

    if (request.status !== "requested") {
      return res.status(409).json({ message: "This ride request is no longer available" });
    }

    const driverUser = await prisma.user.findUnique({ where: { id: req.user.id } });

    const accepted = await prisma.rideRequest.update({
      where: { id: Number(id) },
      data: {
        acceptedDriverId: driver.id,
        acceptedAt: new Date(),
        status: "accepted",
      },
      include: {
        rider: true,
      },
    });

    await firestore
      .collection("liveRideRequests")
      .doc(String(id))
      .set(
        {
          status: "accepted",
          acceptedDriverId: driver.id,
          acceptedDriverUserId: req.user.id,
          acceptedDriverName: req.user.name || null,
          acceptedDriverPhone: driverUser?.phone || null,
          acceptedDriverVehicleNumber: driver.vehicleNumber || req.user.assignedVehicleId || null,
          acceptedDriverRatingAverage: driver.ratingAverage || 0,
          acceptedDriverRatingCount: driver.ratingCount || 0,
          acceptedAt: new Date().toISOString(),
          lastUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return res.status(200).json({ message: "Ride accepted", request: accepted });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to accept ride", error: error.message });
  }
};

const updateRideStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const request = await prisma.rideRequest.findUnique({
      where: { id: Number(id) },
      include: { acceptedDriver: true },
    });

    if (!request) {
      return res.status(404).json({ message: "Ride request not found" });
    }

    const data = {
      status,
    };

    if (status === "driver_en_route") {
      data.driverEnRouteAt = new Date();
    }

    if (status === "picked_up") {
      data.pickedUpAt = new Date();
    }

    if (status === "completed") {
      data.completedAt = new Date();
      
      // Attempt auto-charge for card payments
      const chargeResult = await attemptAutoCharge(request);
      if (chargeResult) {
        console.log("Auto-charge result:", chargeResult);
        // Update payment status based on charge attempt
        if (chargeResult.success) {
          data.paymentStatus = "pending"; // Will be confirmed by webhook
          data.paymentProviderRef = chargeResult.transactionId;
        } else {
          data.paymentStatus = "failed";
          data.paymentFailureReason = chargeResult.error;
        }
      }

      try {
        const driverUser = request.acceptedDriver
          ? await prisma.user.findUnique({ where: { id: request.acceptedDriver.userId } })
          : null;

        await firestore.collection("userNotifications").add({
          userId: request.riderId,
          title: "Rate your ride",
          message: `Your ride #${request.id} is complete. Please rate driver ${driverUser?.name || "your driver"}.`,
          rideRequestId: request.id,
          createdAt: new Date().toISOString(),
          createdAtServer: FieldValue.serverTimestamp(),
        });
      } catch (notifyError) {
        console.error("Failed to create rider notification for completed ride:", notifyError);
      }
    }

    const updated = await prisma.rideRequest.update({
      where: { id: Number(id) },
      data,
    });

    await firestore
      .collection("liveRideRequests")
      .doc(String(id))
      .set(
        {
          status,
          lastUpdatedAt: FieldValue.serverTimestamp(),
          ...(status === "completed" && {
            completedAt: new Date().toISOString(),
          }),
        },
        { merge: true }
      );

    return res.status(200).json({ 
      message: "Ride status updated", 
      request: updated,
      ...(status === "completed" && {
        chargeAttempted: true,
      }),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to update ride status", error: error.message });
  }
};

const declineRideRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.rideRequest.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return res.status(404).json({ message: "Ride request not found" });
    }

    const declined = await prisma.rideRequest.update({
      where: { id: Number(id) },
      data: {
        status: "cancelled",
        completedAt: new Date(),
      },
    });

    await firestore
      .collection("liveRideRequests")
      .doc(String(id))
      .set(
        {
          status: "cancelled",
          cancelledBy: req.user?.id || null,
          cancelledAt: new Date().toISOString(),
          lastUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return res.status(200).json({ message: "Ride request declined", request: declined });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to decline ride request", error: error.message });
  }
};

const completeRide = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await prisma.rideRequest.findUnique({
      where: { id: Number(id) },
      include: {
        acceptedDriver: true,
      },
    });

    if (!request) {
      return res.status(404).json({ message: "Ride request not found" });
    }

    if (!request.acceptedDriverId || !request.acceptedDriver) {
      return res.status(400).json({ message: "Ride has no assigned driver" });
    }

    const finalFare = Number(request.finalFare ?? request.fareEstimate ?? 0);
    const paymentMethodType = request.paymentMethod || "cash";
    let paymentStatus = "pending";
    let paymentProviderRef = null;
    let paymentFailureReason = null;
    let paymentMethodId = null;
    let chargeAttempted = false;

    const tripData = {
      riderId: request.riderId,
      driverId: request.acceptedDriverId,
      rideRequestId: request.id,
      pickupLatitude: request.pickupLatitude,
      pickupLongitude: request.pickupLongitude,
      pickupAddress: request.pickupAddress,
      destinationLatitude: request.destinationLatitude,
      destinationLongitude: request.destinationLongitude,
      destinationAddress: request.destinationAddress,
      status: "active",
      finalFare,
      fare: finalFare,
      paymentMethod: paymentMethodType,
      paymentStatus: "pending",
      paymentMethodId: null,
      paymentProviderRef: null,
      paymentFailureReason: null,
      startedAt: request.pickedUpAt || new Date(),
      completedAt: new Date(),
      estimatedFare: request.fareEstimate,
    };

    const trip = await prisma.rideTrip.create({
      data: tripData,
    });

    let walletTransaction = null;
    let riderWallet = null;

    if (paymentMethodType === "card") {
      const defaultPaymentMethod = await prisma.paymentMethod.findFirst({
        where: {
          userId: request.riderId,
          isDefault: true,
        },
      });

      if (defaultPaymentMethod) {
        chargeAttempted = true;
        paymentMethodId = defaultPaymentMethod.id;

        const chargeResult = await chargeByToken({
          payhereToken: defaultPaymentMethod.payhereToken,
          orderId: `trip_${request.id}_${request.riderId}`,
          amount: finalFare,
          currency: "LKR",
          description: `SafeZone Ride #${request.id}`,
        });

        if (chargeResult.success) {
          paymentProviderRef = chargeResult.transactionId || chargeResult.orderId || defaultPaymentMethod.payhereToken;
          paymentStatus = chargeResult.status === "completed" ? "completed" : "pending";

          riderWallet = await prisma.wallet.upsert({
            where: { userId: request.riderId },
            update: {},
            create: {
              userId: request.riderId,
              balance: 0,
              currency: "LKR",
            },
          });

          const transactionStatus = paymentStatus === "completed" ? "Completed" : "Pending";
          walletTransaction = await prisma.walletTransaction.create({
            data: {
              walletId: riderWallet.id,
              type: "TripCharge",
              amount: -finalFare,
              relatedTripId: trip.id,
              status: transactionStatus,
              payhereTransactionId: paymentProviderRef,
              description: `Auto-charge for ride #${request.id}`,
            },
          });

          if (paymentStatus === "completed") {
            riderWallet = await prisma.wallet.update({
              where: { id: riderWallet.id },
              data: { balance: { increment: -finalFare } },
            });
          }

          const driverUser = await prisma.user.findUnique({ where: { id: request.acceptedDriver.userId } });
          let driverWallet = null;
          let driverShare = Number((finalFare * 0.8).toFixed(2));

          if (driverUser) {
            driverWallet = await prisma.wallet.upsert({
              where: { userId: request.acceptedDriver.userId },
              update: {},
              create: {
                userId: request.acceptedDriver.userId,
                balance: 0,
                currency: "LKR",
              },
            });
          }

          if (driverWallet && paymentStatus === "completed") {
            await prisma.walletTransaction.create({
              data: {
                walletId: driverWallet.id,
                type: "TripEarning",
                amount: driverShare,
                relatedTripId: trip.id,
                status: "Completed",
                payhereTransactionId: paymentProviderRef,
                description: `Earning from ride #${request.id}`,
              },
            });

            await prisma.wallet.update({
              where: { id: driverWallet.id },
              data: { balance: { increment: driverShare } },
            });
          }
        } else {
          paymentFailureReason = chargeResult.error || "Card charge failed";
          paymentStatus = "failed";

          riderWallet = await prisma.wallet.upsert({
            where: { userId: request.riderId },
            update: {},
            create: {
              userId: request.riderId,
              balance: 0,
              currency: "LKR",
            },
          });

          walletTransaction = await prisma.walletTransaction.create({
            data: {
              walletId: riderWallet.id,
              type: "TripCharge",
              amount: -finalFare,
              relatedTripId: trip.id,
              status: "Failed",
              description: `Failed auto-charge for ride #${request.id}`,
            },
          });
        }
      } else {
        paymentFailureReason = "No saved default card found for auto-charge";
        paymentStatus = "failed";
      }
    } else if (paymentMethodType === "cash") {
      paymentStatus = "completed";

      const driverUser = await prisma.user.findUnique({ where: { id: request.acceptedDriver.userId } });
      let driverWallet = null;
      const driverShare = Number((finalFare * 0.8).toFixed(2));

      if (driverUser) {
        driverWallet = await prisma.wallet.upsert({
          where: { userId: request.acceptedDriver.userId },
          update: {},
          create: {
            userId: request.acceptedDriver.userId,
            balance: 0,
            currency: "LKR",
          },
        });
      }

      if (driverWallet) {
        await prisma.walletTransaction.create({
          data: {
            walletId: driverWallet.id,
            type: "TripEarning",
            amount: driverShare,
            relatedTripId: trip.id,
            status: "Completed",
            description: `Earning from cash ride #${request.id}`,
          },
        });

        await prisma.wallet.update({
          where: { id: driverWallet.id },
          data: { balance: { increment: driverShare } },
        });
      }
    }

    const updatedTrip = await prisma.rideTrip.update({
      where: { id: trip.id },
      data: {
        paymentMethodId,
        paymentStatus,
        paymentProviderRef,
        paymentFailureReason,
      },
    });

    await prisma.rideRequest.update({
      where: { id: Number(id) },
      data: {
        status: "completed",
        completedAt: new Date(),
        paymentStatus,
        paymentProviderRef,
        paymentFailureReason,
        finalFare,
      },
    });

    try {
      const driverUser = await prisma.user.findUnique({ where: { id: request.acceptedDriver.userId } });
      await firestore.collection("userNotifications").add({
        userId: request.riderId,
        title: "Rate your ride",
        message: `Your ride #${request.id} is complete. Please rate driver ${driverUser?.name || "your driver"}.`,
        rideRequestId: request.id,
        createdAt: new Date().toISOString(),
        createdAtServer: FieldValue.serverTimestamp(),
      });
    } catch (notifyError) {
      console.error("Failed to create rider notification for completed ride:", notifyError);
    }

    await firestore
      .collection("liveRideRequests")
      .doc(String(id))
      .set(
        {
          status: "completed",
          completedAt: new Date().toISOString(),
          lastUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return res.status(200).json({
      message: "Ride completed",
      trip: updatedTrip,
      chargeAttempted,
      paymentStatus,
      paymentFailureReason,
      wallet: riderWallet
        ? {
            balance: riderWallet.balance,
            currency: riderWallet.currency,
          }
        : null,
      walletTransaction: walletTransaction
        ? {
            id: walletTransaction.id,
            type: walletTransaction.type,
            amount: walletTransaction.amount,
            status: walletTransaction.status,
            description: walletTransaction.description,
            relatedTripId: walletTransaction.relatedTripId,
            payhereTransactionId: walletTransaction.payhereTransactionId,
          }
        : null,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to complete ride", error: error.message });
  }
};

const initPayHerePayment = async (req, res) => {
  try {
    const { rideRequestId } = req.params;
    const { amount, currency = "LKR" } = req.body;

    const request = await prisma.rideRequest.findUnique({
      where: { id: Number(rideRequestId) },
    });

    if (!request) {
      return res.status(404).json({ message: "Ride request not found" });
    }

    const paymentReference = `payhere_${Date.now()}_${request.id}`;
    const payload = buildCheckoutPayload({
      orderId: paymentReference,
      amount,
      currency,
      items: `TransSafe Ride #${request.id}`,
      firstName: req.user?.name || "Customer",
      email: req.user?.email || "customer@example.com",
    });

    await prisma.rideRequest.update({
      where: { id: Number(rideRequestId) },
      data: {
        paymentProviderRef: paymentReference,
        paymentStatus: "pending",
      },
    });

    return res.status(200).json({
      message: "PayHere checkout initialised",
      provider: "payhere",
      checkout: {
        providerRef: paymentReference,
        currency,
        amount,
        mode: process.env.PAYHERE_SANDBOX === "false" ? "live" : "sandbox",
        returnUrl: process.env.PAYHERE_RETURN_URL || "",
        cancelUrl: process.env.PAYHERE_CANCEL_URL || "",
        providerPayload: payload,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to initialise payment", error: error.message });
  }
};

const payHereWebhook = async (req, res) => {
  try {
    const notification = req.body || {};
    const check = validateNotification(notification);

    if (!check.valid) {
      return res.status(400).json({ message: check.reason });
    }

    const orderId = notification.order_id;
    const providerRef = String(orderId);

    const request = await prisma.rideRequest.findFirst({
      where: {
        paymentProviderRef: providerRef,
      },
    });

    if (!request) {
      return res.status(404).json({ message: "Ride request not found for payment webhook" });
    }

    await prisma.rideRequest.update({
      where: { id: request.id },
      data: {
        paymentStatus: notification.payment_status === "2" ? "completed" : "failed",
        paymentFailureReason: notification.payment_status === "2" ? null : notification.reason || null,
      },
    });

    await firestore
      .collection("liveRideRequests")
      .doc(String(request.id))
      .set(
        {
          paymentStatus: notification.payment_status === "2" ? "completed" : "failed",
          paymentProviderRef: providerRef,
          paymentProviderUpdatedAt: new Date().toISOString(),
          lastUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return res.status(200).json({ message: "PayHere webhook accepted" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "PayHere webhook failed", error: error.message });
  }
};

/**
 * POST /api/rides/requests/:id/rate
 * Submit a rating for a completed ride request
 */
const rateRideRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be an integer between 1 and 5" });
    }

    const request = await prisma.rideRequest.findUnique({
      where: { id: Number(id) },
      include: { acceptedDriver: true },
    });

    if (!request) return res.status(404).json({ message: "Ride request not found" });
    if (request.status !== "completed") return res.status(400).json({ message: "Ride is not completed" });
    if (request.ratingGiven) return res.status(409).json({ message: "Rating already submitted" });

    // Update RideTrip rating if exists
    const trip = await prisma.rideTrip.findUnique({ where: { rideRequestId: request.id } });
    if (trip) {
      await prisma.rideTrip.update({ where: { id: trip.id }, data: { rating: Number(rating) } });
    }

    // Mark request as rated
    await prisma.rideRequest.update({ where: { id: request.id }, data: { ratingGiven: true } });

    // Update driver's aggregate rating
    if (request.acceptedDriverId) {
      const driver = await prisma.rideDriver.findUnique({ where: { id: request.acceptedDriverId } });
      if (driver) {
        const newCount = (driver.ratingCount || 0) + 1;
        const newAvg = ((driver.ratingAverage || 0) * (driver.ratingCount || 0) + Number(rating)) / newCount;
        await prisma.rideDriver.update({ where: { id: driver.id }, data: { ratingCount: newCount, ratingAverage: newAvg } });
      }
    }

    return res.status(200).json({ message: "Rating submitted" });
  } catch (error) {
    console.error("Rate ride error:", error);
    return res.status(500).json({ message: "Unable to submit rating", error: error.message });
  }
};

module.exports = {
  registerDriver,
  getDriverProfile,
  setDriverOnlineStatus,
  createRideRequest,
  getRideRequests,
  acceptRideRequest,
  declineRideRequest,
  updateRideStatus,
  completeRide,
  initPayHerePayment,
  payHereWebhook,
  rateRideRequest,
};

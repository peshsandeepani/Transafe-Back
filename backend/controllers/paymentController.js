const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const {
  verifyWebhookSignature,
  validateWebhookPayload,
  extractCardInfo,
  chargeByToken,
} = require("../services/payhereService");

const prisma = new PrismaClient();

const getCardBrandByNumber = (cardNumber) => {
  if (!cardNumber) return "Unknown";
  if (/^4/.test(cardNumber)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(cardNumber)) return "Mastercard";
  if (/^3[47]/.test(cardNumber)) return "American Express";
  if (/^6(?:011|5)/.test(cardNumber)) return "Discover";
  return "Unknown";
};

/**
 * GET /api/payments/methods
 * Get all saved payment methods for the logged-in user
 */
const getPaymentMethods = async (req, res) => {
  try {
    const methods = await prisma.paymentMethod.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        cardLast4: true,
        cardBrand: true,
        isDefault: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      methods,
      count: methods.length,
    });
  } catch (error) {
    console.error("Get payment methods error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load payment methods",
      error: error.message,
    });
  }
};

/**
 * POST /api/payments/methods
 * Save a new payment method from card details or existing token
 * Request body: { cardNumber, expiryDate, cvv, cardholderName, setAsDefault }
 */
const savePaymentMethod = async (req, res) => {
  try {
    const {
      payhereToken,
      cardLast4,
      cardBrand,
      setAsDefault,
      cardNumber,
      expiryDate,
      cvv,
      cardholderName,
    } = req.body;

    let token = payhereToken;
    let last4 = cardLast4;
    let brand = cardBrand;

    if (!token) {
      const normalizedCardNumber = (cardNumber || "").replace(/\D/g, "");

      if (normalizedCardNumber.length < 13 || normalizedCardNumber.length > 19) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid card number.",
        });
      }

      if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
        return res.status(400).json({
          success: false,
          message: "Expiry date must be in MM/YY format.",
        });
      }

      const [monthText, yearText] = expiryDate.split("/");
      const month = Number(monthText);
      const year = Number(yearText);
      const now = new Date();
      const currentYear = now.getFullYear() % 100;
      const currentMonth = now.getMonth() + 1;

      if (month < 1 || month > 12 || year < currentYear || (year === currentYear && month < currentMonth)) {
        return res.status(400).json({
          success: false,
          message: "The card expiry date is invalid or has passed.",
        });
      }

      if (!/^\d{3,4}$/.test(cvv || "")) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid CVV.",
        });
      }

      last4 = normalizedCardNumber.slice(-4);
      brand = brand || getCardBrandByNumber(normalizedCardNumber);
      token = `card_${crypto.randomBytes(16).toString("hex")}`;
    }

    // Validate masked card fields
    if (!token || !last4 || !brand) {
      return res.status(400).json({
        success: false,
        message: "Missing required card details. Provide either a card token or full card data.",
      });
    }

    if (last4.length !== 4 || !/^\d{4}$/.test(last4)) {
      return res.status(400).json({
        success: false,
        message: "cardLast4 must be exactly 4 digits",
      });
    }

    // If setting as default, unset other methods first
    if (setAsDefault) {
      await prisma.paymentMethod.updateMany({
        where: { userId: req.user.id },
        data: { isDefault: false },
      });
    }

    const existing = await prisma.paymentMethod.findUnique({
      where: { payhereToken: token },
    });

    if (existing && existing.userId !== req.user.id) {
      return res.status(400).json({
        success: false,
        message: "This card is already associated with another account",
      });
    }

    const method = await prisma.paymentMethod.upsert({
      where: { payhereToken: token },
      update: {
        cardLast4: last4,
        cardBrand: brand,
        isDefault: setAsDefault || false,
        updatedAt: new Date(),
      },
      create: {
        userId: req.user.id,
        payhereToken: token,
        cardLast4: last4,
        cardBrand: brand,
        isDefault: setAsDefault || false,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Payment method saved successfully",
      method: {
        id: method.id,
        cardLast4: method.cardLast4,
        cardBrand: method.cardBrand,
        isDefault: method.isDefault,
        createdAt: method.createdAt,
      },
    });
  } catch (error) {
    console.error("Save payment method error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to save payment method",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/payments/methods/:id
 * Delete a saved payment method
 */
const deletePaymentMethod = async (req, res) => {
  try {
    const methodId = parseInt(req.params.id);

    // Verify ownership
    const method = await prisma.paymentMethod.findUnique({
      where: { id: methodId },
    });

    if (!method) {
      return res.status(404).json({
        success: false,
        message: "Payment method not found",
      });
    }

    if (method.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this payment method",
      });
    }

    await prisma.paymentMethod.delete({
      where: { id: methodId },
    });

    return res.status(200).json({
      success: true,
      message: "Payment method deleted successfully",
    });
  } catch (error) {
    console.error("Delete payment method error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete payment method",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/payments/methods/:id/set-default
 * Set a payment method as default
 */
const setDefaultPaymentMethod = async (req, res) => {
  try {
    const methodId = parseInt(req.params.id);

    // Verify ownership
    const method = await prisma.paymentMethod.findUnique({
      where: { id: methodId },
    });

    if (!method) {
      return res.status(404).json({
        success: false,
        message: "Payment method not found",
      });
    }

    if (method.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to modify this payment method",
      });
    }

    // Unset other methods
    await prisma.paymentMethod.updateMany({
      where: { userId: req.user.id },
      data: { isDefault: false },
    });

    // Set this one as default
    const updated = await prisma.paymentMethod.update({
      where: { id: methodId },
      data: { isDefault: true },
      select: {
        id: true,
        cardLast4: true,
        cardBrand: true,
        isDefault: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Default payment method updated",
      method: updated,
    });
  } catch (error) {
    console.error("Set default payment method error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update default payment method",
      error: error.message,
    });
  }
};

/**
 * GET /api/payments/me
 * Get payment history for the logged-in user
 */
const getMyPayments = async (req, res) => {
  try {
    const payments = await prisma.rideRequest.findMany({
      where: { riderId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        fareEstimate: true,
        finalFare: true,
        paymentMethod: true,
        paymentStatus: true,
        paymentProviderRef: true,
        pickupAddress: true,
        destinationAddress: true,
        createdAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      payments,
      count: payments.length,
    });
  } catch (error) {
    console.error("Get payment history error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load payment history",
      error: error.message,
    });
  }
};

/**
 * POST /api/payments/webhook/payhere
 * PayHere webhook handler - process payment notifications
 * 
 * Critical: Must verify signature before trusting payload
 * PayHere may retry webhook delivery, so must be idempotent (dedupe on transaction ID)
 */
const payHereWebhook = async (req, res) => {
  try {
    // CRITICAL: Verify signature first
    const signature = req.headers["x-payhere-signature"] || req.body.hash;
    if (!verifyWebhookSignature(req.body, signature)) {
      console.warn("PayHere webhook signature verification failed:", req.body);
      return res.status(401).json({
        success: false,
        message: "Signature verification failed",
      });
    }

    // Validate payload structure
    const validation = validateWebhookPayload(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.reason,
      });
    }

    const { order_id, payment_status, amount, currency, merchant_id, transaction_id, last_four_digits } = req.body;
    const isSuccess = validation.isSuccess !== false && payment_status === "2" && req.body.status_code === "2";

    // Parse order_id to extract trip ID and user ID (format: trip_{tripId}_{userId})
    // OR use order_id as transaction reference and look up the trip
    const walletTransaction = await prisma.walletTransaction.findFirst({
      where: {
        payhereTransactionId: transaction_id,
      },
    });

    // Idempotency: If this transaction already processed, return success
    if (walletTransaction) {
      console.log("PayHere webhook already processed, idempotent return:", transaction_id);
      return res.status(200).json({
        success: true,
        message: "Webhook already processed (idempotent)",
        transactionId: transaction_id,
      });
    }

    if (isSuccess) {
      // Payment successful: Update wallet transaction status to Completed
      // Credit driver's wallet with their share
      
      // TODO: Parse order_id to get trip and user info
      // This should be: order_id = `trip_${rideTrip.id}_${rider.id}`
      const orderParts = order_id.split("_");
      const tripId = parseInt(orderParts[1]);
      const riderId = parseInt(orderParts[2]);

      // Find the trip
      const trip = await prisma.rideTrip.findUnique({
        where: { id: tripId },
        include: {
          driver: true,
          rider: { include: { rideDriverProfile: true } },
        },
      });

      if (!trip) {
        console.error("Trip not found for webhook:", tripId);
        return res.status(404).json({
          success: false,
          message: "Trip not found",
        });
      }

      const driverUser = await prisma.user.findUnique({ where: { id: trip.driver.userId } });
      let driverWallet = null;
      let driverEarning = 0;
      let driverEarningTransaction = null;

      if (driverUser) {
        driverWallet = await prisma.wallet.findUnique({
          where: { userId: trip.driver.userId },
        });

        if (!driverWallet) {
          driverWallet = await prisma.wallet.create({
            data: {
              userId: trip.driver.userId,
              balance: 0,
              currency: currency || "LKR",
            },
          });
        }

        // Calculate driver's share (assuming 80% to driver, 20% platform fee)
        driverEarning = parseFloat(amount) * 0.8;
      }

      // First, find or create the rider's wallet transaction for this charge
      let riderChargeTransaction = await prisma.walletTransaction.findFirst({
        where: {
          relatedTripId: tripId,
          type: "TripCharge",
        },
      });

      if (!riderChargeTransaction) {
        // Create it if it doesn't exist (should have been created when trip ended)
        const riderWallet = await prisma.wallet.findUnique({
          where: { userId: trip.riderId },
        });

        if (riderWallet) {
          riderChargeTransaction = await prisma.walletTransaction.create({
            data: {
              walletId: riderWallet.id,
              type: "TripCharge",
              amount: -parseFloat(amount),
              relatedTripId: tripId,
              status: "Completed",
              payhereTransactionId: transaction_id,
              description: `Charged for trip #${tripId}`,
            },
          });
        }
      } else {
        // Update existing transaction
        riderChargeTransaction = await prisma.walletTransaction.update({
          where: { id: riderChargeTransaction.id },
          data: {
            status: "Completed",
            payhereTransactionId: transaction_id,
          },
        });
      }

      // If driver wallet exists (i.e., not a normal driver), create earning transaction and update balance
      if (driverWallet) {
        driverEarningTransaction = await prisma.walletTransaction.create({
          data: {
            walletId: driverWallet.id,
            type: "TripEarning",
            amount: driverEarning,
            relatedTripId: tripId,
            status: "Completed",
            payhereTransactionId: transaction_id,
            description: `Earned from trip #${tripId}`,
          },
        });

        // Update driver's wallet balance
        driverWallet = await prisma.wallet.update({
          where: { id: driverWallet.id },
          data: {
            balance: { increment: driverEarning },
          },
        });
      }

      // Update trip payment status
      await prisma.rideTrip.update({
        where: { id: tripId },
        data: {
          paymentStatus: "charged",
          paymentProviderRef: transaction_id,
        },
      });

      // TODO: Notify rider and driver via Socket.IO or push notification
      console.log("PayHere payment confirmed:", {
        transactionId: transaction_id,
        tripId,
        riderChargeId: riderChargeTransaction?.id,
        driverEarningId: driverEarningTransaction?.id,
        driverWalletBalance: driverWallet?.balance ?? null,
      });

      return res.status(200).json({
        success: true,
        message: "Payment processed successfully",
        transactionId: transaction_id,
      });
    } else {
      // Payment failed
      console.log("PayHere payment failed:", order_id);

      // Mark wallet transaction as Failed
      // TODO: Parse order_id to find trip
      const orderParts = order_id.split("_");
      const tripId = parseInt(orderParts[1]);

      let failedTransaction = await prisma.walletTransaction.findFirst({
        where: {
          relatedTripId: tripId,
          type: "TripCharge",
        },
      });

      if (failedTransaction) {
        await prisma.walletTransaction.update({
          where: { id: failedTransaction.id },
          data: {
            status: "Failed",
            payhereTransactionId: transaction_id,
          },
        });
      }

      // Update trip payment status to failed
      await prisma.rideTrip.update({
        where: { id: tripId },
        data: {
          paymentStatus: "failed",
          paymentProviderRef: transaction_id,
          paymentFailureReason: `Payment declined by PayHere (status: ${req.body.status_code})`,
        },
      });

      // TODO: Notify rider to retry payment
      return res.status(200).json({
        success: true,
        message: "Payment failure processed",
        transactionId: transaction_id,
      });
    }
  } catch (error) {
    console.error("PayHere webhook error:", error);
    return res.status(500).json({
      success: false,
      message: "Webhook processing error",
      error: error.message,
    });
  }
};

module.exports = {
  getPaymentMethods,
  savePaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  getMyPayments,
  payHereWebhook,
};

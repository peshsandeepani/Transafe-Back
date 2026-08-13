const crypto = require("crypto");
const axios = require("axios");

const payHereConfig = {
  merchantId: process.env.PAYHERE_MERCHANT_ID || "YOUR_PAYHERE_MERCHANT_ID",
  merchantSecret: process.env.PAYHERE_MERCHANT_SECRET || "YOUR_PAYHERE_MERCHANT_SECRET",
  sandbox: process.env.PAYHERE_SANDBOX === "true" || true,
  returnUrl: process.env.PAYHERE_RETURN_URL || "https://example.com/payhere/return",
  cancelUrl: process.env.PAYHERE_CANCEL_URL || "https://example.com/payhere/cancel",
  notifyUrl: process.env.PAYHERE_NOTIFY_URL || "https://example.com/api/payments/webhook/payhere",
  // Card tokenization and charge endpoints
  apiUrl: process.env.PAYHERE_API_URL || "https://sandbox.payhere.lk/api/v3",
};

/**
 * Build checkout payload for initial payment
 */
const buildCheckoutPayload = ({ orderId, amount, currency = "LKR", items = "SafeZone Ride", firstName = "Customer", lastName = "User", email = "customer@example.com", phone = "0000000000", address = "", city = "", country = "Sri Lanka" }) => {
  return {
    merchant_id: payHereConfig.merchantId,
    return_url: payHereConfig.returnUrl,
    cancel_url: payHereConfig.cancelUrl,
    notify_url: payHereConfig.notifyUrl,
    order_id: orderId,
    items,
    currency,
    amount,
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    address,
    city,
    country,
    platform: "SafeZone",
  };
};

/**
 * Verify PayHere webhook signature (CRITICAL - per PayHere security docs)
 * Signature is based on MD5 hash of specific fields
 */
const verifyWebhookSignature = (webhookData, receivedHash) => {
  try {
    // PayHere expects hash of: merchant_id + order_id + paymentStatus + amount + currency + merchant_secret
    // Exact order and format per PayHere docs
    const hashString = `${webhookData.merchant_id}${webhookData.order_id}${webhookData.payment_status}${webhookData.amount}${webhookData.currency}${payHereConfig.merchantSecret}`;
    const calculatedHash = crypto.createHash("md5").update(hashString).digest("hex");
    
    return calculatedHash.toLowerCase() === (receivedHash || "").toLowerCase();
  } catch (error) {
    console.error("Webhook signature verification error:", error);
    return false;
  }
};

/**
 * Validate webhook payload structure
 */
const validateWebhookPayload = (body) => {
  const required = ["merchant_id", "order_id", "payment_status", "status_code"];

  for (const key of required) {
    if (!body[key]) {
      return { valid: false, reason: `${key} is required` };
    }
  }

  // Only process successful payments (status_code 2 = success)
  if (body.status_code === "2" && body.payment_status === "2") {
    return { valid: true, reason: "PayHere payment accepted" };
  }

  // Still valid, but not a success
  return { valid: true, reason: "PayHere notification received", isSuccess: false };
};

/**
 * Charge a rider using saved PayHere token
 * STUBBED - Replace with actual PayHere API call when credentials available
 * 
 * PayHere charge-by-token endpoint:
 * POST {apiUrl}/charge
 * 
 * Request body:
 * {
 *   "merchant_id": "YOUR_MERCHANT_ID",
 *   "customer_token": "payhereToken",
 *   "order_id": "unique_order_id",
 *   "amount": 1000.00,
 *   "currency": "LKR",
 *   "order_description": "Trip fare for ride #123"
 * }
 */
const chargeByToken = async ({ payhereToken, orderId, amount, currency = "LKR", description = "SafeZone Ride Charge" }) => {
  // STUB: Replace this with actual API call when credentials available
  if (payHereConfig.merchantId === "YOUR_PAYHERE_MERCHANT_ID") {
    // Simulated response for stub mode
    console.log("STUB: PayHere charge-by-token called (credentials not configured)");
    return {
      success: true,
      transactionId: `STUB-${Date.now()}`,
      orderId,
      amount,
      status: "completed", // Immediately complete in stub mode so wallet updates
      message: "Stub mode - immediate completion",
    };
  }

  try {
    // Real implementation (when credentials available)
    const payload = {
      merchant_id: payHereConfig.merchantId,
      customer_token: payhereToken,
      order_id: orderId,
      amount: parseFloat(amount).toFixed(2),
      currency,
      order_description: description,
    };

    const response = await axios.post(`${payHereConfig.apiUrl}/charge`, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return {
      success: response.data.success === true,
      transactionId: response.data.transaction_id,
      orderId,
      amount,
      status: response.data.status_code === "2" ? "completed" : "pending",
      message: response.data.msg,
    };
  } catch (error) {
    console.error("PayHere charge-by-token error:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.msg || error.message,
      status: "failed",
    };
  }
};

/**
 * Verify a PayHere customer token is valid
 * STUBBED - Replace with actual API call when credentials available
 */
const verifyCustomerToken = async (payhereToken) => {
  // STUB: Replace with actual token verification when credentials available
  if (payHereConfig.merchantId === "YOUR_PAYHERE_MERCHANT_ID") {
    console.log("STUB: PayHere token verification (credentials not configured)");
    return { valid: true, token: payhereToken };
  }

  try {
    // Real implementation would verify token with PayHere API
    return { valid: true, token: payhereToken };
  } catch (error) {
    console.error("Token verification error:", error);
    return { valid: false, error: error.message };
  }
};

/**
 * Extract card info from PayHere webhook (used for storing payment method metadata)
 */
const extractCardInfo = (webhookData) => {
  // PayHere returns masked card details in webhook
  return {
    last4: webhookData.last_four_digits || "****",
    brand: webhookData.card_type || "Card", // Visa, Mastercard, etc.
  };
};

module.exports = {
  payHereConfig,
  buildCheckoutPayload,
  validateWebhookPayload,
  verifyWebhookSignature,
  chargeByToken,
  verifyCustomerToken,
  extractCardInfo,
};

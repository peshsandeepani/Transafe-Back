const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/**
 * GET /api/wallet
 * Get wallet balance and recent transactions for the logged-in user
 */
const getWallet = async (req, res) => {
  try {
    let wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.id },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 20, // Recent 20 transactions
          select: {
            id: true,
            type: true,
            amount: true,
            status: true,
            description: true,
            relatedTripId: true,
            createdAt: true,
          },
        },
      },
    });

    // If wallet doesn't exist yet, create it
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: req.user.id,
          balance: 0,
          currency: "LKR",
          transactions: {
            create: [],
          },
        },
        include: {
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
              id: true,
              type: true,
              amount: true,
              status: true,
              description: true,
              relatedTripId: true,
              createdAt: true,
            },
          },
        },
      });
    }

    return res.status(200).json({
      success: true,
      wallet: {
        balance: wallet.balance,
        currency: wallet.currency,
        updatedAt: wallet.updatedAt,
      },
      transactions: wallet.transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: Number(tx.amount),
        status: tx.status,
        description: tx.description,
        relatedTripId: tx.relatedTripId,
        createdAt: tx.createdAt,
      })),
      count: wallet.transactions.length,
    });
  } catch (error) {
    console.error("Get wallet error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load wallet",
      error: error.message,
    });
  }
};

/**
 * GET /api/wallet/transactions
 * Get paginated transaction history with optional filtering
 * Query params: type (TripEarning|TripCharge|Payout|Refund|Adjustment), status, limit, offset
 */
const getTransactions = async (req, res) => {
  try {
    const { type, status, limit = "10", offset = "0" } = req.query;
    const pageLimit = Math.min(parseInt(limit), 100); // Max 100 per page
    const pageOffset = parseInt(offset);

    // Build where clause
    const where = {
      wallet: {
        userId: req.user.id,
      },
    };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    // Get total count
    const total = await prisma.walletTransaction.count({ where });

    // Get transactions
    const transactions = await prisma.walletTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pageOffset,
      take: pageLimit,
      select: {
        id: true,
        type: true,
        amount: true,
        status: true,
        description: true,
        relatedTripId: true,
        createdAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      transactions: transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: Number(tx.amount),
        status: tx.status,
        description: tx.description,
        relatedTripId: tx.relatedTripId,
        createdAt: tx.createdAt,
      })),
      pagination: {
        total,
        limit: pageLimit,
        offset: pageOffset,
        hasMore: pageOffset + pageLimit < total,
      },
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load transactions",
      error: error.message,
    });
  }
};

/**
 * GET /api/wallet/balance
 * Quick endpoint to get just the balance
 */
const getBalance = async (req, res) => {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.id },
      select: {
        balance: true,
        currency: true,
      },
    });

    if (!wallet) {
      return res.status(200).json({
        success: true,
        balance: "0.00",
        currency: "LKR",
      });
    }

    return res.status(200).json({
      success: true,
      balance: wallet.balance.toString(),
      currency: wallet.currency,
    });
  } catch (error) {
    console.error("Get balance error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to get balance",
      error: error.message,
    });
  }
};

/**
 * POST /api/wallet/transactions/summary
 * Get transaction summary by type (for dashboard cards)
 */
const getTransactionSummary = async (req, res) => {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.id },
      include: {
        transactions: true,
      },
    });

    if (!wallet) {
      return res.status(200).json({
        success: true,
        summary: {
          totalEarnings: "0.00",
          totalCharges: "0.00",
          totalRefunds: "0.00",
          completedTransactions: 0,
          pendingTransactions: 0,
        },
      });
    }

    const summary = {
      totalEarnings: 0,
      totalCharges: 0,
      totalRefunds: 0,
      totalAdjustments: 0,
      completedTransactions: 0,
      pendingTransactions: 0,
      failedTransactions: 0,
    };

    wallet.transactions.forEach((tx) => {
      const amount = parseFloat(tx.amount);

      if (tx.status === "Completed") summary.completedTransactions++;
      if (tx.status === "Pending") summary.pendingTransactions++;
      if (tx.status === "Failed") summary.failedTransactions++;

      switch (tx.type) {
        case "TripEarning":
          summary.totalEarnings += amount;
          break;
        case "TripCharge":
          summary.totalCharges += Math.abs(amount);
          break;
        case "Refund":
          summary.totalRefunds += amount;
          break;
        case "Adjustment":
          summary.totalAdjustments += amount;
          break;
      }
    });

    // Format as strings with 2 decimal places
    Object.keys(summary).forEach((key) => {
      if (typeof summary[key] === "number" && key.startsWith("total")) {
        summary[key] = summary[key].toFixed(2);
      }
    });

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error("Get transaction summary error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to get transaction summary",
      error: error.message,
    });
  }
};

module.exports = {
  getWallet,
  getTransactions,
  getBalance,
  getTransactionSummary,
};

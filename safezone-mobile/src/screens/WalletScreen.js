import React, { useEffect, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import API from "../services/api";

/**
 * WalletScreen - Driver earnings and wallet management
 * 
 * Displays:
 * - Current wallet balance (source of truth from our database)
 * - Recent transactions (earnings from trips, charges, adjustments)
 * - Transaction history with filtering
 * - Status indicators (Pending, Completed, Failed)
 * 
 * Data is fetched from:
 * - GET /api/wallet - balance and recent transactions
 * - GET /api/wallet/balance - quick balance check
 * - GET /api/wallet/transactions - paginated history
 * - GET /api/wallet/transactions/summary - stats by type
 */
function WalletScreen({ token, role, setScreen, setCitizenTab }) {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all"); // all, earnings, charges

  // Fetch wallet data
  const fetchWalletData = async () => {
    try {
      setLoading(true);

      // Get wallet with recent transactions
      const walletResponse = await API.get("/wallet", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (walletResponse.data.success) {
        setWallet(walletResponse.data.wallet);
        setTransactions(walletResponse.data.transactions || []);
      }

      // Get transaction summary
      const summaryResponse = await API.post(
        "/wallet/transactions/summary",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (summaryResponse.data.success) {
        setSummary(summaryResponse.data.summary);
      }
    } catch (error) {
      console.error("Fetch wallet error:", error);
      Alert.alert("Error", "Unable to load wallet data");
    } finally {
      setLoading(false);
    }
  };

  // Load more transactions
  const loadMoreTransactions = async () => {
    try {
      let query = `/wallet/transactions?limit=20&offset=${transactions.length}`;
      if (selectedFilter !== "all") {
        query += `&type=${selectedFilter === "earnings" ? "TripEarning" : "TripCharge"}`;
      }

      const response = await API.get(query, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setTransactions([...transactions, ...response.data.transactions]);
      }
    } catch (error) {
      console.error("Load more error:", error);
    }
  };

  // Refresh wallet data
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWalletData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchWalletData();
  }, [token]);

  // Filter transactions based on selected filter
  const filteredTransactions =
    selectedFilter === "all"
      ? transactions
      : transactions.filter((tx) => {
          if (selectedFilter === "earnings") return tx.type === "TripEarning";
          if (selectedFilter === "charges") return tx.type === "TripCharge";
          return true;
        });

  // Get transaction type color
  const getTransactionColor = (type) => {
    switch (type) {
      case "TripEarning":
        return "#34D399"; // Green
      case "TripCharge":
        return "#F87171"; // Red
      case "Refund":
        return "#60A5FA"; // Blue
      case "Payout":
        return "#A78BFA"; // Purple
      case "Adjustment":
        return "#FBBF24"; // Amber
      default:
        return "#94A3B8"; // Gray
    }
  };

  // Get transaction type label
  const getTransactionLabel = (type) => {
    switch (type) {
      case "TripEarning":
        return "Ride Earnings";
      case "TripCharge":
        return "Ride Charge";
      case "Refund":
        return "Refund";
      case "Payout":
        return "Withdrawal";
      case "Adjustment":
        return "Adjustment";
      default:
        return type;
    }
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "#34D399";
      case "Pending":
        return "#FBBF24";
      case "Failed":
        return "#F87171";
      default:
        return "#94A3B8";
    }
  };

  // Render transaction item
  const renderTransaction = ({ item }) => (
    <View
      style={{
        backgroundColor: "#1E293B",
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: getTransactionColor(item.type),
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: "#F8FAFC",
            fontWeight: "700",
            marginBottom: 4,
            fontSize: 14,
          }}
        >
          {getTransactionLabel(item.type)}
        </Text>
        <Text style={{ color: "#94A3B8", fontSize: 12, marginBottom: 6 }}>
          {item.description || `Trip #${item.relatedTripId || "N/A"}`}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              color: getStatusColor(item.status),
              fontSize: 11,
              fontWeight: "600",
              paddingHorizontal: 8,
              paddingVertical: 3,
              backgroundColor:
                item.status === "Completed"
                  ? "rgba(52, 211, 153, 0.1)"
                  : item.status === "Pending"
                  ? "rgba(251, 191, 36, 0.1)"
                  : "rgba(248, 113, 113, 0.1)",
              borderRadius: 6,
            }}
          >
            {item.status}
          </Text>
          <Text
            style={{
              color: "#CBD5E1",
              fontSize: 11,
            }}
          >
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <Text
        style={{
          color: getTransactionColor(item.type),
          fontWeight: "800",
          fontSize: 16,
          marginLeft: 12,
          textAlign: "right",
        }}
      >
        {item.type === "TripCharge" ? "-" : "+"}LKR {Math.abs(Number(item.amount || 0)).toFixed(2)}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0F172A",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0F172A" }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ paddingBottom: 110 }}
    >
      {/* Header with Back Button */}
      <View
        style={{
          padding: 18,
          paddingBottom: 0,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            if (setCitizenTab) {
              setCitizenTab("account");
            }
            setScreen("citizenTab");
          }}
          style={{ marginBottom: 12 }}
        >
          <Text style={{ color: "#60A5FA", fontWeight: "700" }}>
            ‹ Back to Account
          </Text>
        </TouchableOpacity>
        <Text
          style={{
            color: "#F8FAFC",
            fontSize: 25,
            fontWeight: "800",
            marginBottom: 8,
          }}
        >
          Wallet
        </Text>
        <Text style={{ color: "#94A3B8", marginBottom: 18 }}>
          Your earnings and transaction history
        </Text>
      </View>

      {/* Balance Card */}
      {wallet && (
        <View style={{ paddingHorizontal: 18, marginBottom: 24 }}>
          <View
            style={{
              backgroundColor: "linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)",
              borderRadius: 16,
              padding: 24,
              borderWidth: 1,
              borderColor: "#3B82F6",
            }}
          >
            <Text style={{ color: "#BFDBFE", fontWeight: "500", marginBottom: 8 }}>
              Current Balance
            </Text>
            <View style={{ flexDirection: "row", alignItems: "baseline" }}>
              <Text
                style={{
                  color: "#F8FAFC",
                  fontSize: 42,
                  fontWeight: "800",
                  marginRight: 8,
                }}
              >
                {wallet.balance}
              </Text>
              <Text
                style={{
                  color: "#DBEAFE",
                  fontSize: 18,
                  fontWeight: "600",
                }}
              >
                {wallet.currency}
              </Text>
            </View>

            <Text
              style={{
                color: "#BFDBFE",
                fontSize: 12,
                marginTop: 16,
              }}
            >
              Last updated: {new Date(wallet.updatedAt).toLocaleTimeString()}
            </Text>
          </View>
        </View>
      )}

      {/* Summary Cards */}
      {summary && (
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 18,
            gap: 10,
            marginBottom: 24,
          }}
        >
          {/* Total Earnings */}
          <View
            style={{
              flex: 1,
              backgroundColor: "#1E293B",
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: "#334155",
            }}
          >
            <Text
              style={{
                color: "#94A3B8",
                fontSize: 11,
                fontWeight: "600",
                marginBottom: 6,
              }}
            >
              Total Earnings
            </Text>
            <Text
              style={{
                color: "#34D399",
                fontSize: 16,
                fontWeight: "800",
              }}
            >
              +LKR {summary.totalEarnings}
            </Text>
            <Text
              style={{
                color: "#64748B",
                fontSize: 10,
                marginTop: 4,
              }}
            >
              {summary.completedTransactions} completed
            </Text>
          </View>

          {/* Pending Amount */}
          <View
            style={{
              flex: 1,
              backgroundColor: "#1E293B",
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: "#334155",
            }}
          >
            <Text
              style={{
                color: "#94A3B8",
                fontSize: 11,
                fontWeight: "600",
                marginBottom: 6,
              }}
            >
              Pending
            </Text>
            <Text
              style={{
                color: "#FBBF24",
                fontSize: 16,
                fontWeight: "800",
              }}
            >
              ⏱ {summary.pendingTransactions}
            </Text>
            <Text
              style={{
                color: "#64748B",
                fontSize: 10,
                marginTop: 4,
              }}
            >
              transactions
            </Text>
          </View>

          {/* Failed */}
          {summary.failedTransactions > 0 && (
            <View
              style={{
                flex: 1,
                backgroundColor: "#1E293B",
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: "#334155",
              }}
            >
              <Text
                style={{
                  color: "#94A3B8",
                  fontSize: 11,
                  fontWeight: "600",
                  marginBottom: 6,
                }}
              >
                Failed
              </Text>
              <Text
                style={{
                  color: "#F87171",
                  fontSize: 16,
                  fontWeight: "800",
                }}
              >
                ✕ {summary.failedTransactions}
              </Text>
              <Text
                style={{
                  color: "#64748B",
                  fontSize: 10,
                  marginTop: 4,
                }}
              >
                need action
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Filter Tabs */}
      <View
        style={{
          paddingHorizontal: 18,
          marginBottom: 18,
          flexDirection: "row",
          gap: 10,
        }}
      >
        {["all", "earnings", "charges"].map((filter) => (
          <TouchableOpacity
            key={filter}
            onPress={() => setSelectedFilter(filter)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor:
                selectedFilter === filter ? "#2563EB" : "#1E293B",
              borderWidth: 1,
              borderColor:
                selectedFilter === filter ? "#3B82F6" : "#334155",
            }}
          >
            <Text
              style={{
                color:
                  selectedFilter === filter ? "#F8FAFC" : "#94A3B8",
                fontWeight: "600",
                fontSize: 12,
                textTransform: "capitalize",
              }}
            >
              {filter === "all" ? "All" : filter === "earnings" ? "Earnings" : "Charges"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transactions List */}
      <View style={{ paddingHorizontal: 18 }}>
        {filteredTransactions.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Text style={{ color: "#64748B", fontWeight: "500", marginBottom: 8 }}>
              No transactions yet
            </Text>
            <Text style={{ color: "#475569", fontSize: 12 }}>
              Complete rides to earn money
            </Text>
          </View>
        ) : (
          <>
            <Text
              style={{
                color: "#CBD5E1",
                fontWeight: "700",
                marginBottom: 12,
                fontSize: 14,
              }}
            >
              Recent Transactions
            </Text>
            <FlatList
              data={filteredTransactions}
              renderItem={renderTransaction}
              keyExtractor={(item) => `${item.id}-${item.type}`}
              scrollEnabled={false}
              onEndReached={() => {
                if (filteredTransactions.length >= 20) {
                  loadMoreTransactions();
                }
              }}
            />
          </>
        )}
      </View>

      {/* Info Box */}
      <View
        style={{
          marginHorizontal: 18,
          marginTop: 24,
          marginBottom: 40,
          backgroundColor: "#172554",
          borderRadius: 12,
          padding: 15,
          borderWidth: 1,
          borderColor: "#2563EB",
        }}
      >
        <Text
          style={{
            color: "#DBEAFE",
            fontWeight: "700",
            marginBottom: 8,
          }}
        >
          💡 How Your Wallet Works
        </Text>
        <Text style={{ color: "#BFDBFE", fontSize: 12, lineHeight: 16 }}>
          • You earn 80% of each ride fare{"\n"}
          • SafeZone takes 20% platform fee{"\n"}
          • Transactions show real earnings and charges{"\n"}
          • Pending amounts await webhook confirmation{"\n"}
          • Failed transactions can be retried
        </Text>
      </View>
    </ScrollView>
  );
}

export default WalletScreen;

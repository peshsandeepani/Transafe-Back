import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import API from "../services/api";
import { firestore } from "../services/firebase";
import styles from "../styles/styles";

function RiderDashboardScreen({ token, user, setScreen, currentRideRequest }) {
  const [activeRequests, setActiveRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    setLoading(true);

    // Query for rider's active ride requests
    const requestsQuery = query(
      collection(firestore, "liveRideRequests"),
      where("riderId", "==", user.id),
      where("status", "in", ["requested", "accepted", "picked_up"]),
      orderBy("createdAtServer", "desc")
    );

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setActiveRequests(docs);
        setLoading(false);
      },
      (err) => {
        console.log("Ride requests listener error:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.id]);

  const handleViewRequest = (request) => {
    if (request.status === "requested") {
      // Searching for driver
      setCurrentRideRequest(request.id);
      setScreen("rideSearching");
    } else if (request.status === "accepted" || request.status === "picked_up") {
      // Ride accepted, show tracking
      setCurrentRideRequest(request.id);
      setScreen("rideTracking");
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "requested":
        return "#3B82F6";
      case "accepted":
        return "#10B981";
      case "picked_up":
        return "#F59E0B";
      default:
        return "#6B7280";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "requested":
        return "Searching...";
      case "accepted":
        return "Driver accepted";
      case "picked_up":
        return "On the way";
      default:
        return status;
    }
  };

  return (
    <ScrollView style={styles.card}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <View>
          <Text style={{ fontSize: 24, fontWeight: "bold" }}>Your Rides</Text>
          <Text style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>
            Rider: {user?.name || "Current user"}
          </Text>
        </View>
      </View>

      {loading && (
        <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={{ color: "#64748B", marginTop: 12 }}>Loading your rides...</Text>
        </View>
      )}

      {!loading && activeRequests.length === 0 && (
        <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🚕</Text>
          <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>No active rides</Text>
          <Text style={{ color: "#64748B", textAlign: "center", marginBottom: 20 }}>
            Start by booking a ride
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: "#3B82F6",
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
            }}
            onPress={() => setScreen("rideRequest")}
          >
            <Text style={{ color: "white", fontWeight: "bold" }}>Book a Ride</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && activeRequests.length > 0 && (
        <View>
          {activeRequests.map((request) => (
            <TouchableOpacity
              key={request.id}
              style={{
                backgroundColor: "#F8FAFC",
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderLeftWidth: 4,
                borderLeftColor: getStatusBadgeColor(request.status),
              }}
              onPress={() => handleViewRequest(request)}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "bold" }}>
                    {request.pickupAddress || "Pickup Location"}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                    to {request.destinationAddress || "Destination"}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: getStatusBadgeColor(request.status),
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>
                    {getStatusLabel(request.status)}
                  </Text>
                </View>
              </View>

              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E2E8F0" }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={{ color: "#64748B", fontSize: 12 }}>
                    💰 Estimated: LKR {request.estimatedFare || "0.00"}
                  </Text>
                  <Text style={{ color: "#64748B", fontSize: 12 }}>
                    🚗 {request.vehicleType || "Any"}
                  </Text>
                </View>

                {request.status === "accepted" && request.driverName && (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ color: "#10B981", fontSize: 12, fontWeight: "bold" }}>
                      ✅ Driver: {request.driverName}
                    </Text>
                    <Text style={{ color: "#94A3B8", fontSize: 12, marginLeft: 8 }}>
                      ETA: {request.eta || "calculating..."}
                    </Text>
                  </View>
                )}

                {request.status === "requested" && (
                  <Text style={{ color: "#3B82F6", fontSize: 12, fontWeight: "bold" }}>
                    🔍 Finding nearby drivers...
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={{
          backgroundColor: "#3B82F6",
          padding: 16,
          borderRadius: 10,
          marginTop: 16,
        }}
        onPress={() => setScreen("rideRequest")}
      >
        <Text style={{ color: "white", fontWeight: "bold", textAlign: "center", fontSize: 16 }}>
          + Book New Ride
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

export default RiderDashboardScreen;

import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";

import API from "../services/api";
import styles from "../styles/styles";

function PoliceSosAlertsScreen({ token, user, setSelectedSosAlert, setScreen }) {
  const [sosAlerts, setSosAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [policeDepartment, setPoliceDepartment] = useState(null);
  const [radius] = useState(10);

 const fetchPoliceStationAndSOSAlerts = async () => {
  try {
    if (!user?.policeDepartmentId) {
      Alert.alert("Error", "Police department not assigned.");
      return;
    }

    setLoading(true);

    const deptRes = await API.get("/police-departments", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (deptRes.data && deptRes.data.length > 0) {
      const dept = deptRes.data[0];
      setPoliceDepartment(dept);

      const sosRes = await API.post(
        "/police-departments/nearby-sos",
        { radius },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Sort by newest first (highest ID first)
      const sortedAlerts = (sosRes.data.alerts || []).sort((a, b) => Number(b.id) - Number(a.id));
      setSosAlerts(sortedAlerts);
    }
  } catch (error) {
    console.log("SOS Alerts fetch error:", error.response?.data || error.message);
    Alert.alert("Error", "Could not fetch SOS alerts");
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  useEffect(() => {
    fetchPoliceStationAndSOSAlerts();

    const intervalId = setInterval(() => {
      fetchPoliceStationAndSOSAlerts();
    }, 10000);

    return () => clearInterval(intervalId);
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPoliceStationAndSOSAlerts();
  };

  const respondToSOS = async (sosId) => {
    try {
      await API.post(
        "/police-departments/respond-sos",
        { sosId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert(
        "✅ Police Response Recorded",
        "Your response has been recorded successfully."
      );

      onRefresh();
    } catch (error) {
      console.log("Respond error:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to respond to SOS alert");
    }
  };

  const getSosRoleIcon = (role) => {
    switch (role?.toLowerCase()) {
      case "parent":
        return "👨‍👩‍👧";
      case "student":
        return "👨‍🎓";
      case "driver":
        return "🚗";
      case "ambulance_driver":
        return "🚑";
      default:
        return "👤";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "#ff6b6b";
      case "Responding":
        return "#ffd93d";
      case "Resolved":
        return "#6bcf7f";
      default:
        return "#999";
    }
  };

  return (
    <View style={styles.container}>
      {!user?.policeDepartmentId ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            marginTop: 40,
          }}
        >
          <Text style={styles.title}>⚠️ Setup Required</Text>

          <Text style={styles.subtitle}>
            Police department not assigned to your account.
          </Text>

          <Text
            style={{
              marginTop: 10,
              color: "#999",
              textAlign: "center",
              paddingHorizontal: 20,
            }}
          >
            Please contact your administrator to assign you to a police station.
          </Text>

          <TouchableOpacity
            style={[styles.button, { marginTop: 20 }]}
            onPress={() => setScreen("dashboard")}
          >
            <Text style={styles.buttonText}>← Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.title}>🆘 Nearby SOS Alerts</Text>

          {policeDepartment && (
            <Text style={styles.subtitle}>
              From {policeDepartment.stationName} • Within {radius}km •{" "}
              {sosAlerts.length} alert{sosAlerts.length !== 1 ? "s" : ""}
            </Text>
          )}

          {loading && !refreshing && (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="large" color="#ff6b6b" />
              <Text style={{ marginTop: 10 }}>Loading SOS alerts...</Text>
            </View>
          )}

          {!loading && sosAlerts.length === 0 && (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={styles.subtitle}>No SOS alerts nearby</Text>
              <Text style={{ marginTop: 10, color: "#666" }}>
                No active emergencies in your area
              </Text>
            </View>
          )}

          <ScrollView
            style={{ flex: 1 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {sosAlerts.map((alert) => (
              <View key={alert.id}>
                <TouchableOpacity
                  style={[
                    styles.card,
                    {
                      borderLeftColor: getStatusColor(alert.status),
                      borderLeftWidth: 4,
                      borderTopColor: "#ff6b6b",
                      borderTopWidth: 2,
                    },
                  ]}
                  onPress={() => {
                    setSelectedSosAlert(alert);
                    setScreen("policeSosMap");
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    <Text style={{ fontSize: 28, marginRight: 10 }}>🆘</Text>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>
                        {getSosRoleIcon(alert.senderRole)} {alert.senderName}
                      </Text>

                      <Text style={styles.subtitle}>{alert.senderRole}</Text>

                      <View style={{ marginTop: 8 }}>
                        <Text style={{ color: "#666", fontSize: 12 }}>
                          📍 {Number(alert.latitude).toFixed(4)},{" "}
                          {Number(alert.longitude).toFixed(4)}
                        </Text>

                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            marginTop: 8,
                          }}
                        >
                          <Text style={{ color: "#ff6b6b", fontWeight: "bold" }}>
                            {alert.distance?.toFixed(1)}km away
                          </Text>

                          <Text
                            style={{
                              color: getStatusColor(alert.status),
                              fontWeight: "bold",
                            }}
                          >
                            {alert.status || "Active"}
                          </Text>
                        </View>
                      </View>

                      {alert.vehicleId && (
                        <Text
                          style={{
                            color: "#666",
                            marginTop: 5,
                            fontSize: 12,
                          }}
                        >
                          🚗 Vehicle: {alert.vehicleId}
                        </Text>
                      )}

                      <Text style={{ color: "#999", marginTop: 8, fontSize: 11 }}>
                        {new Date(alert.createdAt).toLocaleString()}
                      </Text>

                      <Text
                        style={{
                          color: "#0066cc",
                          marginTop: 8,
                          fontSize: 12,
                        }}
                      >
                        Tap to open map and full details
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

               
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.button, { marginBottom: 10 }]}
            onPress={onRefresh}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Refreshing..." : "🔄 Refresh"}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

export default PoliceSosAlertsScreen;
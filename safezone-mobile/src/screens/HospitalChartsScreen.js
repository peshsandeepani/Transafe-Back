import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { PieChart, BarChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";

import API from "../services/api";
import styles from "../styles/styles";

function HospitalChartsScreen({ token, user, setScreen }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hospitalName, setHospitalName] = useState("");

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch hospital info
      const hospitalRes = await API.get(`/hospitals/${user?.hospitalId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (hospitalRes.data) {
        setHospitalName(hospitalRes.data.name || "Hospital");
      }

      // Fetch SOS alerts within 10km
      const sosRes = await API.get("/sos", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let sosAlerts = sosRes.data || [];
      
      // Filter to only active SOS alerts within 10km
      if (hospitalRes.data) {
        const hospitalLat = Number(hospitalRes.data.latitude);
        const hospitalLon = Number(hospitalRes.data.longitude);
        
        sosAlerts = sosAlerts
          .map((alert) => {
            const distance = calculateDistanceKm(
              hospitalLat,
              hospitalLon,
              Number(alert.latitude),
              Number(alert.longitude)
            );
            return { ...alert, distance };
          })
          .filter((alert) => alert.distance <= 10);
      }

      const sosActive = sosAlerts.filter((a) => a.status === "Active").length;
      const sosResolved = sosAlerts.filter((a) => a.status === "Resolved").length;
      const sosTotal = sosAlerts.length;

      // Fetch ambulance trips for this hospital
      const tripsRes = await API.get(`/ambulance-trips/hospital/${user?.hospitalId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const activeTrips = tripsRes.data.activeTrips || [];
      const completedTrips = tripsRes.data.completedTrips || [];
      const tripsTotal = activeTrips.length + completedTrips.length;

      setStats({
        sos: {
          total: sosTotal,
          resolved: sosResolved,
          active: sosActive,
        },
        trips: {
          total: tripsTotal,
          completed: completedTrips.length,
          active: activeTrips.length,
        },
      });
    } catch (error) {
      console.log(error.response?.data || error.message);
      Alert.alert("Error", "Failed to load hospital statistics");
    } finally {
      setLoading(false);
    }
  };

  const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  useEffect(() => {
    if (!token) return;
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [token]);

  if (loading || !stats) {
    return (
      <View style={{ flex: 1, paddingTop: 40, backgroundColor: "#111827" }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  const sosResolved = stats.sos.total
    ? Math.round((stats.sos.resolved / stats.sos.total) * 100)
    : 0;

  const tripsCompleted = stats.trips.total
    ? Math.round((stats.trips.completed / stats.trips.total) * 100)
    : 0;

  const chartWidth = Dimensions.get("window").width - 46;

  const sosData = [
    {
      name: "Resolved",
      count: stats.sos.resolved,
      color: "#10B981",
    },
    {
      name: "Active",
      count: stats.sos.active,
      color: "#DC2626",
    },
  ];

  const tripsData = [
    {
      name: "Completed",
      count: stats.trips.completed,
      color: "#10B981",
    },
    {
      name: "Active",
      count: stats.trips.active,
      color: "#F97316",
    },
  ];

  const chartData = {
    labels: ["SOS Alerts", "Ambulance Trips"],
    datasets: [
      {
        data: [stats.sos.total, stats.trips.total],
      },
    ],
  };

  return (
    <ScrollView style={{ paddingBottom: 90, backgroundColor: "#111827" }}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📊 Hospital Charts</Text>
        <Text style={styles.info}>Hospital: {hospitalName || "N/A"}</Text>
        <Text style={styles.info}>Role: {user?.role}</Text>

        <View style={{ marginTop: 16, gap: 8 }}>
          <TouchableOpacity
            style={{
              backgroundColor: "#0F766E",
              padding: 12,
              borderRadius: 8,
              alignItems: "center",
            }}
            onPress={() => setScreen("dashboard")}
          >
            <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "600" }}>
              ← Back to Dashboard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: "#065F46",
              padding: 12,
              borderRadius: 8,
              alignItems: "center",
            }}
            onPress={() => setScreen("hospitalAmbulanceTrips")}
          >
            <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "600" }}>
              🚑 Ambulance Trips
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>SOS Alerts (10km radius)</Text>
          <Text style={styles.info}>
            Total: {stats.sos.total} | Active: {stats.sos.active} | Resolved: {stats.sos.resolved} | {sosResolved}% resolved
          </Text>

          <PieChart
            data={sosData}
            width={chartWidth}
            height={180}
            chartConfig={{
              backgroundColor: "#111827",
              backgroundGradientFrom: "#111827",
              backgroundGradientTo: "#111827",
              color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
              labelColor: (opacity = 1) => `rgba(255,255,255,${opacity})`,
            }}
            accessor="count"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>Ambulance Trips</Text>
          <Text style={styles.info}>
            Total: {stats.trips.total} | Active: {stats.trips.active} | Completed: {stats.trips.completed} | {tripsCompleted}% completed
          </Text>

          <PieChart
            data={tripsData}
            width={chartWidth}
            height={180}
            chartConfig={{
              backgroundColor: "#111827",
              backgroundGradientFrom: "#111827",
              backgroundGradientTo: "#111827",
              color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
              labelColor: (opacity = 1) => `rgba(255,255,255,${opacity})`,
            }}
            accessor="count"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <BarChart
            data={chartData}
            width={chartWidth}
            height={220}
            chartConfig={{
              backgroundColor: "#111827",
              backgroundGradientFrom: "#111827",
              backgroundGradientTo: "#111827",
              color: (opacity = 1) => `rgba(15, 118, 110, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255,255,255,${opacity})`,
              barPercentage: 0.7,
            }}
            style={{ marginVertical: 8, borderRadius: 8 }}
          />
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: "#0F766E",
            padding: 12,
            borderRadius: 8,
            alignItems: "center",
            marginTop: 16,
          }}
          onPress={fetchStats}
        >
          <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "600" }}>
            🔄 Refresh Stats
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export default HospitalChartsScreen;

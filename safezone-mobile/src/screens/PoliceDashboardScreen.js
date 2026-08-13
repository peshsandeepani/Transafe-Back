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

function PoliceDashboardScreen({ token, user, setScreen }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deptName, setDeptName] = useState("");
  const [officers, setOfficers] = useState([]);

  const fetchOfficers = async () => {
    try {
      const res = await API.get("/police-departments/officers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const officersData = res.data || [];
      officersData.sort((a, b) =>
        new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0)
      );
      setOfficers(officersData);
    } catch (error) {
      console.log("Police officers fetch error:", error.response?.data || error.message);
      if (error.response?.status === 404) {
        setOfficers([]);
      } else {
        Alert.alert("Error", "Failed to load police officer details");
      }
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch police department info
      const deptRes = await API.get("/police-departments", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (deptRes.data && deptRes.data.length > 0) {
        setDeptName(deptRes.data[0].stationName || "Police Station");
      }

      // Fetch nearby SOS alerts and incidents
      const sosRes = await API.post(
        "/police-departments/nearby-sos",
        { radius: 10 },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const incidentRes = await API.post(
        "/police-departments/nearby-incidents",
        { radius: 10 },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const sosAlerts = sosRes.data.alerts || [];
      const incidents = incidentRes.data.incidents || [];

      const sosActive = sosAlerts.filter((a) => a.status === "Active").length;
      const sosResolved = sosAlerts.filter((a) => a.status === "Resolved").length;
      const sosTotal = sosAlerts.length;

      const incidentsActive = incidents.filter((i) => i.status === "Active").length;
      const incidentsResolved = incidents.filter((i) => i.status === "Resolved").length;
      const incidentsTotal = incidents.length;

      setStats({
        sos: {
          total: sosTotal,
          resolved: sosResolved,
          active: sosActive,
        },
        incidents: {
          total: incidentsTotal,
          resolved: incidentsResolved,
          active: incidentsActive,
        },
      });
    } catch (error) {
      console.log(error.response?.data || error.message);
      Alert.alert("Error", "Failed to load police statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchStats();
    fetchOfficers();
    const interval = setInterval(() => {
      fetchStats();
      fetchOfficers();
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [token]);

  if (loading || !stats) {
    return (
      <View style={{ flex: 1, paddingTop: 40, backgroundColor: "#111827" }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  const incidentResolved = stats.incidents.total
    ? Math.round((stats.incidents.resolved / stats.incidents.total) * 100)
    : 0;

  const sosResolved = stats.sos.total
    ? Math.round((stats.sos.resolved / stats.sos.total) * 100)
    : 0;

  const chartWidth = Dimensions.get("window").width - 46;

  const roadIncidentData = [
    {
      name: "Resolved",
      count: stats.incidents.resolved,
      color: "#10B981",
    },
    {
      name: "Active",
      count: stats.incidents.active,
      color: "#F97316",
    },
  ];

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

  const chartData = {
    labels: ["SOS Alerts", "Road Incidents"],
    datasets: [
      {
        data: [stats.sos.total, stats.incidents.total],
      },
    ],
  };

  return (
    <ScrollView style={{ paddingBottom: 90, backgroundColor: "#111827" }}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📊 Police Dashboard</Text>
        <Text style={styles.info}>Department: {deptName || "N/A"}</Text>
        <Text style={styles.info}>Role: {user?.role}</Text>

        <View style={{ marginTop: 16, gap: 8 }}>
          <TouchableOpacity
            style={{
              backgroundColor: "#1E40AF",
              padding: 12,
              borderRadius: 8,
              alignItems: "center",
            }}
            onPress={() => setScreen("policeAdminDashboard")}
          >
            <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "600" }}>
              👮 Police Admin Dashboard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: "#0F766E",
              padding: 12,
              borderRadius: 8,
              alignItems: "center",
            }}
            onPress={() => setScreen("registerPoliceOfficer")}
          >
            <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "600" }}>
              👮‍♂️ Register Police Officer
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>Police Officers</Text>
          <Text style={styles.info}>Total registered: {officers.length}</Text>

          {officers.length === 0 ? (
            <Text style={styles.info}>No officers registered yet.</Text>
          ) : (
            officers.map((officer) => (
              <View
                key={officer.id}
                style={[styles.officerCard, { marginTop: 12 }]}
              >
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{officer.name || officer.officerName || "Officer"}</Text>
                    <Text style={styles.infoHighlight}>{officer.rank || "Rank unavailable"}</Text>
                  </View>
                  {officer.status && (
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: officer.status === "Active" ? "#22c55e" : "#f97316" },
                      ]}
                    >
                      <Text style={styles.badgeText}>{officer.status}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <View style={styles.detailColumn}>
                    <Text style={styles.detailLabel}>Badge</Text>
                    <Text style={styles.detailValue}>{officer.badgeNumber || "N/A"}</Text>
                  </View>
                  <View style={styles.detailColumn}>
                    <Text style={styles.detailLabel}>License</Text>
                    <Text style={styles.detailValue}>{officer.licenseNumber || "N/A"}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailColumn}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{officer.email || "Not available"}</Text>
                  </View>
                  <View style={styles.detailColumn}>
                    <Text style={styles.detailLabel}>Joined</Text>
                    <Text style={styles.detailValue}>
                      {officer.createdAt
                        ? new Date(officer.createdAt).toLocaleDateString()
                        : "—"}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>Road Incidents (10km radius)</Text>
          <Text style={styles.info}>
            Total: {stats.incidents.total} | Active: {stats.incidents.active} | Resolved: {stats.incidents.resolved} | {incidentResolved}% resolved
          </Text>

          <PieChart
            data={roadIncidentData}
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

export default PoliceDashboardScreen;

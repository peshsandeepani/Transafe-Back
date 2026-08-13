import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import API from "../services/api";
import styles from "../styles/styles";

function PoliceAdminDashboardScreen({ user, token, setScreen }) {
  const [sosCount, setSosCount] = useState(0);
  const [incidentCount, setIncidentCount] = useState(0);
  const [stats, setStats] = useState(null);
  const [officers, setOfficers] = useState([]);
  const [deptName, setDeptName] = useState("");
  const [loading, setLoading] = useState(false);

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

      const deptRes = await API.get("/police-departments", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (deptRes.data && deptRes.data.length > 0) {
        setDeptName(deptRes.data[0].stationName || "Police Station");
      }

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

      setSosCount(sosAlerts.length);
      setIncidentCount(incidents.length);

      const sosActive = sosAlerts.filter((a) => a.status === "Active").length;
      const sosResolved = sosAlerts.filter((a) => a.status === "Resolved").length;
      const incidentsActive = incidents.filter((i) => i.status === "Active").length;
      const incidentsResolved = incidents.filter((i) => i.status === "Resolved").length;

      setStats({
        sos: {
          total: sosAlerts.length,
          active: sosActive,
          resolved: sosResolved,
        },
        incidents: {
          total: incidents.length,
          active: incidentsActive,
          resolved: incidentsResolved,
        },
      });
    } catch (error) {
      console.log("Police dashboard fetch error:", error.response?.data || error.message);
      Alert.alert("Error", "Could not load police dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.policeDepartmentId && token) {
      fetchStats();
      fetchOfficers();
      const interval = setInterval(() => {
        fetchStats();
        fetchOfficers();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user, token]);

  if (loading && !stats) {
    return (
      <View style={{ flex: 1, paddingTop: 40, backgroundColor: "#111827" }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#111827" }}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>👮 Police Admin Dashboard</Text>

        <Text style={styles.info}>Welcome {user.name}</Text>
        <Text style={styles.info}>Department: {deptName || "Police Station"}</Text>
        <Text style={styles.info}>
          Police Department ID: {user.policeDepartmentId || "Not Assigned"}
        </Text>

        <View style={{ marginTop: 24, gap: 8 }}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setScreen("registerPoliceOfficer")}
          >
            <Text style={styles.menuText}>👮 Register Police Officers</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>Officer Roster</Text>
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
                    <Text style={styles.cardTitle}>
                      {officer.name || officer.officerName || "Officer"}
                    </Text>
                    <Text style={styles.infoHighlight}>
                      {officer.rank || "Rank unavailable"}
                    </Text>
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

        <View style={{ marginTop: 24, gap: 8 }}>
          <TouchableOpacity
            style={[
              styles.menuButton,
              sosCount > 0 && { backgroundColor: "#DC2626" },
            ]}
            onPress={() => setScreen("policeSosAlerts")}
          >
            <Text style={styles.menuText}>
              🚨 Nearby SOS Alerts ({sosCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.menuButton,
              incidentCount > 0 && { backgroundColor: "#F97316" },
            ]}
            onPress={() => setScreen("policeNearbyIncidents")}
          >
            <Text style={styles.menuText}>
              ⚠️ Nearby Road Incidents ({incidentCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={fetchStats}
          >
            <Text style={styles.menuText}>🔄 Refresh Data</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setScreen("registerPoliceOfficer")}
          >
            <Text style={styles.menuText}>👮 Register Police Officers</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

export default PoliceAdminDashboardScreen;
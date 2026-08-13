import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";

import API from "../services/api";
import styles from "../styles/styles";

function AdminSystemOverviewScreen({ token, user, setScreen }) {
  const [incidentData, setIncidentData] = useState([]);
  const [sosData, setSosData] = useState([]);
  const [filter, setFilter] = useState("active");
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);

      const [incidentsRes, sosRes] = await Promise.all([
        API.get("/road-incidents", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        API.get("/sos", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      // Sort by newest first (highest ID first)
      const sortedIncidents = (incidentsRes.data || []).sort((a, b) => Number(b.id) - Number(a.id));
      const sortedSos = (sosRes.data || []).sort((a, b) => Number(b.id) - Number(a.id));
      setIncidentData(sortedIncidents);
      setSosData(sortedSos);
    } catch (error) {
      console.log(error.response?.data || error.message);
      Alert.alert("Error", "Failed to load admin system history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchHistory();
    }
  }, [token]);

  const isResolved = (status) => {
    const normalized = String(status || "").toLowerCase();
    return normalized === "resolved";
  };

  const filteredIncidents = incidentData.filter((item) => {
    if (filter === "resolved") {
      return isResolved(item.status);
    }

    return !isResolved(item.status);
  });

  const filteredSos = sosData.filter((item) => {
    if (filter === "resolved") {
      return isResolved(item.status);
    }

    return !isResolved(item.status);
  });

  const getStatusColor = (status) => {
    if (isResolved(status)) {
      return "#10B981";
    }

    return "#FBBF24";
  };

  return (
    <ScrollView style={{ paddingBottom: 60 }}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Admin System Overview</Text>
        <Text style={styles.info}>
          System-wide historical records from PostgreSQL / Prisma
        </Text>

        <View
          style={{
            flexDirection: "row",
            marginTop: 12,
            marginBottom: 20,
            gap: 10,
          }}
        >
          <TouchableOpacity
            style={[
              styles.menuButton,
              { flex: 1, backgroundColor: filter === "active" ? "#DC2626" : "#374151" },
            ]}
            onPress={() => setFilter("active")}
          >
            <Text style={styles.menuText}>New / Active</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.menuButton,
              { flex: 1, backgroundColor: filter === "resolved" ? "#10B981" : "#374151" },
            ]}
            onPress={() => setFilter("resolved")}
          >
            <Text style={styles.menuText}>Resolved</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={fetchHistory}
          disabled={loading}
        >
          <Text style={styles.menuText}>
            {loading ? "Loading..." : "Refresh History"}
          </Text>
        </TouchableOpacity>

        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>Road Incidents</Text>

          {filteredIncidents.length === 0 ? (
            <Text style={styles.info}>No road incidents in this filter</Text>
          ) : (
            filteredIncidents.map((incident) => (
              <View key={incident.id} style={styles.incidentCard}>
                <Text style={styles.incidentTitle}>
                  ⚠️ Incident #{incident.id}
                </Text>

                <Text style={styles.info}>Type: {incident.type}</Text>
                <Text style={styles.info}>
                  Location: {incident.locationName || "Unknown"}
                </Text>
                <Text style={styles.info}>
                  Lat/Lng: {incident.latitude}, {incident.longitude}
                </Text>
                <Text style={styles.info}>
                  Reporter: {incident.reportedBy}
                </Text>
                <Text style={styles.info}>
                  Created: {new Date(incident.createdAt).toLocaleString()}
                </Text>
                <Text
                  style={[
                    styles.warningText,
                    { color: getStatusColor(incident.status) },
                  ]}
                >
                  Status: {incident.status}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={{ marginTop: 30 }}>
          <Text style={styles.sectionTitle}>SOS Alerts</Text>

          {filteredSos.length === 0 ? (
            <Text style={styles.info}>No SOS alerts in this filter</Text>
          ) : (
            filteredSos.map((alert) => (
              <View key={alert.id} style={[styles.incidentCard, { borderColor: "#DC2626", borderWidth: 2 }]}>
                <Text style={styles.incidentTitle}>🚨 SOS #{alert.id}</Text>
                <Text style={styles.info}>Sender: {alert.senderName}</Text>
                <Text style={styles.info}>Role: {alert.senderRole}</Text>
                <Text style={styles.info}>Vehicle: {alert.vehicleId || "Not assigned"}</Text>
                <Text style={styles.info}>
                  Location: {alert.latitude}, {alert.longitude}
                </Text>
                <Text style={styles.info}>
                  User ID: {alert.userId}
                </Text>
                <Text style={styles.info}>
                  Created: {new Date(alert.createdAt).toLocaleString()}
                </Text>
                <Text
                  style={[
                    styles.warningText,
                    { color: getStatusColor(alert.status) },
                  ]}
                >
                  Status: {alert.status}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

export default AdminSystemOverviewScreen;

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";

import API from "../services/api";
import styles from "../styles/styles";

const BASE_URL = "http://172.29.112.1:5000";

function PoliceNearbyIncidentsScreen({
  token,
  user,
  setScreen,
  setSelectedIncident,
  policeRespondedIncidents = [],
  setPoliceRespondedIncidents,
}) {
  const [nearbyIncidents, setNearbyIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [policeDepartment, setPoliceDepartment] = useState(null);
  const [radius, setRadius] = useState(10);
  const [showShareModal, setShowShareModal] = useState(false);
  const [availableOfficers, setAvailableOfficers] = useState([]);
  const [selectedOfficers, setSelectedOfficers] = useState([]);
  const [currentIncident, setCurrentIncident] = useState(null);

  useEffect(() => {
    getPoliceStationAndFetchIncidents();
    const interval = setInterval(getPoliceStationAndFetchIncidents, 30000);
    return () => clearInterval(interval);
  }, []);

  const getPoliceStationAndFetchIncidents = async () => {
    try {
      if (!user?.policeDepartmentId) {
        setLoading(false);
        return (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", marginTop: 40 }}>
            <Text style={styles.title}>⚠️ Setup Required</Text>
            <Text style={styles.subtitle}>
              Police department not assigned to your account.
            </Text>
            <Text style={{ marginTop: 10, color: "#999", textAlign: "center" }}>
              Please contact your administrator to assign you to a police station.
            </Text>
          </View>
        );
      }

      // Get police department details for location
      const deptRes = await API.get(
        `/police-departments`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (deptRes.data && deptRes.data.length > 0) {
        const dept = deptRes.data[0];
        setPoliceDepartment(dept);
        await fetchNearbyIncidents(dept.latitude, dept.longitude, radius);
      } else {
        Alert.alert("Error", "Police department not found in database");
      }
    } catch (error) {
      console.log("Police station fetch error:", error);
      const errorMsg = error.response?.data?.error || "Could not fetch police station location";
      Alert.alert("Error", errorMsg);
    }
  };

 const fetchNearbyIncidents = async (latitude, longitude, searchRadius) => {
  try {
    setLoading(true);

    const res = await API.post(
      "/police-departments/nearby-incidents",
      { radius: searchRadius },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const fetchedIncidents = res.data.incidents || [];

    setNearbyIncidents(() => {
      const merged = [...fetchedIncidents];

      policeRespondedIncidents.forEach((respondedIncident) => {
        const exists = merged.some(
          (item) => item.id === respondedIncident.id
        );

        if (!exists) {
          merged.push(respondedIncident);
        }
      });

      return merged;
    });
  } catch (error) {
    console.log("Fetch error:", error);
    Alert.alert("Error", "Could not fetch nearby incidents");
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  const onRefresh = () => {
    setRefreshing(true);
    getPoliceStationAndFetchIncidents();
  };

  const handleIncidentPress = (incident) => {
  setSelectedIncident(incident);
  setScreen("roadIncidentMap");
};

 const respondToIncident = async (incidentId) => {
  try {
    const response = await API.post(
      "/police-departments/respond-incident",
      { incidentId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    Alert.alert("✅ Noted", "Your response has been recorded.");

    const incident = nearbyIncidents.find((i) => i.id === incidentId);

    if (!incident) return;

    const updatedIncident = {
      ...incident,
      status: "Responding",
    };

    setNearbyIncidents((prev) =>
      prev.map((item) =>
        item.id === incidentId ? updatedIncident : item
      )
    );

    setPoliceRespondedIncidents((prev) => {
      const exists = prev.some((item) => item.id === updatedIncident.id);
      return exists ? prev : [...prev, updatedIncident];
    });

    if (response.data?.officers) {
      setCurrentIncident(updatedIncident);
      setAvailableOfficers(response.data.officers);
      setSelectedOfficers([]);
      setShowShareModal(true);
    }
  } catch (error) {
    console.log("Respond error:", error.response?.data || error.message);
    Alert.alert("Error", "Failed to respond to incident");
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

  const toggleOfficerSelection = (officerId) => {
    setSelectedOfficers((prev) =>
      prev.includes(officerId)
        ? prev.filter((id) => id !== officerId)
        : [...prev, officerId]
    );
  };

  const shareIncident = async () => {
    if (selectedOfficers.length === 0) {
      Alert.alert("Info", "Please select at least one officer to share with");
      return;
    }

    try {
      await API.post(
        "/police-departments/share-incident",
        {
          incidentId: currentIncident.id,
          officerIds: selectedOfficers,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert(
        "✅ Shared",
        `Incident shared with ${selectedOfficers.length} officer(s)`
      );
      setShowShareModal(false);
      setCurrentIncident(null);
      setAvailableOfficers([]);
      setSelectedOfficers([]);
     
    } catch (error) {
      console.log("Share error:", error);
      Alert.alert("Error", "Failed to share incident");
    }
  };

  const getIncidentTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "accident":
        return "🚗";
      case "falling tree":
        return "🌳";
      case "damaged road":
        return "🕳️";
      case "flood":
        return "🌊";
      case "traffic jam":
        return "🚦";
      default:
        return "⚠️";
    }
  };

  // Sort incidents by newest first
  const sortedNearbyIncidents = (nearbyIncidents || []).sort((a, b) => Number(b.id) - Number(a.id));

  return (
    <View style={styles.container}>
      {!user?.policeDepartmentId ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", marginTop: 40 }}>
          <Text style={styles.title}>⚠️ Setup Required</Text>
          <Text style={styles.subtitle}>
            Police department not assigned to your account.
          </Text>
          <Text style={{ marginTop: 10, color: "#999", textAlign: "center", paddingHorizontal: 20 }}>
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
          <Text style={styles.title}>🚨 Nearby Road Incidents (Police)</Text>

          {policeDepartment && (
            <Text style={styles.subtitle}>
              From {policeDepartment.stationName} • Within {radius}km • {sortedNearbyIncidents.length} incident
              {sortedNearbyIncidents.length !== 1 ? "s" : ""}
            </Text>
          )}

          {loading && !refreshing && (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator size="large" color="#0066cc" />
              <Text style={{ marginTop: 10 }}>Loading nearby incidents...</Text>
            </View>
          )}

          {!loading && sortedNearbyIncidents.length === 0 && (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <Text style={styles.subtitle}>No incidents nearby</Text>
              <Text style={{ marginTop: 10, color: "#666" }}>
                Area is safe! 🛡️
              </Text>
            </View>
          )}

          <ScrollView
            style={{ flex: 1 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {sortedNearbyIncidents.map((incident) => (
          <View key={incident.id}>
            <TouchableOpacity
              style={[
                styles.card,
                {
                  borderLeftColor: getStatusColor(incident.status),
                  borderLeftWidth: 4,
                },
              ]}
              onPress={() => handleIncidentPress(incident)}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <Text style={{ fontSize: 24, marginRight: 10 }}>
                  {getIncidentTypeIcon(incident.type)}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {incident.type?.charAt(0).toUpperCase() + incident.type?.slice(1) || "Incident"}
                  </Text>
                  <Text style={styles.subtitle} numberOfLines={2}>
                    {incident.description || "No description"}
                  </Text>

                  {incident.locationName && (
                    <Text style={{ color: "#666", marginTop: 5 }}>
                      📍 {incident.locationName}
                    </Text>
                  )}

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginTop: 8,
                    }}
                  >
                    <Text style={{ color: "#0066cc", fontWeight: "bold" }}>
                      {incident.distance?.toFixed(1)}km away
                    </Text>
                    <Text
                      style={{
                        color: getStatusColor(incident.status),
                        fontWeight: "bold",
                      }}
                    >
                      {incident.status || "Active"}
                    </Text>
                  </View>

                  {incident.respondingDriverName && (
                    <Text style={{ color: "#666", marginTop: 5, fontSize: 12 }}>
                      👤 {incident.respondingDriverName} responding
                    </Text>
                  )}

                  {incident.imageUrl && (
                    <Image
                      source={{
                        uri: `${BASE_URL}${incident.imageUrl}`,
                      }}
                      style={{
                        width: "100%",
                        height: 150,
                        borderRadius: 10,
                        marginTop: 10,
                        backgroundColor: "#E5E7EB",
                      }}
                      resizeMode="cover"
                      onError={(error) => {
                        console.log("Image error:", error);
                      }}
                    />
                  )}
                </View>
              </View>
            </TouchableOpacity>

        {incident.status !== "Police Responding" &&
 incident.status !== "Resolved" && (
  <TouchableOpacity
    style={[styles.button, { marginHorizontal: 10, marginBottom: 10 }]}
    onPress={() => respondToIncident(incident.id)}
  >
    <Text style={styles.buttonText}>🚔 Police Respond</Text>
  </TouchableOpacity>
)}
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

      {/* Share Incident Modal */}
      {showShareModal && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "flex-end",
            zIndex: 999,
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              maxHeight: "80%",
            }}
          >
            <Text style={styles.title}>📢 Share Incident with Officers</Text>
            <Text style={styles.subtitle}>
              Select officers to notify about this incident
            </Text>

            <ScrollView style={{ maxHeight: 300, marginVertical: 15 }}>
              {availableOfficers.map((officer) => (
                <TouchableOpacity
                  key={officer.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 8,
                    backgroundColor: selectedOfficers.includes(officer.id)
                      ? "#E3F2FD"
                      : "#F5F5F5",
                    borderWidth: selectedOfficers.includes(officer.id) ? 2 : 0,
                    borderColor: "#0066cc",
                  }}
                  onPress={() => toggleOfficerSelection(officer.id)}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      borderWidth: 2,
                      borderColor: "#0066cc",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12,
                    }}
                  >
                    {selectedOfficers.includes(officer.id) && (
                      <Text style={{ color: "#0066cc", fontSize: 16 }}>✓</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "bold", color: "#333" }}>
                      👮 {officer.name}
                    </Text>
                    <Text style={{ color: "#666", fontSize: 12 }}>
                      {officer.email}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginTop: 15,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    flex: 1,
                    backgroundColor: "#999",
                  },
                ]}
                onPress={() => {
                  setShowShareModal(false);
                  setCurrentIncident(null);
                  setAvailableOfficers([]);
                  setSelectedOfficers([]);
                  onRefresh();
                }}
              >
                <Text style={styles.buttonText}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    flex: 1,
                    backgroundColor: selectedOfficers.length > 0 ? "#6bcf7f" : "#CCC",
                  },
                ]}
                onPress={shareIncident}
                disabled={selectedOfficers.length === 0}
              >
                <Text style={styles.buttonText}>
                  Share ({selectedOfficers.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

export default PoliceNearbyIncidentsScreen;


import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import API from "../services/api";
import styles from "../styles/styles";

function HospitalDashboardScreen({ token, user, setScreen, nearbyIncidents = [], setSelectedIncident, setIncidentCallback }) {
  const [drivers, setDrivers] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);
  const [completedTrips, setCompletedTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hospitalName, setHospitalName] = useState("");

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

  const fetchHospitalData = async () => {
    try {
      setLoading(true);

      if (!token) {
        Alert.alert("Authentication Error", "Unable to fetch Hospital Command Center data because the auth token is missing.");
        setLoading(false);
        return;
      }

      const usersRes = await API.get("/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const ownHospitalDrivers = (usersRes.data || []).filter(
        (u) => u.role === "ambulance_driver" && u.hospitalId === user.hospitalId
      );

      setDrivers(ownHospitalDrivers);

      const tripsRes = await API.get(`/ambulance-trips/hospital/${user.hospitalId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setActiveTrips(tripsRes.data.activeTrips || []);
      setCompletedTrips(tripsRes.data.completedTrips || []);

      if (!hospitalName) {
        const hospitalsRes = await API.get("/hospitals", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const hospital = (hospitalsRes.data || []).find(
          (item) => String(item.id) === String(user.hospitalId)
        );
        setHospitalName(hospital?.name || "My Hospital");
      }
    } catch (error) {
      console.log("Hospital Command Center fetch error:", error.response?.data || error.message);
      Alert.alert("Error", "Could not load Hospital Command Center data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.hospitalId && token) {
      fetchHospitalData();
      const interval = setInterval(fetchHospitalData, 30000);
      return () => clearInterval(interval);
    }
  }, [user, token]);

  const renderTripCard = (trip, isCompleted = false) => (
    <View
      key={trip.id}
      style={[
        styles.incidentCard,
        {
          borderColor: isCompleted ? "#6366F1" : "#DC2626",
          borderWidth: 2,
          backgroundColor: isCompleted ? "#0F172A" : "#111827",
        },
      ]}
    >
      <Text style={styles.incidentTitle}>
        {isCompleted ? "✓" : "🚑"} {trip.ambulanceId}
      </Text>

      <Text style={styles.info}>Driver: {trip.driverName || "Unknown"}</Text>
      <Text style={styles.info}>Status: {trip.status || (isCompleted ? "Completed" : "Active")}</Text>
      <Text style={styles.info}>
        From: {trip.startLatitude?.toFixed(4)}, {trip.startLongitude?.toFixed(4)}
      </Text>
      <Text style={styles.info}>
        To: {trip.endLatitude?.toFixed(4)}, {trip.endLongitude?.toFixed(4)}
      </Text>
      {isCompleted && trip.startLatitude != null && trip.endLatitude != null && (
        <Text style={styles.info}>
          Distance: {calculateDistanceKm(trip.startLatitude, trip.startLongitude, trip.endLatitude, trip.endLongitude).toFixed(2)} km
        </Text>
      )}
    </View>
  );

  if (loading && !drivers.length && !activeTrips.length && !completedTrips.length) {
    return (
      <View style={{ flex: 1, paddingTop: 40, backgroundColor: "#111827" }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#111827" }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🏥 Hospital Command Center</Text>
          <Text style={styles.info}>Welcome back, {user.name || "Hospital Admin"}</Text>
          <Text style={styles.info}>Hospital: {hospitalName || `Hospital ${user.hospitalId}`}</Text>
          <Text style={styles.info}>Hospital ID: {user.hospitalId || "Not assigned"}</Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 18 }}>
            <View style={[styles.card, { flex: 1, marginRight: 10, borderColor: "#22c55e", borderWidth: 1, backgroundColor: "#0f172a" }]}> 
              <Text style={styles.cardTitle}>Drivers</Text>
              <Text style={styles.infoHighlight}>{drivers.length}</Text>
            </View>
            <View style={[styles.card, { flex: 1, borderColor: "#f59e0b", borderWidth: 1, backgroundColor: "#0f172a" }]}> 
              <Text style={styles.cardTitle}>Active Trips</Text>
              <Text style={styles.infoHighlight}>{activeTrips.length}</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 12 }}>
            <View style={[styles.card, { flex: 1, marginRight: 10, borderColor: "#6366F1", borderWidth: 1, backgroundColor: "#0f172a" }]}> 
              <Text style={styles.cardTitle}>Completed Trips</Text>
              <Text style={styles.infoHighlight}>{completedTrips.length}</Text>
            </View>
            <TouchableOpacity style={[styles.menuButton, { flex: 1, marginTop: 0, justifyContent: "center" }]} onPress={fetchHospitalData}>
              <Text style={styles.menuText}>🔄 Refresh Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🚑 Ambulance Drivers</Text>
          {drivers.length === 0 ? (
            <Text style={styles.info}>No ambulance drivers found for this hospital.</Text>
          ) : (
            drivers.map((driver) => (
              <View key={driver.id} style={[styles.officerCard, { marginTop: 12 }]}> 
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{driver.name || "Unknown Driver"}</Text>
                    <Text style={styles.infoHighlight}>{driver.assignedVehicleId || "No vehicle assigned"}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: "#22c55e" }]}> 
                    <Text style={styles.badgeText}>Ambulance</Text>
                  </View>
                </View>

                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <View style={styles.detailColumn}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{driver.email || "N/A"}</Text>
                  </View>
                  <View style={styles.detailColumn}>
                    <Text style={styles.detailLabel}>Phone</Text>
                    <Text style={styles.detailValue}>{driver.phone || "N/A"}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🚨 Active Ambulance Trips</Text>
          {activeTrips.length === 0 ? (
            <Text style={styles.info}>No active trips right now.</Text>
          ) : (
            activeTrips.map((trip) => renderTripCard(trip, false))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📜 Completed Trips</Text>
          {completedTrips.length === 0 ? (
            <Text style={styles.info}>No completed trips available.</Text>
          ) : (
            completedTrips.map((trip) => renderTripCard(trip, true))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📍 Nearby Road Incidents</Text>
          {nearbyIncidents.length === 0 ? (
            <Text style={styles.info}>No nearby incidents reported at the moment.</Text>
          ) : (
            nearbyIncidents.map((incident) => (
              <TouchableOpacity
                key={incident.id}
                style={[styles.incidentCard, { marginTop: 12, backgroundColor: "#111827" }]}
                onPress={() => {
                  if (setSelectedIncident) {
                    setSelectedIncident(incident);
                  }
                  if (setIncidentCallback) {
                    setIncidentCallback(() => () => {});
                  }
                }}
              >
                <Text style={styles.incidentTitle}>{incident.type || "Incident"}</Text>
                <Text style={styles.info}>📍 {incident.locationName || "Unknown location"}</Text>
                <Text style={styles.info}>Distance: {incident.distance?.toFixed(1) || "N/A"} km</Text>
                <Text style={styles.warningText}>{incident.description || "No description available."}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default HospitalDashboardScreen;

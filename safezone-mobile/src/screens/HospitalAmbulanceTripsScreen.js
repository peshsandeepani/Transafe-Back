import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import API from "../services/api";
import socket from "../services/socket";
import styles from "../styles/styles";

function HospitalAmbulanceTripsScreen({ token, user, setScreen, setSelectedAmbulanceTrip }) {
  const [drivers, setDrivers] = useState([]);
  const [otherDrivers, setOtherDrivers] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);
  const [completedTrips, setCompletedTrips] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!user?.hospitalId) {
      Alert.alert("Missing Hospital", "Your account is not assigned to a hospital.");
      return;
    }

    setLoading(true);

    try {
      const usersRes = await API.get("/users", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const ownDrivers = [];
      const otherDriversRaw = [];

      (usersRes.data || []).forEach((candidate) => {
        if (candidate.role !== "ambulance_driver") return;
        if (Number(candidate.hospitalId) === Number(user.hospitalId)) {
          ownDrivers.push(candidate);
        } else {
          otherDriversRaw.push(candidate);
        }
      });

      setDrivers(ownDrivers);
      setOtherDrivers(otherDriversRaw);

      const tripsRes = await API.get(`/ambulance-trips/hospital/${user.hospitalId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const rawActiveTrips = tripsRes.data.activeTrips || [];
      const rawCompletedTrips = tripsRes.data.completedTrips || [];

      const normalizeStatus = (status) =>
        String(status || "").trim().toLowerCase();

      const allTrips = [...rawActiveTrips, ...rawCompletedTrips];
      const tripsById = new Map();

      allTrips.forEach((trip) => {
        tripsById.set(Number(trip.id), {
          ...trip,
          statusNormalized: normalizeStatus(trip.status),
        });
      });

      const dedupedTrips = Array.from(tripsById.values());

      const normalizedActiveTrips = dedupedTrips.filter(
        (trip) => trip.statusNormalized === "active"
      );

      const normalizedCompletedTrips = dedupedTrips.filter(
        (trip) => trip.statusNormalized === "completed"
      );

      setActiveTrips(normalizedActiveTrips);
      setCompletedTrips(normalizedCompletedTrips);
    } catch (error) {
      console.log(error.response?.data || error.message);
      Alert.alert("Unable to load data", "Could not load ambulance drivers and trips.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleTripEnded = () => {
      fetchData();
    };

    socket.on("ambulanceTripEnded", handleTripEnded);

    const intervalId = setInterval(() => {
      fetchData();
    }, 10000);

    return () => {
      socket.off("ambulanceTripEnded", handleTripEnded);
      clearInterval(intervalId);
    };
  }, [user?.hospitalId]);

  return (
    <ScrollView style={styles.card} contentContainerStyle={{ paddingBottom: 120 }}>
      <Text style={styles.sectionTitle}>🚑 Ambulance Drivers & Trips</Text>

      <TouchableOpacity style={styles.menuButton} onPress={fetchData}>
        <Text style={styles.menuText}>{loading ? "Refreshing..." : "Refresh"}</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>🏥 Own Hospital Ambulance Drivers</Text>
      {drivers.length === 0 ? (
        <Text style={styles.info}>No ambulance drivers assigned to your hospital.</Text>
      ) : (
        drivers.map((driver) => (
          <View key={driver.id} style={styles.incidentCard}>
            <Text style={styles.incidentTitle}>{driver.name}</Text>
            <Text style={styles.info}>📧 {driver.email}</Text>
            <Text style={styles.info}>🚑 {driver.assignedVehicleId || "Not assigned"}</Text>
            <Text style={styles.info}>📱 {driver.phone || "N/A"}</Text>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>🏥 Other Hospital Ambulance Drivers</Text>
      {otherDrivers.length === 0 ? (
        <Text style={styles.info}>No ambulance drivers from other hospitals found.</Text>
      ) : (
        otherDrivers.map((driver) => (
          <View key={driver.id} style={styles.incidentCard}>
            <Text style={styles.incidentTitle}>{driver.name}</Text>
            <Text style={styles.info}>📧 {driver.email}</Text>
            <Text style={styles.info}>🚑 {driver.assignedVehicleId || "Not assigned"}</Text>
            <Text style={styles.info}>🏥 Hospital ID: {driver.hospitalId}</Text>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>🚨 Active Ambulance Trips</Text>
      {activeTrips.length === 0 ? (
        <Text style={styles.info}>No active trips for your hospital.</Text>
      ) : (
        activeTrips.map((trip) => (
          <View key={trip.id} style={[styles.incidentCard, { borderColor: "#DC2626", borderWidth: 2 }]}> 
            <Text style={styles.incidentTitle}>🚑 {trip.ambulanceId}</Text>
            <Text style={styles.info}>Driver: {trip.driverName}</Text>
            <Text style={styles.info}>Status: {trip.status}</Text>
            <Text style={styles.info}>Current: {trip.currentLatitude?.toFixed(4)}, {trip.currentLongitude?.toFixed(4)}</Text>
            <Text style={styles.info}>Destination: {trip.endLatitude?.toFixed(4)}, {trip.endLongitude?.toFixed(4)}</Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#2563EB" }]}
              onPress={() => {
                setSelectedAmbulanceTrip(trip);
                setScreen("hospitalAmbulanceTripMap");
              }}
            >
              <Text style={styles.buttonText}>View Driver Map</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>📜 Recent Completed Trips</Text>
      {completedTrips.length === 0 ? (
        <Text style={styles.info}>No completed trips yet.</Text>
      ) : (
        completedTrips.slice(0, 5).map((trip) => (
          <View key={trip.id} style={[styles.incidentCard, { borderColor: "#6366F1", borderWidth: 2, backgroundColor: "#0F172A" }]}> 
            <Text style={styles.incidentTitle}>✓ {trip.ambulanceId}</Text>
            <Text style={styles.info}>Driver: {trip.driverName}</Text>
            <Text style={styles.info}>From: {trip.startLatitude?.toFixed(4)}, {trip.startLongitude?.toFixed(4)}</Text>
            <Text style={styles.info}>To: {trip.endLatitude?.toFixed(4)}, {trip.endLongitude?.toFixed(4)}</Text>
          </View>
        ))
      )}

      <TouchableOpacity style={[styles.button, { backgroundColor: "#999" }]} onPress={() => setScreen("dashboard") }>
        <Text style={styles.buttonText}>← Back to Dashboard</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

export default HospitalAmbulanceTripsScreen;

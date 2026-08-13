import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";

import API from "../services/api";
import styles from "../styles/styles";

function SOSDashboardScreen({ token, user, setScreen, setSelectedSosAlert }) {
  const [sosAlerts, setSosAlerts] = useState([]);

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

  const fetchSOSAlerts = async () => {
    try {
      const res = await API.get("/sos", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let activeAlerts = res.data.filter(
        (alert) => alert.status === "Active"
      );

      if (user?.role === "hospital_admin") {
        // Fetch hospital location from backend
        try {
          const hospitalRes = await API.get(`/hospitals/${user?.hospitalId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const hospitalLat = hospitalRes.data.latitude;
          const hospitalLon = hospitalRes.data.longitude;

          activeAlerts = activeAlerts
            .map((alert) => {
              const distance = calculateDistanceKm(
                Number(hospitalLat),
                Number(hospitalLon),
                Number(alert.latitude),
                Number(alert.longitude)
              );

              return {
                ...alert,
                distance: distance.toFixed(2),
              };
            })
            .filter((alert) => Number(alert.distance) <= 10);
        } catch (error) {
          console.log("Hospital location fetch error:", error);
          setSosAlerts([]);
          return;
        }
      }

      // Sort by newest first (highest ID first)
      activeAlerts.sort((a, b) => Number(b.id) - Number(a.id));
      setSosAlerts(activeAlerts);
    } catch (error) {
      console.log(error.response?.data || error.message);
      Alert.alert("Error", "Failed to load SOS alerts");
    }
  };

  useEffect(() => {
    fetchSOSAlerts();

    const intervalId = setInterval(() => {
      fetchSOSAlerts();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [user]);

  return (
    <ScrollView style={styles.card}>
      <Text style={styles.sectionTitle}>🚨 Active SOS Alerts</Text>

      {user?.role === "hospital_admin" && user?.hospital ? (
        <Text style={styles.info}>
          Showing SOS alerts within 10km of {user.hospital.name}
        </Text>
      ) : user?.role === "hospital_admin" ? (
        <Text style={styles.warningText}>
          Hospital location not linked to this account.
        </Text>
      ) : null}

      {user?.role === "admin" && (
        <Text style={styles.info}>Showing all active SOS alerts</Text>
      )}

      <TouchableOpacity
        style={styles.menuButton}
        onPress={fetchSOSAlerts}
      >
        <Text style={styles.menuText}>Refresh SOS Alerts</Text>
      </TouchableOpacity>

      {sosAlerts.length === 0 ? (
        <Text style={styles.info}>No active SOS alerts</Text>
      ) : (
        sosAlerts.map((sos) => (
          <View
            key={sos.id}
            style={[
              styles.incidentCard,
              {
                borderColor: "#DC2626",
                borderWidth: 2,
              },
            ]}
          >
            <Text style={styles.incidentTitle}>🚨 SOS Alert #{sos.id}</Text>

            <Text style={styles.info}>Name: {sos.senderName}</Text>

            <Text style={styles.info}>Role: {sos.senderRole}</Text>

            <Text style={styles.info}>
              Vehicle: {sos.vehicleId || "Not assigned"}
            </Text>

            {sos.distance && (
              <Text style={styles.warningText}>
                Distance from hospital: {sos.distance} km
              </Text>
            )}

            <Text style={styles.warningText}>
              Location: {sos.latitude}, {sos.longitude}
            </Text>

            <Text style={styles.warningText}>Status: {sos.status}</Text>

            <TouchableOpacity
              style={[styles.menuButton, { marginTop: 10 }]}
              onPress={() => {
                setSelectedSosAlert(sos);
                setScreen("sosMap");
              }}
            >
              <Text style={styles.menuText}>📍 View on Map</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

export default SOSDashboardScreen;
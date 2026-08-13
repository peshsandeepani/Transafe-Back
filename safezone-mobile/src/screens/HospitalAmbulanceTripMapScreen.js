import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import MapView, { Marker } from "react-native-maps";
import styles from "../styles/styles";
import useHeadingUpMap from "../hooks/useHeadingUpMap";
import API from "../services/api";

function HospitalAmbulanceTripMapScreen({ trip, token, setScreen }) {
  const mapRef = useRef(null);
  const [currentTrip, setCurrentTrip] = useState(trip);
  const [updating, setUpdating] = useState(false);
  const [fullScreenMap, setFullScreenMap] = useState(false);
  const { headingUp, toggleNorthUp } = useHeadingUpMap(
    mapRef,
    currentTrip ? { latitude: currentTrip.currentLatitude, longitude: currentTrip.currentLongitude, heading: 0 } : null
  );

  const fetchTripUpdate = async () => {
    if (!trip?.id || !token) return;

    try {
      const res = await API.get("/ambulance-trips/active", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const updatedTrip = (res.data || []).find(
        (item) => Number(item.id) === Number(trip.id)
      );

      if (updatedTrip) {
        setCurrentTrip(updatedTrip);
      }
    } catch (error) {
      console.log("Hospital ambulance trip map update error:", error.response?.data || error.message);
    }
  };

  useEffect(() => {
    if (!trip) return;

    setCurrentTrip(trip);

    const timeoutId = setTimeout(() => {
      if (!mapRef.current || !trip.currentLatitude || !trip.currentLongitude || !trip.endLatitude || !trip.endLongitude) return;
      mapRef.current.fitToCoordinates(
        [
          { latitude: trip.currentLatitude, longitude: trip.currentLongitude },
          { latitude: trip.endLatitude, longitude: trip.endLongitude },
        ],
        {
          edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
          animated: true,
        }
      );
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [trip]);

  useEffect(() => {
    let intervalId;

    if (trip && token) {
      fetchTripUpdate();
      intervalId = setInterval(fetchTripUpdate, 5000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [trip?.id, token]);

  if (!trip) {
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>No trip selected</Text>
        <TouchableOpacity style={styles.button} onPress={() => setScreen("hospitalAmbulanceTrips")}>
          <Text style={styles.buttonText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayedTrip = currentTrip || trip;

  return (
    <View style={{ flex: 1, backgroundColor: "#111827" }}>
      <View style={{ flex: 1 }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={{
            latitude: displayedTrip.currentLatitude || displayedTrip.startLatitude || 6.9271,
            longitude: displayedTrip.currentLongitude || displayedTrip.startLongitude || 79.8612,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {displayedTrip.currentLatitude && displayedTrip.currentLongitude && (
            <Marker coordinate={{ latitude: displayedTrip.currentLatitude, longitude: displayedTrip.currentLongitude }} title="Ambulance Current Location">
              <Text style={{ fontSize: 30 }}>🚑</Text>
            </Marker>
          )}

          {displayedTrip.startLatitude && displayedTrip.startLongitude && (
            <Marker coordinate={{ latitude: displayedTrip.startLatitude, longitude: displayedTrip.startLongitude }} title="Start" pinColor="#34D399">
              <Text style={{ fontSize: 22 }}>S</Text>
            </Marker>
          )}

          {displayedTrip.endLatitude && displayedTrip.endLongitude && (
            <Marker coordinate={{ latitude: displayedTrip.endLatitude, longitude: displayedTrip.endLongitude }} title="Destination" pinColor="#F97316">
              <Text style={{ fontSize: 22 }}>D</Text>
            </Marker>
          )}
        </MapView>

        <TouchableOpacity
          style={{ position: "absolute", right: 12, bottom: 12, backgroundColor: "#0F172A", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12 }}
          onPress={() => setFullScreenMap((value) => !value)}
        >
          <Text style={{ color: "#F8FAFC", fontWeight: "800" }}>{fullScreenMap ? "Exit Fullscreen" : "Fullscreen"}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { margin: 0, borderRadius: 0 }]}> 
        <Text style={styles.sectionTitle}>🚑 Trip: {displayedTrip.ambulanceId}</Text>
        <Text style={styles.info}>Driver: {displayedTrip.driverName}</Text>
        <Text style={styles.info}>Status: {displayedTrip.status}</Text>
        <Text style={styles.info}>Current: {displayedTrip.currentLatitude?.toFixed(4)}, {displayedTrip.currentLongitude?.toFixed(4)}</Text>
        <Text style={styles.info}>Destination: {displayedTrip.endLatitude?.toFixed(4)}, {displayedTrip.endLongitude?.toFixed(4)}</Text>
        {displayedTrip.updatedAt && (
          <Text style={styles.info}>Last updated: {new Date(displayedTrip.updatedAt).toLocaleTimeString()}</Text>
        )}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#999" }]}
          onPress={() => setScreen("hospitalAmbulanceTrips")}
        >
          <Text style={styles.buttonText}>← Back to Trips</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default HospitalAmbulanceTripMapScreen;

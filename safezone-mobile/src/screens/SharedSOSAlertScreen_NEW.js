import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";

import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";

import API from "../services/api";
import styles from "../styles/styles";

function SharedSOSAlertScreen({ sharedSOSAlerts, setScreen, token, user, setSharedSOSAlerts }) {
  const mapRef = useRef(null);
  const [selectedAlert, setSelectedAlert] = useState(
    sharedSOSAlerts?.[0] || null
  );
  const [startingTrip, setStartingTrip] = useState(false);
  const [tripStarted, setTripStarted] = useState(false);
  const [tripId, setTripId] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  useEffect(() => {
    if (mapRef.current && selectedAlert) {
      mapRef.current.animateToRegion(
        {
          latitude: Number(selectedAlert.latitude),
          longitude: Number(selectedAlert.longitude),
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
    }
  }, [selectedAlert]);

  const fetchRoutes = async (start, end) => {
    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?alternatives=3&geometries=geojson&overview=full`
      );

      const data = await res.json();

      const sortedRoutes = (data.routes || []).sort(
        (a, b) => a.distance - b.distance
      );

      setRoutes(sortedRoutes);
      setSelectedRouteIndex(0);
    } catch (error) {
      console.log(error);
      Alert.alert("Route Error", "Could not load route suggestions");
    }
  };

  const handleStartTrip = async () => {
    try {
      if (!user?.assignedVehicleId) {
        Alert.alert("No Vehicle", "No vehicle assigned to your account");
        return;
      }

      setStartingTrip(true);

      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required");
        setStartingTrip(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});

      const start = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCurrentLocation(start);

      // Fetch routes BEFORE starting trip so they display immediately
      await fetchRoutes(start, {
        latitude: selectedAlert.latitude,
        longitude: selectedAlert.longitude,
      });

      const tripData = {
        ambulanceId: user.assignedVehicleId,
        driverName: user.name,
        startLatitude: location.coords.latitude,
        startLongitude: location.coords.longitude,
        endLatitude: selectedAlert.latitude,
        endLongitude: selectedAlert.longitude,
      };

      const res = await API.post("/ambulance-trips/start", tripData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setTripId(res.data.trip.id);
      setTripStarted(true);

      Alert.alert(
        "✅ Trip Started",
        `Trip started to SOS location!\n\nFrom: ${selectedAlert.senderName}`
      );

      // Remove the alert from shared list
      setSharedSOSAlerts((prev) =>
        prev.filter((alert) => alert.id !== selectedAlert.id)
      );

      setStartingTrip(false);
    } catch (error) {
      console.log(error.response?.data || error.message);
      Alert.alert("Error", "Failed to start trip");
      setStartingTrip(false);
    }
  };

  const handleEndTrip = async () => {
    try {
      await API.put(
        `/ambulance-trips/${tripId}/end`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setTripStarted(false);
      setTripId(null);
      setCurrentLocation(null);
      setRoutes([]);
      setSelectedRouteIndex(0);

      Alert.alert("✅ Trip Completed", "Ambulance trip completed");

      setScreen("dashboard");
    } catch (error) {
      console.log(error.response?.data || error.message);
      Alert.alert("Error", "Failed to complete trip");
    }
  };

  // Update location every 5 seconds when trip is active
  useEffect(() => {
    let intervalId;

    const updateAmbulanceLocation = async () => {
      try {
        if (!tripStarted || !tripId) return;

        const location = await Location.getCurrentPositionAsync({});

        const newLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        setCurrentLocation(newLocation);

        await API.put(
          `/ambulance-trips/${tripId}/location`,
          newLocation,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } catch (error) {
        console.log(error.response?.data || error.message);
      }
    };

    if (tripStarted && tripId) {
      updateAmbulanceLocation();

      intervalId = setInterval(() => {
        updateAmbulanceLocation();
      }, 5000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [tripStarted, tripId]);

  return (
    <ScrollView style={styles.card}>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setScreen("dashboard")}
      >
        <Text style={styles.menuText}>← Back to Dashboard</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>📍 Shared SOS Alert</Text>

      {sharedSOSAlerts.length === 0 && !tripStarted ? (
        <Text style={styles.info}>No shared SOS alerts</Text>
      ) : (
        <>
          {!tripStarted && sharedSOSAlerts.length > 0 && (
            <View style={{ marginBottom: 15 }}>
              {sharedSOSAlerts.map((alert) => (
                <TouchableOpacity
                  key={alert.id}
                  onPress={() => setSelectedAlert(alert)}
                  style={[
                    styles.incidentCard,
                    {
                      borderColor:
                        selectedAlert?.id === alert.id ? "#DC2626" : "#4B5563",
                      borderWidth: 2,
                      marginBottom: 10,
                      backgroundColor:
                        selectedAlert?.id === alert.id ? "#DC262620" : "transparent",
                    },
                  ]}
                >
                  <Text style={styles.incidentTitle}>
                    🚨 SOS Alert #{alert.id}
                  </Text>

                  <Text style={styles.info}>
                    <Text style={{ fontWeight: "bold" }}>From:</Text> {alert.senderName}
                  </Text>

                  <Text style={styles.info}>
                    <Text style={{ fontWeight: "bold" }}>Shared by:</Text> {alert.sharedBy}
                  </Text>

                  <Text style={styles.warningText}>
                    <Text style={{ fontWeight: "bold" }}>Status:</Text> {alert.status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {selectedAlert && (
            <>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  📍 Alert Details
                </Text>

                <Text style={styles.info}>
                  <Text style={{ fontWeight: "bold" }}>Sender:</Text> {selectedAlert.senderName}
                </Text>

                <Text style={styles.info}>
                  <Text style={{ fontWeight: "bold" }}>Role:</Text> {selectedAlert.senderRole}
                </Text>

                <Text style={styles.info}>
                  <Text style={{ fontWeight: "bold" }}>Vehicle:</Text> {selectedAlert.vehicleId || "Not assigned"}
                </Text>

                <Text style={styles.warningText}>
                  <Text style={{ fontWeight: "bold" }}>📍 Location:</Text>
                </Text>

                <Text style={styles.info}>
                  Latitude: {selectedAlert.latitude}
                </Text>

                <Text style={styles.info}>
                  Longitude: {selectedAlert.longitude}
                </Text>

                <Text style={styles.warningText}>
                  <Text style={{ fontWeight: "bold" }}>Shared by:</Text> {selectedAlert.sharedBy}
                </Text>
              </View>

              {tripStarted && currentLocation && (
                <>
                  <View style={styles.mapBox}>
                    <MapView
                      ref={mapRef}
                      style={styles.map}
                      region={{
                        latitude: currentLocation.latitude,
                        longitude: currentLocation.longitude,
                        latitudeDelta: 0.015,
                        longitudeDelta: 0.015,
                      }}
                    >
                      {routes.map((route, index) => {
                        const coordinates = route.geometry.coordinates.map((coord) => ({
                          latitude: coord[1],
                          longitude: coord[0],
                        }));

                        return (
                          <Polyline
                            key={index}
                            coordinates={coordinates}
                            strokeColor={
                              index === selectedRouteIndex
                                ? "#DC2626"
                                : "#86EFAC"
                            }
                            strokeWidth={
                              index === selectedRouteIndex ? 6 : 4
                            }
                            tappable
                            onPress={() => setSelectedRouteIndex(index)}
                          />
                        );
                      })}

                      <Marker
                        coordinate={currentLocation}
                        title="🚑 Ambulance (Current)"
                      >
                        <Text style={{ fontSize: 32 }}>🚑</Text>
                      </Marker>

                      <Marker
                        coordinate={{
                          latitude: selectedAlert.latitude,
                          longitude: selectedAlert.longitude,
                        }}
                        title="🚨 SOS Location (Destination)"
                      >
                        <Text style={{ fontSize: 32 }}>🚨</Text>
                      </Marker>
                    </MapView>
                  </View>

                  {routes.length > 0 && (
                    <View>
                      <Text style={styles.sectionTitle}>
                        📍 Suggested Routes ({routes.length})
                      </Text>

                      {routes.map((route, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.menuButton,
                            {
                              backgroundColor:
                                index === selectedRouteIndex
                                  ? "#DC2626"
                                  : "#166534",
                            },
                          ]}
                          onPress={() => setSelectedRouteIndex(index)}
                        >
                          <Text style={styles.menuText}>
                            {index === 0
                              ? "🛣️ Shortest Route"
                              : `🛣️ Route ${index + 1}`}{" "}
                            - {(route.distance / 1000).toFixed(2)} km
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}

              {!tripStarted ? (
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: "#DC2626", marginBottom: 20, marginTop: 20 }]}
                  onPress={handleStartTrip}
                  disabled={startingTrip}
                >
                  <Text style={styles.buttonText}>
                    {startingTrip ? "Starting Trip..." : "🚑 Start Trip to Alert"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: "#DC2626", marginBottom: 20, marginTop: 20 }]}
                  onPress={handleEndTrip}
                >
                  <Text style={styles.buttonText}>✅ Complete Trip</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

export default SharedSOSAlertScreen;

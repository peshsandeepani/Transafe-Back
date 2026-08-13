import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";

import API from "../services/api";
import styles from "../styles/styles";
import useHeadingUpMap from "../hooks/useHeadingUpMap";
import FullscreenMapButton from "../components/FullscreenMapButton";

function RespondingToIncidentScreen({
  token,
  user,
  setScreen,
  respondingIncident,
  setNearbyIncidents,
}) {
  const mapRef = useRef(null);
  const locationUpdateInterval = useRef(null);
  const [incident, setIncident] = useState(respondingIncident);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [marking, setMarking] = useState(false);
  const [routeLoaded, setRouteLoaded] = useState(false);
  const [fullScreenMap, setFullScreenMap] = useState(false);
  const { headingUp, toggleNorthUp } = useHeadingUpMap(mapRef, currentLocation);

  useEffect(() => {
    startLocationTracking();

    return () => {
      if (locationUpdateInterval.current) {
        clearInterval(locationUpdateInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && incident) {
      mapRef.current.animateToRegion(
        {
          latitude: Number(incident.latitude),
          longitude: Number(incident.longitude),
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        1000
      );
    }
  }, [incident]);

  const startLocationTracking = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required");
        return;
      }

      // Get initial location and fetch routes
      const location = await Location.getCurrentPositionAsync({});
      const start = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        heading: location.coords.heading,
      };

      setCurrentLocation(start);

      // Fetch routes to incident
      await fetchRoutes(start, {
        latitude: incident.latitude,
        longitude: incident.longitude,
      });

      // Update location every 5 seconds
      locationUpdateInterval.current = setInterval(async () => {
        try {
          const newLocation = await Location.getCurrentPositionAsync({});
          setCurrentLocation({
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            heading: newLocation.coords.heading,
          });

          // Optionally send location update to backend
          await updateLocationOnBackend({
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          });
        } catch (error) {
          console.log("Location update error:", error);
        }
      }, 5000);
    } catch (error) {
      console.log("Location tracking error:", error);
      Alert.alert("Error", "Could not start location tracking");
    }
  };

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
      setRouteLoaded(true);
    } catch (error) {
      console.log("Route fetch error:", error);
      Alert.alert("Route Error", "Could not load route suggestions");
    }
  };

  const updateLocationOnBackend = async (location) => {
    try {
      // Optional: Send location update to backend
      // This could be used for real-time tracking of all responding drivers
      await API.post(
        `/road-incidents/${incident.id}/location-update`,
        {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (error) {
      // Silently fail - not critical if location update fails
      console.log("Backend location update error:", error);
    }
  };

  const handleMarkResolved = async () => {
    try {
      Alert.alert(
        "Mark as Resolved?",
        "Are you at the incident location? This will remove it from the system.",
        [
          {
            text: "Cancel",
            onPress: () => {},
            style: "cancel",
          },
          {
            text: "Yes, Mark Resolved",
            onPress: async () => {
              setMarking(true);

              try {
                const res = await API.put(
                  `/road-incidents/${incident.id}/resolved`,
                  {},
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  }
                );

                Alert.alert(
                  "✅ Incident Resolved",
                  "Thank you for your quick response!",
                  [
                    {
                      text: "OK",
                      onPress: () => {
                        // Remove from nearby list and go back
                        setNearbyIncidents((prev) =>
                          prev.filter((inc) => inc.id !== incident.id)
                        );
                        if (locationUpdateInterval.current) {
                          clearInterval(locationUpdateInterval.current);
                        }
                        setScreen("nearbyIncidents");
                      },
                    },
                  ]
                );
              } catch (error) {
                console.log("Mark resolved error:", error);
                Alert.alert(
                  "Error",
                  error.response?.data?.message || "Could not mark incident as resolved"
                );
              } finally {
                setMarking(false);
              }
            },
            style: "default",
          },
        ]
      );
    } catch (error) {
      console.log("Error:", error);
    }
  };

  const getPolylineCoordinates = (geometry) => {
    if (!geometry || !geometry.coordinates) return [];

    return geometry.coordinates.map((coord) => ({
      latitude: coord[1],
      longitude: coord[0],
    }));
  };

  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDuration = (seconds) => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (!incident) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Incident Not Found</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setScreen("nearbyIncidents")}
        >
          <Text style={styles.buttonText}>Back to List</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const selectedRoute = routes[selectedRouteIndex];

  return (
    <View style={styles.container}>
      <View
        style={{
          height: fullScreenMap ? "100%" : 300,
          flex: fullScreenMap ? 1 : undefined,
          marginBottom: 10,
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={{
            latitude: Number(incident.latitude),
            longitude: Number(incident.longitude),
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
        >
          {/* Incident Location */}
          <Marker
            coordinate={{
              latitude: Number(incident.latitude),
              longitude: Number(incident.longitude),
            }}
            title={incident.type || "Incident"}
            description={incident.description}
            pinColor="#ff6b6b"
          />

          {/* Current Driver Location */}
          {currentLocation && (
            <Marker coordinate={currentLocation} rotation={Number(currentLocation.heading || 0)} title="Your Location" anchor={{ x: 0.5, y: 0.5 }}>
              <Text style={{ color: "#0066cc", fontSize: 28 }}>▲</Text>
            </Marker>
          )}

          {/* Route Polyline */}
          {selectedRoute && currentLocation && (
            <Polyline
              coordinates={getPolylineCoordinates(selectedRoute.geometry)}
              strokeColor="#0066cc"
              strokeWidth={3}
            />
          )}
        </MapView>
        <FullscreenMapButton fullScreen={fullScreenMap} onPress={() => setFullScreenMap((value) => !value)} />
        <TouchableOpacity
          onPress={toggleNorthUp}
          style={{ position: "absolute", right: 12, bottom: 12, backgroundColor: "#0F172A", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 }}
        >
          <Text style={{ color: "#F8FAFC", fontWeight: "800" }}>{headingUp ? "North up" : "Heading up"}</Text>
        </TouchableOpacity>
      </View>

      {!routeLoaded && (
        <View style={{ padding: 10, backgroundColor: "#f5f5f5", borderRadius: 5 }}>
          <ActivityIndicator size="small" color="#0066cc" />
          <Text style={{ marginTop: 5, color: "#666" }}>Loading route...</Text>
        </View>
      )}

      {routeLoaded && routes.length > 0 && (
        <ScrollView style={{ flex: 1, maxHeight: 150 }}>
          <Text style={{ fontWeight: "bold", marginBottom: 10 }}>
            Select Route:
          </Text>

          {routes.map((route, index) => (
            <TouchableOpacity
              key={index}
              style={[
                {
                  padding: 10,
                  backgroundColor:
                    selectedRouteIndex === index ? "#e3f2fd" : "#f5f5f5",
                  borderRadius: 5,
                  marginBottom: 5,
                  borderLeftColor:
                    selectedRouteIndex === index ? "#0066cc" : "#ccc",
                  borderLeftWidth: 3,
                },
              ]}
              onPress={() => setSelectedRouteIndex(index)}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "bold" }}>
                  Route {index + 1}{selectedRouteIndex === index && " ✓"}
                </Text>
              </View>
              <Text style={{ color: "#666", marginTop: 5 }}>
                📏 {formatDistance(route.distance)} • ⏱️ {formatDuration(route.duration)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={{ paddingVertical: 10 }}>
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: currentLocation ? "#ff6b6b" : "#ccc",
            },
          ]}
          onPress={handleMarkResolved}
          disabled={!currentLocation || marking}
        >
          <Text style={styles.buttonText}>
            {marking ? "Marking..." : "✅ Mark as Resolved"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#999", marginTop: 10 }]}
          onPress={() => setScreen("nearbyIncidents")}
        >
          <Text style={styles.buttonText}>← Back to Nearby Incidents</Text>
        </TouchableOpacity>
      </View>

      {/* Info Box */}
      <View style={{ padding: 10, backgroundColor: "#f0f0f0", borderRadius: 5 }}>
        <Text style={{ fontWeight: "bold", color: "#333" }}>
          📍 Destination
        </Text>
        <Text style={{ color: "#666", marginTop: 5 }}>
          {incident.locationName || "Unknown location"}
        </Text>
        {incident.description && (
          <Text style={{ color: "#666", marginTop: 5, fontStyle: "italic" }}>
            {incident.description}
          </Text>
        )}
      </View>
    </View>
  );
}

export default RespondingToIncidentScreen;

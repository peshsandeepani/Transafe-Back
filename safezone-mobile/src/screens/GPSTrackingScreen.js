import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  Image,
} from "react-native";

import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";

import API from "../services/api";
import { getBaseUrl } from "../config/network";
import styles from "../styles/styles";
import useHeadingUpMap from "../hooks/useHeadingUpMap";

const BASE_URL = getBaseUrl();

function GPSTrackingScreen({
  user,
  token,
  gpsLocation,
  setGpsLocation,
  ambulanceWarning,
  officerTripDestination,
  setOfficerTripDestination,
  clearOfficerIncidentAlerts,
  clearSharedRoadIncidentAlerts,
  setScreen,
}) {
  const mapRef = useRef(null);

  const defaultLocation = {
    latitude: 6.9271,
    longitude: 79.8612,
    speed: 0,
  };

  const [localLocation, setLocalLocation] = useState(null);
  const { headingUp, toggleNorthUp } = useHeadingUpMap(
    mapRef,
    localLocation || gpsLocation || defaultLocation
  );

  const [roadIncidents, setRoadIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);

  const [tripStarted, setTripStarted] = useState(false);
  const [destinationQuery, setDestinationQuery] = useState("");
  const [destinationLabel, setDestinationLabel] = useState("");
  const [destination, setDestination] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [fullScreenMap, setFullScreenMap] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  const currentLocation = localLocation || gpsLocation || defaultLocation;

  useEffect(() => {
    if (officerTripDestination) {
      const initTrip = async () => {
        try {
          const permission = await Location.requestForegroundPermissionsAsync();
          if (permission.status !== "granted") {
            Alert.alert("Permission Denied", "Location permission is required");
            return;
          }

          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

          const rawSpeed = location.coords.speed;
          const speed =
            rawSpeed != null && rawSpeed >= 0
              ? Math.round(rawSpeed * 3.6)
              : null;

          const deviceLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            speed,
            heading: location.coords.heading,
          };

          setLocalLocation(deviceLocation);

          const selected = {
            latitude: Number(officerTripDestination.latitude),
            longitude: Number(officerTripDestination.longitude),
          };

          setDestination(selected);
          setDestinationLabel(
            officerTripDestination.location ||
              officerTripDestination.senderName ||
              officerTripDestination.type ||
              "Emergency Destination"
          );
          setDestinationQuery("");
          setSuggestions([]);

          await fetchRoutes(selected, deviceLocation);
        } catch (error) {
          console.log("Officer trip init error:", error);
          const selected = {
            latitude: Number(officerTripDestination.latitude),
            longitude: Number(officerTripDestination.longitude),
          };
          setDestination(selected);
          setDestinationLabel(
            officerTripDestination.location ||
              officerTripDestination.senderName ||
              officerTripDestination.type ||
              "Emergency Destination"
          );
          setDestinationQuery("");
          setSuggestions([]);
          fetchRoutes(selected);
        }
      };

      initTrip();
    }
  }, [officerTripDestination]);
  const ambulanceLocation =
    ambulanceWarning?.ambulanceLatitude &&
    ambulanceWarning?.ambulanceLongitude
      ? {
          latitude: Number(ambulanceWarning.ambulanceLatitude),
          longitude: Number(ambulanceWarning.ambulanceLongitude),
        }
      : null;

  const getIncidentIcon = (type) => {
    if (type === "Accident") return "🚗";
    if (type === "Flood") return "🌊";
    if (type === "Falling Tree") return "🌳";
    if (type === "Traffic Jam") return "🚦";
    if (type === "Damaged Road") return "🕳️";
    return "⚠️";
  };

 const sendGPSUpdate = async () => {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== "granted") {
      Alert.alert("Permission Denied", "Location permission is required");
      return;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const rawSpeed = location.coords.speed;
    const speed =
      rawSpeed != null && rawSpeed >= 0
        ? Math.round(rawSpeed * 3.6)
        : null;

    const gpsData = {
      vehicleId: user?.assignedVehicleId || `mobile_user_${user.id}`,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      speed,
      heading: location.coords.heading,
    };

    setLocalLocation(gpsData);

    // Only send backend GPS update if user has assigned vehicle
    if (user?.assignedVehicleId) {
      await API.post("/gps/update", gpsData);
    }

    setGpsLocation(gpsData);

  } catch (error) {
    console.log(error.response?.data || error.message);
  }
};
  const fetchRoadIncidents = async () => {
    try {
      const res = await API.get("/road-incidents", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const activeIncidents = res.data.filter(
        (incident) => incident.status === "Active"
      );

      setRoadIncidents(activeIncidents);
      console.log("Road incidents loaded:", activeIncidents.length);
    } catch (error) {
      console.log(error.response?.data || error.message);
    }
  };

  useEffect(() => {
    sendGPSUpdate();
    fetchRoadIncidents();

    const gpsIntervalId = setInterval(sendGPSUpdate, 5000);
    const incidentIntervalId = setInterval(fetchRoadIncidents, 5000);

    return () => {
      clearInterval(gpsIntervalId);
      clearInterval(incidentIntervalId);
    };
  }, []);

  const searchDestination = async () => {
    try {
      if (destinationQuery.trim().length < 3) {
        setSuggestions([]);
        return;
      }

      const query = encodeURIComponent(destinationQuery);

      const response = await fetch(
        `https://photon.komoot.io/api/?q=${query}&limit=8&lat=7.8731&lon=80.7718`
      );

      const data = await response.json();

      const results = (data.features || []).map((item, index) => {
        const props = item.properties || {};
        const coordinates = item.geometry.coordinates;

        const displayName = [
          props.name,
          props.street,
          props.city,
          props.county,
          props.state,
          props.country,
        ]
          .filter(Boolean)
          .join(", ");

        return {
          place_id: `${props.osm_id || index}`,
          display_name: displayName || "Selected Location",
          lat: coordinates[1],
          lon: coordinates[0],
        };
      });

      setSuggestions(results);
    } catch (error) {
      console.log("Search Failed:", error);
      Alert.alert("Search Failed", "Could not search location");
    }
  };

  const fetchRoutes = async (selectedDestination, originLocation = null) => {
    try {
      const startLocation = originLocation || currentLocation;
      if (!startLocation || !selectedDestination) return;

      const startLng = startLocation.longitude;
      const startLat = startLocation.latitude;
      const endLng = selectedDestination.longitude;
      const endLat = selectedDestination.latitude;

      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?alternatives=3&geometries=geojson&overview=full`
      );

      const data = await res.json();

      const sortedRoutes = (data.routes || []).sort(
        (a, b) => a.distance - b.distance
      );

      setRoutes(sortedRoutes);
      setSelectedRouteIndex(0);
    } catch (error) {
      console.log(error);
      Alert.alert("Route Error", "Could not load routes");
    }
  };

  useEffect(() => {
    if (officerTripDestination) {
      return;
    }

    const delay = setTimeout(() => {
      if (destinationQuery.trim().length >= 3) {
        searchDestination();
      } else {
        setSuggestions([]);
      }
    }, 500);

    return () => clearTimeout(delay);
  }, [destinationQuery, officerTripDestination]);

 const handleStartTrip = () => {
  if (!destination) {
    Alert.alert("Select Destination", "Please select a destination first.");
    return;
  }

  setSuggestions([]);
  setTripStarted(true);
  sendGPSUpdate();
};

  const handleEndTrip = () => {
    if (officerTripDestination) {
      if (user?.role === "police_officer" && clearOfficerIncidentAlerts) {
        clearOfficerIncidentAlerts();
      }

      if (user?.role === "ambulance_driver" && clearSharedRoadIncidentAlerts) {
        clearSharedRoadIncidentAlerts();
      }

      if (setOfficerTripDestination) {
        setOfficerTripDestination(null);
      }

      if (user?.role === "police_officer") {
        setScreen("policeOfficerDashboard");
      } else if (user?.role === "ambulance_driver") {
        setScreen("dashboard");
      }
      return;
    }

    setTripStarted(false);
    setDestination(null);
    setDestinationQuery("");
    setSuggestions([]);
    setRoutes([]);
    setSelectedRouteIndex(0);
  };

  return (
    <ScrollView style={styles.card}>
      <Text style={styles.sectionTitle}>🗺️ SafeZone Map</Text>

      <Text style={styles.info}>Tracking: Mobile GPS</Text>

      {officerTripDestination ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚔 Responding to</Text>
          <Text style={styles.info}>{destinationLabel}</Text>
        </View>
      ) : (
        <>
          <TextInput
            placeholder="Search destination..."
            placeholderTextColor="#9CA3AF"
            value={destinationQuery}
            onChangeText={setDestinationQuery}
            style={styles.input}
          />

          {suggestions.map((item) => (
            <TouchableOpacity
              key={item.place_id}
              style={styles.incidentCard}
              onPress={() => {
                const selected = {
                  latitude: Number(item.lat),
                  longitude: Number(item.lon),
                };

                setDestination(selected);
                setDestinationQuery(item.display_name);
                setSuggestions([]);
                fetchRoutes(selected);
              }}
            >
              <Text style={styles.info}>{item.display_name}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setFullScreenMap(!fullScreenMap)}
      >
        <Text style={styles.menuText}>
          {fullScreenMap ? "Exit Full Screen Map" : "Full Screen Map"}
        </Text>
      </TouchableOpacity>

      <View style={fullScreenMap ? styles.fullMapBox : styles.mapBox}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: Number(destination?.latitude || currentLocation.latitude),
            longitude: Number(
              destination?.longitude || currentLocation.longitude
            ),
            latitudeDelta: fullScreenMap ? 0.008 : 0.01,
            longitudeDelta: fullScreenMap ? 0.008 : 0.01,
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
                  index === selectedRouteIndex ? "#DC2626" : "#86EFAC"
                }
                strokeWidth={index === selectedRouteIndex ? 6 : 4}
                tappable
                onPress={() => setSelectedRouteIndex(index)}
              />
            );
          })}

          <Marker coordinate={{ latitude: Number(currentLocation.latitude), longitude: Number(currentLocation.longitude) }} rotation={Number(currentLocation.heading || 0)} title={user.assignedVehicleId || "My Vehicle"} description="Current vehicle location" anchor={{ x: 0.5, y: 0.5 }}>
            <Text style={{ color: "#2563EB", fontSize: 30 }}>▲</Text>
          </Marker>

          {destination && (
            <Marker coordinate={destination} title="Destination">
              <Text style={{ fontSize: 36 }}>📍</Text>
            </Marker>
          )}

          {roadIncidents.map((incident) => (
            <Marker
              key={incident.id}
              coordinate={{
                latitude: Number(incident.latitude),
                longitude: Number(incident.longitude),
              }}
              onPress={() => setSelectedIncident(incident)}
            >
              <Text style={{ fontSize: 34 }}>
                {getIncidentIcon(incident.type)}
              </Text>
            </Marker>
          ))}

          {ambulanceLocation && (
            <Marker
              coordinate={ambulanceLocation}
              title={`🚑 ${ambulanceWarning.ambulanceId}`}
              description={`Distance: ${ambulanceWarning.distance} km`}
            >
              <Text style={{ fontSize: 36 }}>🚑</Text>
            </Marker>
          )}
        </MapView>
        <TouchableOpacity onPress={toggleNorthUp} style={{ position: "absolute", right: 10, bottom: 10, backgroundColor: "#0F172A", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 }}>
          <Text style={{ color: "#F8FAFC", fontWeight: "800" }}>{headingUp ? "North up" : "Heading up"}</Text>
        </TouchableOpacity>
      </View>

      {selectedIncident && (
        <View
          style={[
            styles.incidentCard,
            {
              borderColor: "#DC2626",
              borderWidth: 2,
              marginTop: 15,
            },
          ]}
        >
          <Text style={styles.incidentTitle}>
            🚨 {selectedIncident.type}
          </Text>

          <Text style={styles.info}>{selectedIncident.description}</Text>

          <Text style={styles.warningText}>
            📍{" "}
            {selectedIncident.locationName || "Location not available"}
          </Text>

          <Text style={styles.warningText}>
            Status: {selectedIncident.status}
          </Text>

          {selectedIncident.imageUrl ? (
            <View>
              <Image
                source={{
                  uri: `${BASE_URL}${selectedIncident.imageUrl}`,
                  cache: "reload",
                }}
                style={{
                  width: "100%",
                  height: 180,
                  borderRadius: 12,
                  marginTop: 10,
                  backgroundColor: "#E5E7EB",
                }}
                resizeMode="cover"
                onError={(e) => {
                  console.log("Image load error:", e.nativeEvent);
                  console.log("Image URL:", `${BASE_URL}${selectedIncident.imageUrl}`);
                }}
                onLoad={() => {
                  console.log("Image loaded successfully from:", `${BASE_URL}${selectedIncident.imageUrl}`);
                }}
              />
              <Text style={{fontSize: 11, color: "#6B7280", marginTop: 4, textAlign: "center"}}>
                Uploaded image
              </Text>
            </View>
          ) : (
            <Text style={[styles.info, {marginTop: 10, textAlign: "center", color: "#9CA3AF"}]}>
              No image uploaded for this incident
            </Text>
          )}

          <TouchableOpacity
            style={[styles.menuButton, { marginTop: 10 }]}
            onPress={() => setSelectedIncident(null)}
          >
            <Text style={styles.menuText}>Close Incident Details</Text>
          </TouchableOpacity>
        </View>
      )}

      {routes.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>Suggested Routes</Text>

          {routes.map((route, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuButton,
                {
                  backgroundColor:
                    index === selectedRouteIndex ? "#DC2626" : "#166534",
                },
              ]}
              onPress={() => setSelectedRouteIndex(index)}
            >
              <Text style={styles.menuText}>
                {index === 0 ? "Shortest Route" : `Route ${index + 1}`} -{" "}
                {(route.distance / 1000).toFixed(2)} km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.info}>Latitude: {currentLocation.latitude}</Text>
      <Text style={styles.info}>Longitude: {currentLocation.longitude}</Text>
      <Text style={styles.info}>
        Speed: {currentLocation?.speed != null ? Math.max(0, currentLocation.speed) : "calculating..."} km/h
      </Text>

      {tripStarted && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Trip Started</Text>
          <Text style={styles.info}>SafeZone Map is tracking your route.</Text>
        </View>
      )}

      {ambulanceWarning && (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>
            🚑 {ambulanceWarning.label || "Ambulance Approaching"}
          </Text>

          <Text style={styles.warningText}>
            Ambulance: {ambulanceWarning.ambulanceId}
          </Text>

          <Text style={styles.warningText}>
            Distance: {ambulanceWarning.distance} km
          </Text>

          <Text style={styles.warningText}>
            {ambulanceWarning.message || "Please give way safely."}
          </Text>
        </View>
      )}

      {!tripStarted ? (
        <TouchableOpacity style={styles.button} onPress={handleStartTrip}>
          <Text style={styles.buttonText}>Start Trip</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#DC2626" }]}
          onPress={handleEndTrip}
        >
          <Text style={styles.buttonText}>End Trip</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

export default GPSTrackingScreen;
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Image,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";

import API from "../services/api";
import styles from "../styles/styles";

const BASE_URL = "http://172.29.112.1:5000";

function RoadIncidentDetailsScreen({
  token,
  user,
  setScreen,
  selectedIncident,
  setRespondingIncident,
}) {
  const mapRef = useRef(null);
  const [incident, setIncident] = useState(selectedIncident);
  const [responding, setResponding] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [hospitalResponding, setHospitalResponding] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [showShareModal, setShowShareModal] = useState(false);

  const getIncidentTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "accident":
        return "🚗";
      case "debris":
        return "🚧";
      case "hazard":
        return "⚠️";
      case "pothole":
        return "🕳️";
      default:
        return "📍";
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

  const getCurrentLocation = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required");
        return null;
      }

      const location = await Location.getCurrentPositionAsync({});
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.log("Location error:", error);
      return null;
    }
  };

  const handleRespondToIncident = async () => {
    try {
      if (!user?.id) {
        Alert.alert("Error", "User information missing");
        return;
      }

      setResponding(true);

      const location = await getCurrentLocation();
      if (!location) {
        setResponding(false);
        return;
      }

      setCurrentLocation(location);

      // Call API to mark driver as responding
      const res = await API.post(
        `/road-incidents/${incident.id}/respond`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert(
        "✅ You are now responding",
        `Moving to incident location: ${incident.locationName || "Unknown location"}`
      );

      // Set the responding incident and navigate to response screen
      setRespondingIncident(res.data);
      setScreen("respondingToIncident");
    } catch (error) {
      console.log("Response error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Could not respond to incident"
      );
    } finally {
      setResponding(false);
    }
  };

  const handleHospitalRespond = async () => {
    try {
      if (!user?.id || user.role !== "hospital_admin") {
        Alert.alert("Error", "Only hospital admins can respond");
        return;
      }

      setHospitalResponding(true);

      const res = await API.post(
        `/road-incidents/${incident.id}/hospital-respond`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert(
        "✅ Response Sent",
        "Incident reporter has been notified that you are responding"
      );

      setIncident(res.data.incident);
      
      // Fetch available drivers to share with
      fetchAvailableDrivers();
    } catch (error) {
      console.log("Hospital response error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Could not mark as responding"
      );
    } finally {
      setHospitalResponding(false);
    }
  };

  const fetchAvailableDrivers = async () => {
    try {
      const res = await API.get("/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Filter ambulance drivers from same hospital
      const drivers = res.data.filter(
        (u) =>
          u.role === "ambulance_driver" &&
          u.hospitalId === user.hospitalId
      );

      setAvailableDrivers(drivers);
      setShowShareModal(true);
    } catch (error) {
      console.log("Error fetching drivers:", error);
    }
  };

  const handleShareWithDriver = async (driverId, driverName) => {
    try {
      const res = await API.post(
        `/road-incidents/${incident.id}/hospital-share`,
        { driverId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert(
        "✅ Shared",
        `Incident shared with ${driverName}`
      );
    } catch (error) {
      console.log("Share error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Could not share incident"
      );
    }
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

  return (
    <View style={styles.container}>
      <View style={{ height: 250, marginBottom: 10, borderRadius: 10, overflow: "hidden" }}>
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
          <Marker
            coordinate={{
              latitude: Number(incident.latitude),
              longitude: Number(incident.longitude),
            }}
            title={incident.type || "Incident"}
            description={incident.description}
            pinColor="#ff6b6b"
          />

          {currentLocation && (
            <Marker
              coordinate={currentLocation}
              title="Your Location"
              pinColor="#0066cc"
            />
          )}
        </MapView>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <Text style={{ fontSize: 32 }}>
              {getIncidentTypeIcon(incident.type)}
            </Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.cardTitle}>
                {incident.type?.toUpperCase() || "INCIDENT"}
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
          </View>

          <Text style={{ color: "#666", marginBottom: 10 }}>
            {incident.description || "No description provided"}
          </Text>

          {incident.locationName && (
            <View style={{ marginBottom: 10, padding: 10, backgroundColor: "#f5f5f5", borderRadius: 5 }}>
              <Text style={{ fontWeight: "bold", color: "#333" }}>
                📍 Location
              </Text>
              <Text style={{ color: "#666", marginTop: 5 }}>
                {incident.locationName}
              </Text>
            </View>
          )}

          <View style={{ marginBottom: 10, padding: 10, backgroundColor: "#f5f5f5", borderRadius: 5 }}>
            <Text style={{ fontWeight: "bold", color: "#333" }}>
              📍 Coordinates
            </Text>
            <Text style={{ color: "#666", marginTop: 5 }}>
              {Number(incident.latitude).toFixed(6)}, {Number(incident.longitude).toFixed(6)}
            </Text>
          </View>

          {incident.respondingDriverName && (
            <View style={{ marginBottom: 10, padding: 10, backgroundColor: "#fff3cd", borderRadius: 5 }}>
              <Text style={{ fontWeight: "bold", color: "#333" }}>
                👤 Driver Responding
              </Text>
              <Text style={{ color: "#666", marginTop: 5 }}>
                {incident.respondingDriverName}
              </Text>
            </View>
          )}

          {incident.imageUrl && (
            <View style={{ marginBottom: 10 }}>
              <Text style={{ fontWeight: "bold", color: "#333", marginBottom: 5 }}>
                📸 Evidence Image
              </Text>
              <Image
                source={{
                  uri: `${BASE_URL}${incident.imageUrl}`,
                }}
                style={{
                  width: "100%",
                  height: 250,
                  borderRadius: 12,
                  backgroundColor: "#E5E7EB",
                }}
                resizeMode="cover"
                onLoad={() => {
                  console.log("✅ Image loaded successfully");
                }}
                onError={(error) => {
                  console.log("❌ Image load error:", error);
                  console.log("📸 Image URL attempted:", `${BASE_URL}${incident.imageUrl}`);
                }}
              />
              <Text style={{ color: "#999", fontSize: 12, marginTop: 5 }}>
                URL: {incident.imageUrl}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={{ paddingVertical: 10 }}>
        {/* Hospital Admin Response Section */}
        {user?.role === "hospital_admin" && (
          <>
            {!incident.respondingHospitalName ? (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: "#10b981", opacity: hospitalResponding ? 0.6 : 1 }]}
                onPress={handleHospitalRespond}
                disabled={hospitalResponding}
              >
                <Text style={styles.buttonText}>
                  {hospitalResponding ? "Marking as Responding..." : "🏥 Hospital Respond"}
                </Text>
              </TouchableOpacity>
            ) : incident.respondingHospitalName === user.hospitalName ? (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: "#059669" }]}
                onPress={fetchAvailableDrivers}
              >
                <Text style={styles.buttonText}>👥 Share with Ambulance Driver</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.button, { backgroundColor: "#ccc" }]}>
                <Text style={styles.buttonText}>Another hospital is responding</Text>
              </View>
            )}
          </>
        )}

        {/* Driver Response Section */}
        {user?.role === "ambulance_driver" && (
          <>
            {!incident.respondingDriverName ? (
              <TouchableOpacity
                style={[styles.button, { opacity: responding ? 0.6 : 1 }]}
                onPress={handleRespondToIncident}
                disabled={responding}
              >
                <Text style={styles.buttonText}>
                  {responding ? "Confirming..." : "🚑 Respond to Incident"}
                </Text>
              </TouchableOpacity>
            ) : incident.respondingDriverName === user?.name ? (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: "#ffd93d" }]}
                onPress={() => setScreen("respondingToIncident")}
              >
                <Text style={styles.buttonText}>📍 Open Map & Continue</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.button, { backgroundColor: "#ccc" }]}>
                <Text style={styles.buttonText}>Another driver is responding</Text>
              </View>
            )}
          </>
        )}

        {/* Hospital Responding Info */}
        {incident.respondingHospitalName && (
          <View style={{
            backgroundColor: "#dbeafe",
            padding: 10,
            borderRadius: 5,
            marginBottom: 10,
            borderLeftColor: "#0284c7",
            borderLeftWidth: 3,
          }}>
            <Text style={{ color: "#0c4a6e", fontWeight: "bold" }}>
              🏥 {incident.respondingHospitalName} is responding
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#999", marginTop: 10 }]}
          onPress={() => setScreen("nearbyIncidents")}
        >
          <Text style={styles.buttonText}>← Back to List</Text>
        </TouchableOpacity>
      </View>

      {/* Share Modal */}
      {showShareModal && (
        <View style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
          zIndex: 1000,
        }}>
          <View style={{
            backgroundColor: "white",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            maxHeight: "70%",
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 15,
              color: "#333",
            }}>
              👥 Share Incident with Driver
            </Text>
            
            <ScrollView style={{ marginBottom: 10 }}>
              {availableDrivers.length === 0 ? (
                <Text style={{ color: "#666", padding: 10 }}>
                  No drivers available
                </Text>
              ) : (
                availableDrivers.map((driver) => (
                  <TouchableOpacity
                    key={driver.id}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                      borderBottomColor: "#eee",
                      borderBottomWidth: 1,
                    }}
                    onPress={() => {
                      handleShareWithDriver(driver.id, driver.name);
                      setShowShareModal(false);
                    }}
                  >
                    <View>
                      <Text style={{ fontWeight: "bold", color: "#333" }}>
                        {driver.name}
                      </Text>
                      <Text style={{ color: "#666", fontSize: 12 }}>
                        📱 {driver.phone || "No phone"}
                      </Text>
                    </View>
                    <Text style={{ color: "#0066cc" }}>→</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={{
                backgroundColor: "#999",
                padding: 12,
                borderRadius: 8,
                alignItems: "center",
              }}
              onPress={() => setShowShareModal(false)}
            >
              <Text style={{ color: "white", fontWeight: "bold" }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

export default RoadIncidentDetailsScreen;


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
  Modal,
} from "react-native";
import * as Location from "expo-location";

import API from "../services/api";
import styles from "../styles/styles";

const BASE_URL = "http://172.29.112.1:5000";

function NearbyIncidentsScreen({ token, user, setScreen, setSelectedIncident, setIncidentCallback }) {
  const [nearbyIncidents, setNearbyIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [noPermission, setNoPermission] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

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

  const fetchNearbyHospitals = async (incidentLocation) => {
    try {
      const res = await API.get("/hospitals", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const hospitals = res.data;
      
      // Calculate distance to each hospital
      const hospitalsWithDistance = hospitals
        .map((hospital) => {
          const distance = calculateDistanceKm(
            incidentLocation.latitude,
            incidentLocation.longitude,
            Number(hospital.latitude),
            Number(hospital.longitude)
          );

          return {
            ...hospital,
            distance: distance.toFixed(2),
          };
        })
        .filter((hospital) => Number(hospital.distance) <= 15)
        .sort((a, b) => Number(a.distance) - Number(b.distance))
        .slice(0, 5); // Show top 5 nearest hospitals

      if (hospitalsWithDistance.length === 0) {
        Alert.alert("Success", "Road incident reported successfully");
        return;
      }

      // Show nearby hospitals popup
      showNearbyHospitalsPopup(hospitalsWithDistance);
    } catch (error) {
      console.log("Hospital fetch error:", error);
      Alert.alert("Success", "Road incident reported successfully");
    }
  };

  const showNearbyHospitalsPopup = (hospitals) => {
    const hospitalsText = hospitals
      .map(
        (hospital) =>
          `🏥 ${hospital.name}\n📍 ${hospital.distance}km away\n📞 ${hospital.phone || "N/A"}\n`
      )
      .join("\n");

    Alert.alert(
      "🚨 Nearby Hospitals Notified",
      `Incident reported successfully!\n\nNearby hospitals that can help:\n\n${hospitalsText}`,
      [
        {
          text: "OK",
          onPress: () => console.log("Popup closed"),
        },
      ]
    );
  };

  useEffect(() => {
    getLocationAndFetchIncidents();
    const interval = setInterval(getLocationAndFetchIncidents, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getLocationAndFetchIncidents = async () => {
    try {
      let latitude, longitude;

      // For hospital admins, use hospital's registered location
      if (user?.role === "hospital_admin" && user?.hospitalId) {
        try {
          const hospitalRes = await API.get(`/hospitals/${user.hospitalId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          latitude = hospitalRes.data.latitude;
          longitude = hospitalRes.data.longitude;

          setCurrentLocation({
            latitude: latitude,
            longitude: longitude,
          });

          await fetchNearbyIncidents(latitude, longitude);
          return;
        } catch (error) {
          console.log("Hospital location fetch error:", error);
          Alert.alert("Error", "Could not fetch hospital location");
          return;
        }
      }

      // For ambulance drivers, use device GPS
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        setNoPermission(true);
        Alert.alert("Permission Denied", "Location permission is required to find nearby incidents");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      await fetchNearbyIncidents(
        location.coords.latitude,
        location.coords.longitude
      );
    } catch (error) {
      console.log("Location error:", error);
      Alert.alert("Error", "Could not get your location");
    }
  };

  const fetchNearbyIncidents = async (latitude, longitude) => {
    try {
      setLoading(true);

      const res = await API.post(
        "/road-incidents/nearby",
        {
          latitude,
          longitude,
          radius: 10, // 10km radius
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Sort by newest first (highest ID first)
      const sortedIncidents = (res.data.incidents || []).sort((a, b) => Number(b.id) - Number(a.id));
      setNearbyIncidents(sortedIncidents);
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
    getLocationAndFetchIncidents();
  };

  const handleIncidentPress = (incident) => {
    setSelectedIncident(incident);
    setScreen("roadIncidentMap");
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

  if (noPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Location Permission Required</Text>
        <Text style={styles.subtitle}>
          Enable location access to see nearby incidents
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={getLocationAndFetchIncidents}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {selectedImage && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center", padding: 20 }}>
            <TouchableOpacity style={{ position: "absolute", top: 40, right: 20, zIndex: 2 }} onPress={() => setSelectedImage(null)}>
              <Text style={{ color: "#fff", fontSize: 28, fontWeight: "700" }}>✕</Text>
            </TouchableOpacity>
            <Image source={{ uri: selectedImage }} style={{ width: "100%", height: 420, borderRadius: 16 }} resizeMode="contain" />
          </View>
        </Modal>
      )}

      <Text style={styles.title}>🚨 Nearby Road Incidents</Text>

      {currentLocation && (
        <Text style={styles.subtitle}>
          Within 10km • {nearbyIncidents.length} incident
          {nearbyIncidents.length !== 1 ? "s" : ""}
        </Text>
      )}

      {loading && !refreshing && (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={{ marginTop: 10 }}>Loading nearby incidents...</Text>
        </View>
      )}

      {!loading && nearbyIncidents.length === 0 && (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={styles.subtitle}>No incidents nearby</Text>
          <Text style={{ marginTop: 10, color: "#666" }}>
            Stay safe out there! ✨
          </Text>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {nearbyIncidents.map((incident) => (
          <TouchableOpacity
            key={incident.id}
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
                  <TouchableOpacity onPress={() => setSelectedImage(`${BASE_URL}${incident.imageUrl}`)}>
                    <Image
                      source={{
                        uri: `${BASE_URL}${incident.imageUrl}`,
                      }}
                      style={{
                        width: "100%",
                        height: 180,
                        borderRadius: 10,
                        marginTop: 10,
                        backgroundColor: "#E5E7EB",
                      }}
                      resizeMode="cover"
                      onError={(error) => {
                        console.log("Nearby incidents list image error:", error);
                      }}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableOpacity>
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
    </View>
  );
}

export default NearbyIncidentsScreen;


import React, { useState, useRef, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Animated,
} from "react-native";

import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";

import API from "../services/api";
import styles from "../styles/styles";

const BASE_URL = "http://172.29.112.1:5000";

function RoadIncidentsScreen({ token, callbacks, onIncidentSubmitted }) {
  const [incidentType, setIncidentType] = useState("");
  const [incidentDescription, setIncidentDescription] = useState("");
  const [incidentImage, setIncidentImage] = useState(null);

  const [locationQuery, setLocationQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationName, setLocationName] = useState("");
  const [GradientComp, setGradientComp] = useState(() => View);
  const locBtnAnim = useRef(new Animated.Value(1)).current;
  const incidentTypes = [
    "Accident",
    "Flood",
    "Traffic Jam",
    "Falling Tree",
    "Damaged Road",
    "Landslide",
    "Other",
  ];
  const submitBtnAnim = useRef(new Animated.Value(1)).current;

  const pressIn = (anim) => {
    Animated.spring(anim, { toValue: 0.96, useNativeDriver: true, speed: 20 }).start();
  };

  const pressOut = (anim) => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  };

  useEffect(() => {
    let mounted = true;
    import('expo-linear-gradient')
      .then((mod) => {
        if (mounted && mod && mod.LinearGradient) setGradientComp(() => mod.LinearGradient);
      })
      .catch(() => {});
    return () => (mounted = false);
  }, []);

  const triggerHaptic = async () => {
    try {
      const m = await import('expo-haptics');
      if (m && m.impactAsync) await m.impactAsync(m.ImpactFeedbackStyle?.Medium ?? m.ImpactFeedbackStyle.Medium);
    } catch (e) {
      // fallback silently
    }
  };

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


  const fetchIncidents = async () => {
    try {
      const res = await API.get("/road-incidents", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let center = selectedLocation;

      if (!center) {
        const permission = await Location.requestForegroundPermissionsAsync();

        if (permission.status === "granted") {
          const location = await Location.getCurrentPositionAsync({});
          center = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
        }
      }

      if (center) {
        // Incident list data is not displayed in this screen anymore.
        // Keeping the network call to preserve refresh behavior if needed.
        return;
      } else {
        return;
      }
    } catch (error) {
      console.log(error.response?.data || error.message);
      Alert.alert("Error", "Failed to load road incidents");
    }
  };

  const searchIncidentLocation = async (query) => {
  try {
    setLocationQuery(query);

    if (query.trim().length < 3) {
      setLocationSuggestions([]);
      return;
    }

    const encodedQuery = encodeURIComponent(query);

    const response = await fetch(
      `https://photon.komoot.io/api/?q=${encodedQuery}&limit=8&lat=7.8731&lon=80.7718`
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

    setLocationSuggestions(results);
  } catch (error) {
    console.log("Location search failed:", error);
    setLocationSuggestions([]);
  }
};

  const useCurrentIncidentLocation = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});

      const current = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setSelectedLocation(current);

      const address = await Location.reverseGeocodeAsync(current);
      const place = address[0];

      const name = `${place?.name || ""} ${place?.street || ""} ${
        place?.city || place?.region || ""
      }`.trim();

      setLocationName(name || "Current Location");
      setLocationQuery(name || "Current Location");
      setLocationSuggestions([]);
    } catch (error) {
      console.log(error);
      Alert.alert("Location Error", "Could not get current location");
    }
  };

  const pickIncidentImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permission.status !== "granted") {
        Alert.alert("Permission Denied", "Gallery permission is required");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled) {
        setIncidentImage(result.assets[0]);
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Image Error", "Could not select image");
    }
  };

  const reportIncident = async () => {
    try {
      if (!incidentType || !incidentDescription) {
        Alert.alert(
          "Missing Details",
          "Please fill incident type and description"
        );
        return;
      }

      if (!selectedLocation) {
        Alert.alert(
          "Missing Location",
          "Please search a location or use current location"
        );
        return;
      }

      const formData = new FormData();

      formData.append("type", incidentType);
      formData.append("description", incidentDescription);
      formData.append("latitude", selectedLocation.latitude.toString());
      formData.append("longitude", selectedLocation.longitude.toString());
      formData.append("locationName", locationName || locationQuery);

      if (incidentImage) {
        formData.append("image", {
          uri: incidentImage.uri,
          name: incidentImage.fileName || "incident-photo.jpg",
          type: incidentImage.mimeType || "image/jpeg",
        });
      }

      await API.post("/road-incidents", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      // Use callbacks from HospitalDashboardScreen if available
      if (callbacks?.fetchNearbyHospitals && callbacks?.showNearbyHospitalsPopup) {
        callbacks.fetchNearbyHospitals(selectedLocation);
      } else if (onIncidentSubmitted) {
        onIncidentSubmitted(selectedLocation);
      } else {
        // Default behavior: Fetch nearby hospitals and show popup
        fetchNearbyHospitals(selectedLocation);
      }

      setIncidentType("");
      setIncidentDescription("");
      setIncidentImage(null);
      setSelectedLocation(null);
      setLocationName("");
      setLocationQuery("");
      setLocationSuggestions([]);

      fetchIncidents();
    } catch (error) {
      console.log(error.response?.data || error.message);
      Alert.alert("Error", "Failed to report incident");
    }
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

  const renderIncidentCard = (incident, isNearby = false) => (
    <View
      key={incident.id}
      style={[
        styles.incidentCard,
        {
          borderColor: isNearby ? "#22d3ee" : "#334155",
          borderWidth: 1,
          padding: 18,
          backgroundColor: "#111827",
          shadowColor: isNearby ? "rgba(34, 211, 238, 0.2)" : "rgba(0, 0, 0, 0.12)",
        },
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <Text style={styles.incidentTitle}>{incident.type}</Text>
        <View
          style={{
            backgroundColor: isNearby ? "#22d3ee" : "#334155",
            borderRadius: 999,
            paddingVertical: 6,
            paddingHorizontal: 12,
          }}
        >
          <Text style={{ color: "#0f172a", fontWeight: "700", fontSize: 13 }}>
            {incident.distance} km
          </Text>
        </View>
      </View>

      <Text style={[styles.info, { marginBottom: 12, color: "#cbd5e1" }]}> {incident.description}</Text>

      <Text style={{ color: "#94a3b8", fontSize: 14, marginBottom: 6 }}>
        📍 {incident.locationName || "Location not available"}
      </Text>

      {incident.imageUrl ? (
        <Image
          source={{ uri: `${BASE_URL}${incident.imageUrl}` }}
          style={{
            width: "100%",
            height: 170,
            borderRadius: 16,
            marginTop: 12,
            backgroundColor: "#0f172a",
          }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            marginTop: 12,
            padding: 14,
            backgroundColor: "rgba(148, 163, 184, 0.1)",
            borderRadius: 14,
          }}
        >
          <Text style={{ color: "#94a3b8", fontSize: 14 }}>
            No image uploaded
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0F172A" }}
      contentContainerStyle={{ padding: 18, paddingBottom: 120 }}
    >
      <View
        style={{
          backgroundColor: "#111827",
          borderRadius: 24,
          padding: 22,
          marginBottom: 18,
          borderWidth: 1,
          borderColor: "#334155",
          shadowColor: "rgba(0, 0, 0, 0.16)",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.2,
          shadowRadius: 24,
        }}
      >
        <Text style={{ color: "#38bdf8", fontSize: 15, fontWeight: "700", marginBottom: 8 }}>ROAD SAFETY</Text>
        <Text style={{ color: "#f8fafc", fontSize: 28, fontWeight: "800", marginBottom: 10 }}>Report an Incident</Text>
        <Text style={{ color: "#cbd5e1", fontSize: 16, lineHeight: 24 }}>
          Keep the road safe by sharing hazards, accidents, and dangerous conditions in your area.
        </Text>
      </View>

      <View style={[styles.card, { padding: 20, borderRadius: 24, marginBottom: 20 }]}> 
        <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>Incident Details</Text>
        <Text style={{ color: "#94a3b8", fontSize: 14, marginBottom: 12 }}>Select the incident type below, then add a brief description and location.</Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 16 }}>
          {incidentTypes.map((type) => {
            const isSelected = incidentType === type;
            return (
              <TouchableOpacity
                key={type}
                onPress={() => setIncidentType(type)}
                activeOpacity={0.85}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: isSelected ? "#22d3ee" : "#334155",
                  backgroundColor: isSelected ? "rgba(34, 211, 238, 0.15)" : "#111827",
                  marginBottom: 8,
                  marginRight: 10,
                }}
              >
                <Text style={{ color: isSelected ? "#ffffff" : "#cbd5e1", fontWeight: "700" }}>{type}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          placeholder="Describe the incident"
          placeholderTextColor="#94a3b8"
          value={incidentDescription}
          onChangeText={setIncidentDescription}
          style={[styles.textArea, { minHeight: 130, marginBottom: 16 }]}
          multiline
        />

        <Text style={{ color: "#94a3b8", fontSize: 14, marginBottom: 8 }}>Incident Location</Text>
        <TextInput
          placeholder="Search or pick a location"
          placeholderTextColor="#94a3b8"
          value={locationQuery}
          onChangeText={searchIncidentLocation}
          style={styles.input}
        />

        {locationSuggestions.map((item) => (
          <TouchableOpacity
            key={item.place_id}
            style={{
              marginTop: 10,
              borderRadius: 18,
              backgroundColor: "#0f172a",
              borderWidth: 1,
              borderColor: "#334155",
              padding: 14,
            }}
            onPress={() => {
              const pickedLocation = {
                latitude: Number(item.lat),
                longitude: Number(item.lon),
              };

              setSelectedLocation(pickedLocation);
              setLocationName(item.display_name);
              setLocationQuery(item.display_name);
              setLocationSuggestions([]);
            }}
          >
            <Text style={{ color: "#f8fafc", fontWeight: "700", marginBottom: 4 }}>{item.display_name}</Text>
            <Text style={{ color: "#94a3b8", fontSize: 13 }}>Tap to select this location</Text>
          </TouchableOpacity>
        ))}

        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 16 }}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPressIn={() => pressIn(locBtnAnim)}
            onPressOut={() => pressOut(locBtnAnim)}
            onPress={async () => { await triggerHaptic(); useCurrentIncidentLocation(); }}
            style={{ width: "48%", marginBottom: 10 }}
          >
            <Animated.View style={{ transform: [{ scale: locBtnAnim }] }}>
              <GradientComp colors={["#00bcd4", "#2563eb"]} style={[styles.accentButton, { flexDirection: "row", alignItems: "center", justifyContent: "center" }]}> 
                <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "700", marginRight: 10 }}>📍</Text>
                <Text style={styles.buttonText}>Use Current Location</Text>
              </GradientComp>
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            onPressIn={() => pressIn(submitBtnAnim)}
            onPressOut={() => pressOut(submitBtnAnim)}
            onPress={pickIncidentImage}
            style={{ width: "48%", marginBottom: 10 }}
          >
            <Animated.View style={{ transform: [{ scale: submitBtnAnim }] }}>
              <View style={[styles.menuButton, { flexDirection: "row", alignItems: "center", justifyContent: "center" }]}> 
                <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "700", marginRight: 10 }}>📷</Text>
                <Text style={styles.menuText}>Attach Image</Text>
              </View>
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ width: "48%", marginBottom: 10 }}
            activeOpacity={0.9}
            onPressIn={() => pressIn(submitBtnAnim)}
            onPressOut={() => pressOut(submitBtnAnim)}
            onPress={async () => { await triggerHaptic(); reportIncident(); }}
          >
            <Animated.View style={{ transform: [{ scale: submitBtnAnim }] }}>
              <GradientComp colors={["#2563eb", "#1e40af"]} style={[styles.primaryButton, { justifyContent: "center" }]}> 
                <Text style={styles.buttonText}>Submit Incident</Text>
              </GradientComp>
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ width: "48%", marginBottom: 10 }}
            activeOpacity={0.9}
            onPress={fetchIncidents}
          >
            <View style={[styles.menuButton, { justifyContent: "center" }]}> 
              <Text style={styles.menuText}>Refresh</Text>
            </View>
          </TouchableOpacity>
        </View>

        {selectedLocation ? (
          <View style={{ marginTop: 18, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: "#334155", backgroundColor: "#0f172a" }}>
            <Text style={{ color: "#f8fafc", fontWeight: "700", marginBottom: 6 }}>Selected Location</Text>
            <Text style={{ color: "#cbd5e1", fontSize: 14 }}>{locationName || locationQuery}</Text>
          </View>
        ) : null}

        {incidentImage ? (
          <View style={{ marginTop: 18, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "#334155" }}>
            <Image source={{ uri: incidentImage.uri }} style={{ width: "100%", height: 190 }} resizeMode="cover" />
          </View>
        ) : null}
      </View>

    </ScrollView>
  );
}

export default RoadIncidentsScreen;

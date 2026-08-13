import React, { useEffect, useRef, useState } from "react";
import { Alert, View, Text, TouchableOpacity } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import styles from "../styles/styles";
import useHeadingUpMap from "../hooks/useHeadingUpMap";
import { fetchOSMRoutes, formatDistance, formatDuration } from "../services/routeService";
import FullscreenMapButton from "../components/FullscreenMapButton";

function OfficerTripTrackingScreen({ destination, setScreen, setOfficerTripDestination, clearOfficerIncidentAlerts }) {
  if (!destination) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No trip destination selected</Text>
      </View>
    );
  }

  const lat = Number(destination.latitude);
  const lng = Number(destination.longitude);
  const mapRef = useRef(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [route, setRoute] = useState([]);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [fullScreenMap, setFullScreenMap] = useState(false);
  const { headingUp, toggleNorthUp } = useHeadingUpMap(mapRef, currentLocation);

  useEffect(() => {
    let watcher;
    const startTracking = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Location permission needed", "Allow location access to enable live police navigation.");
        return;
      }

      watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        (location) => setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          heading: location.coords.heading,
        })
      );
    };
    startTracking().catch((error) => console.log("Police tracking error:", error));
    return () => watcher?.remove();
  }, []);

  useEffect(() => {
    if (!currentLocation) return;
    fetchOSMRoutes(currentLocation, { latitude: lat, longitude: lng })
      .then((routes) => {
        const selected = routes[0];
        if (!selected) return;
        setRoute(selected.geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude })));
        setDistance(selected.distance);
        setDuration(selected.duration);
      })
      .catch((error) => console.log("Police route error:", error));
  }, [currentLocation?.latitude, currentLocation?.longitude]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚔 Police Officer Trip</Text>

      <View style={{ height: fullScreenMap ? "100%" : 400, flex: fullScreenMap ? 1 : undefined, position: "relative" }}>
      <MapView
        ref={mapRef}
        style={{ width: "100%", height: 400 }}
        initialRegion={{
          latitude: currentLocation?.latitude || lat,
          longitude: currentLocation?.longitude || lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        {currentLocation && <Marker coordinate={currentLocation} rotation={Number(currentLocation.heading || 0)} anchor={{ x: 0.5, y: 0.5 }}><Text style={{ color: "#2563EB", fontSize: 30 }}>▲</Text></Marker>}
        <Marker
          coordinate={{ latitude: lat, longitude: lng }}
          title="Destination"
          description={destination.type || "Emergency Location"}
        />
        {route.length > 0 && <Polyline coordinates={route} strokeColor="#2563EB" strokeWidth={4} />}
      </MapView>
      <FullscreenMapButton fullScreen={fullScreenMap} onPress={() => setFullScreenMap((value) => !value)} />
      </View>

      <TouchableOpacity onPress={toggleNorthUp} style={{ backgroundColor: "#1E293B", padding: 10, borderRadius: 10, marginTop: 10 }}>
        <Text style={{ color: "#F8FAFC", fontWeight: "700", textAlign: "center" }}>{headingUp ? "North up" : "Heading up"}</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Destination Details</Text>
        <Text style={styles.info}>📍 Latitude: {lat}</Text>
        <Text style={styles.info}>📍 Longitude: {lng}</Text>
        <Text style={styles.info}>{destination.message}</Text>
        <Text style={styles.info}>{formatDistance(distance)} · {formatDuration(duration)}</Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#dc2626" }]}
          onPress={() => {
            if (clearOfficerIncidentAlerts) clearOfficerIncidentAlerts();
            if (setOfficerTripDestination) setOfficerTripDestination(null);
            setScreen("policeOfficerDashboard");
          }}
        >
          <Text style={styles.buttonText}>✅ End Trip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default OfficerTripTrackingScreen;
import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import MapView, { Marker } from "react-native-maps";
import styles from "../styles/styles";
import FullscreenMapButton from "../components/FullscreenMapButton";

function OfficerIncidentMapScreen({
  incident,
  setScreen,
  setOfficerTripDestination,
}){ 
  const [fullScreenMap, setFullScreenMap] = useState(false);

  if (!incident) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No incident selected</Text>
      </View>
    );
  }

  const lat = Number(incident.latitude);
  const lng = Number(incident.longitude);

  if (!lat || !lng) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>⚠️ Location not available</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setScreen("officerIncidentAlerts")}
        >
          <Text style={styles.buttonText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚠️ Road Incident Map</Text>

      <View style={{ height: fullScreenMap ? "100%" : 400, flex: fullScreenMap ? 1 : undefined, position: "relative" }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker
          coordinate={{ latitude: lat, longitude: lng }}
          title={incident.type || "Road Incident"}
          description={incident.location || "Incident location"}
        />
      </MapView>
      <FullscreenMapButton fullScreen={fullScreenMap} onPress={() => setFullScreenMap((value) => !value)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          ⚠️ {incident.type || "Road Incident"}
        </Text>
        <Text style={styles.info}>
          Location: {incident.location || "Location not available"}
        </Text>
        <Text style={styles.info}>Latitude: {lat}</Text>
        <Text style={styles.info}>Longitude: {lng}</Text>
        <Text style={styles.info}>{incident.message}</Text>
      <TouchableOpacity
  style={[styles.button, { backgroundColor: "#16a34a" }]}
  onPress={() => {
    setOfficerTripDestination(incident);
    setScreen("gpsTracking");
  }}
>
  <Text style={styles.buttonText}>🚔 Start Trip to Incident Location</Text>
</TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setScreen("officerIncidentAlerts")}
        >
          <Text style={styles.buttonText}>← Back to Incidents</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default OfficerIncidentMapScreen;
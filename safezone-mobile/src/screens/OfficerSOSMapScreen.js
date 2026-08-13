import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import MapView, { Marker } from "react-native-maps";
import styles from "../styles/styles";
import FullscreenMapButton from "../components/FullscreenMapButton";

function OfficerSOSMapScreen({
  alert,
  setScreen,
  setOfficerTripDestination,
}) {
  const [fullScreenMap, setFullScreenMap] = useState(false);

  if (!alert) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No SOS alert selected</Text>
      </View>
    );
  }

  const lat = Number(alert.latitude);
  const lng = Number(alert.longitude);

  if (!lat || !lng) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>⚠️ Location not available</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setScreen("officerSOSAlerts")}
        >
          <Text style={styles.buttonText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🆘 SOS Alert Map</Text>

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
          title="SOS Alert"
          description={alert.senderName || "SOS location"}
        />
      </MapView>
      <FullscreenMapButton fullScreen={fullScreenMap} onPress={() => setFullScreenMap((value) => !value)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🆘 SOS Details</Text>
        <Text style={styles.info}>Sender: {alert.senderName || "Unknown"}</Text>
        <Text style={styles.info}>Latitude: {lat}</Text>
        <Text style={styles.info}>Longitude: {lng}</Text>
        <Text style={styles.info}>{alert.message}</Text>
       <TouchableOpacity
  style={[styles.button, { backgroundColor: "#16a34a" }]}
  onPress={() => {
    setOfficerTripDestination(alert);
    setScreen("gpsTracking");
  }}
>
  <Text style={styles.buttonText}>🚔 Start Trip to SOS Location</Text>
</TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setScreen("officerSOSAlerts")}
        >
          <Text style={styles.buttonText}>← Back to SOS Alerts</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default OfficerSOSMapScreen;
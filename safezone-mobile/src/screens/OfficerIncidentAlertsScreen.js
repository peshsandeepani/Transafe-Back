import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import styles from "../styles/styles";

function OfficerIncidentAlertsScreen({
  alerts,
  setScreen,
  setSelectedOfficerIncident,
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚠️ Shared Road Incidents</Text>

      <ScrollView>
        {alerts.length === 0 ? (
          <Text style={styles.subtitle}>No shared road incidents</Text>
        ) : (
          alerts.map((incident, index) => (
            <TouchableOpacity
              key={index}
              style={styles.card}
              onPress={() => {
                setSelectedOfficerIncident(incident);
                setScreen("officerIncidentMap");
              }}
            >
              <Text style={styles.cardTitle}>
                ⚠️ {incident.type || "Road Incident"}
              </Text>
              <Text style={styles.info}>
                📍 {incident.location || "Location not available"}
              </Text>
              <Text style={styles.info}>
                Coordinates: {incident.latitude}, {incident.longitude}
              </Text>
              <Text style={styles.info}>{incident.message}</Text>
              <Text style={{ color: "#0066cc", marginTop: 8 }}>
                Tap to open map and full details
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

export default OfficerIncidentAlertsScreen;
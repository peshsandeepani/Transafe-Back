import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import styles from "../styles/styles";

function PoliceOfficerDashboardScreen({ user, setScreen, officerSOSAlerts, officerIncidentAlerts }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>👮 Police Officer Dashboard</Text>

      <Text style={styles.info}>Welcome {user.name}</Text>

      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setScreen("officerSOSAlerts")}
      >
        <Text style={styles.menuText}>
          🆘 Shared SOS Alerts ({officerSOSAlerts.length})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setScreen("officerIncidentAlerts")}
      >
        <Text style={styles.menuText}>
          ⚠️ Shared Road Incidents ({officerIncidentAlerts.length})
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default PoliceOfficerDashboardScreen;
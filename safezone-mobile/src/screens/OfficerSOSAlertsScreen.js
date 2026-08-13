import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import styles from "../styles/styles";

function OfficerSOSAlertsScreen({
  alerts,
  setScreen,
  setSelectedOfficerSOS,
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🆘 Shared SOS Alerts</Text>

      <ScrollView>
        {alerts.length === 0 ? (
          <Text style={styles.subtitle}>No shared SOS alerts</Text>
        ) : (
          alerts.map((alert, index) => (
            <TouchableOpacity
              key={index}
              style={styles.card}
              onPress={() => {
                setSelectedOfficerSOS(alert);
                setScreen("officerSOSMap");
              }}
            >
              <Text style={styles.cardTitle}>🆘 SOS Alert</Text>
              <Text style={styles.info}>
                Sender: {alert.senderName || "Unknown"}
              </Text>
              <Text style={styles.info}>
                📍 {alert.latitude}, {alert.longitude}
              </Text>
              <Text style={styles.info}>{alert.message}</Text>
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

export default OfficerSOSAlertsScreen;
import React from "react";
import { View, Text } from "react-native";
import styles from "../styles/styles";

function AmbulanceWarningsScreen({ ambulanceWarning }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>🚑 Ambulance Warnings</Text>

      {ambulanceWarning ? (
        <>
          <Text style={styles.warningText}>
            Ambulance: {ambulanceWarning.ambulanceId}
          </Text>
          <Text style={styles.warningText}>
            State: {ambulanceWarning.label || ambulanceWarning.status || "Approaching"}
          </Text>
          <Text style={styles.warningText}>
            Distance: {ambulanceWarning.distance} km
          </Text>
          <Text style={styles.warningText}>{ambulanceWarning.message || "Please give way safely."}</Text>
        </>
      ) : (
        <Text style={styles.info}>No ambulance warnings right now.</Text>
      )}
    </View>
  );
}

export default AmbulanceWarningsScreen;
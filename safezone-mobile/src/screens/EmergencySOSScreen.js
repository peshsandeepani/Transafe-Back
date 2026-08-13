import React, { useState } from "react";

import {
  View,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";

import * as Location from "expo-location";

import API from "../services/api";
import styles from "../styles/styles";

function EmergencySOSScreen({ token, user }) {
  const [sending, setSending] = useState(false);

  const sendSOS = async () => {
    try {
      setSending(true);

      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission required"
        );

        setSending(false);
        return;
      }

      const location =
        await Location.getCurrentPositionAsync({});

      await API.post(
        "/sos/create",
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          senderName: user.name,
          senderRole: user.role,
          vehicleId:
            user.assignedVehicleId || null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert(
        "🚨 SOS Sent",
        "Emergency alert sent successfully"
      );

      setSending(false);

    } catch (error) {
      console.log(error.response?.data || error.message);

      Alert.alert(
        "SOS Error",
        "Failed to send emergency alert"
      );

      setSending(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>
        🚨 Emergency SOS
      </Text>

      <Text style={styles.info}>
        Press only during emergencies
      </Text>

      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: "#DC2626",
            paddingVertical: 30,
            borderRadius: 100,
          },
        ]}
        onPress={sendSOS}
      >
        <Text
          style={{
            color: "white",
            fontSize: 28,
            fontWeight: "bold",
          }}
        >
          {sending ? "Sending..." : "SOS"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default EmergencySOSScreen;
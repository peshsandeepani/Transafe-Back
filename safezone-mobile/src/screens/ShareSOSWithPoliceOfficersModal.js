import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from "react-native";

import API from "../services/api";
import styles from "../styles/styles";

function ShareSOSWithPoliceOfficersModal({
  visible,
  sosAlert,
  token,
  onClose,
}) {
  const [officers, setOfficers] = useState([]);
  const [selectedOfficers, setSelectedOfficers] = useState([]);

  const fetchOfficers = async () => {
    try {
      const res = await API.get("/police-departments/officers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setOfficers(res.data || []);
    } catch (error) {
      console.log(error.response?.data || error.message);
      Alert.alert("Error", "Failed to load police officers");
    }
  };

  useEffect(() => {
    if (visible) {
      fetchOfficers();
    }
  }, [visible]);

  const toggleOfficer = (id) => {
    setSelectedOfficers((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  const shareSOS = async () => {
    if (selectedOfficers.length === 0) {
      Alert.alert("Select Officers", "Please select at least one officer");
      return;
    }

    try {
      await API.post(
        "/police-departments/share-sos",
        {
          sosId: sosAlert.id,
          officerIds: selectedOfficers,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert("Success", "SOS alert shared with selected police officers");

      setSelectedOfficers([]);
      onClose();
    } catch (error) {
      console.log(error.response?.data || error.message);
      Alert.alert("Error", "Failed to share SOS alert");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor: "#111827",
            borderRadius: 16,
            padding: 20,
            maxHeight: "85%",
          }}
        >
          <Text style={styles.sectionTitle}>
            👮 Select Police Officers
          </Text>

          <Text style={styles.info}>
            SOS Alert #{sosAlert?.id}
          </Text>

          <ScrollView>
            {officers.length === 0 ? (
              <Text style={styles.info}>
                No police officers registered yet
              </Text>
            ) : (
              officers.map((officer) => (
                <TouchableOpacity
                  key={officer.id}
                  style={[
                    styles.incidentCard,
                    selectedOfficers.includes(officer.id) && {
                      borderColor: "#2563EB",
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => toggleOfficer(officer.id)}
                >
                  <Text style={styles.incidentTitle}>
                    👮 {officer.name}
                  </Text>

                  <Text style={styles.info}>
                    Email: {officer.email}
                  </Text>

                  <Text style={styles.info}>
                    License: {officer.licenseNumber || "N/A"}
                  </Text>

                  <Text style={styles.warningText}>
                    {selectedOfficers.includes(officer.id)
                      ? "✅ Selected"
                      : "Tap to select"}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#2563EB" }]}
            onPress={shareSOS}
          >
            <Text style={styles.buttonText}>
              📢 Share With Selected Officers
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.logoutButton, { marginTop: 10 }]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default ShareSOSWithPoliceOfficersModal;
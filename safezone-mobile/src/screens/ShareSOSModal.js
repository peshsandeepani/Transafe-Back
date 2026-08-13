import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  ActivityIndicator,
} from "react-native";

import API from "../services/api";
import styles from "../styles/styles";

function ShareSOSModal({ visible, sosAlert, token, onClose, onShared }) {
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);

  const fetchAmbulances = async () => {
    try {
      setLoading(true);
      const res = await API.get("/hospitals/ambulances", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setAmbulances(res.data);
    } catch (error) {
      console.log(error.response?.data || error.message);
      Alert.alert("Error", "Failed to load ambulances");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchAmbulances();
    }
  }, [visible]);

  const handleShare = async () => {
    if (!selectedDriver) {
      Alert.alert("Select Ambulance", "Please select an ambulance to share with");
      return;
    }

    try {
      setSharing(true);

      await API.post(
        "/sos/share",
        {
          sosId: sosAlert.id,
          driverId: selectedDriver.id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert(
        "✅ Shared",
        `SOS alert shared with ${selectedDriver.name}`
      );

      if (onShared) {
        onShared();
      }

      setSelectedDriver(null);
      onClose();
    } catch (error) {
      console.log(error.response?.data || error.message);
      Alert.alert("Error", "Failed to share SOS alert");
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
        <View
          style={{
            flex: 1,
            backgroundColor: "#1F2937",
            marginTop: 100,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: "hidden",
          }}
        >
          <ScrollView style={{ flex: 1, padding: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={styles.sectionTitle}>🚑 Select Ambulance</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={{ fontSize: 24, color: "#9CA3AF" }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.info} style={{ marginBottom: 15 }}>
              Sharing SOS Alert #{sosAlert.id}
            </Text>

            {loading ? (
              <ActivityIndicator size="large" color="#DC2626" />
            ) : ambulances.length === 0 ? (
              <Text style={styles.warningText}>
                No ambulances registered for your hospital
              </Text>
            ) : (
              ambulances.map((driver) => (
                <TouchableOpacity
                  key={driver.id}
                  onPress={() => setSelectedDriver(driver)}
                  style={[
                    styles.incidentCard,
                    {
                      borderColor:
                        selectedDriver?.id === driver.id ? "#DC2626" : "#4B5563",
                      borderWidth: 2,
                      marginBottom: 10,
                      backgroundColor:
                        selectedDriver?.id === driver.id ? "#DC262620" : "transparent",
                    },
                  ]}
                >
                  <Text style={{ fontSize: 18, fontWeight: "bold", color: "#fff", marginBottom: 8 }}>
                    🚑 {driver.assignedVehicleId || "N/A"}
                  </Text>

                  <Text style={styles.info}>
                    <Text style={{ fontWeight: "bold" }}>Driver:</Text> {driver.name}
                  </Text>

                  <Text style={styles.info}>
                    <Text style={{ fontWeight: "bold" }}>Email:</Text> {driver.email}
                  </Text>

                  {selectedDriver?.id === driver.id && (
                    <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#4B5563" }}>
                      <Text style={{ color: "#10B981", fontWeight: "bold" }}>✓ Selected</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}

            <View style={{ marginTop: 30, marginBottom: 30 }}>
              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: selectedDriver ? "#DC2626" : "#6B7280",
                    opacity: selectedDriver ? 1 : 0.5,
                  },
                ]}
                onPress={handleShare}
                disabled={!selectedDriver || sharing}
              >
                <Text style={styles.buttonText}>
                  {sharing ? "Sharing..." : "📤 Share SOS Alert"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: "#374151", marginTop: 10 }]}
                onPress={onClose}
                disabled={sharing}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default ShareSOSModal;

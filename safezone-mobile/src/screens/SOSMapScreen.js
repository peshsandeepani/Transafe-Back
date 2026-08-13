import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";

import MapView, { Marker } from "react-native-maps";

import API from "../services/api";
import styles from "../styles/styles";
import ShareSOSWithPoliceOfficersModal from "./ShareSOSWithPoliceOfficersModal";
import FullscreenMapButton from "../components/FullscreenMapButton";

function SOSMapScreen({ sosAlert, setScreen, token, user }) {
  const mapRef = useRef(null);

  const [ambulanceDrivers, setAmbulanceDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [policeShareVisible, setPoliceShareVisible] = useState(false);
  const [fullScreenMap, setFullScreenMap] = useState(false);

  useEffect(() => {
    if (mapRef.current && sosAlert) {
      mapRef.current.animateToRegion(
        {
          latitude: Number(sosAlert.latitude),
          longitude: Number(sosAlert.longitude),
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
    }
  }, [sosAlert]);

  const hospitalRespondToSOS = async () => {
    try {
    await API.post(
  "/hospitals/respond-sos",
  {
    sosId: sosAlert.id,
  },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert("✅ Response Recorded", "Hospital response has been recorded.");
    } catch (error) {
      console.log("Hospital respond error:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to respond to SOS alert");
    }
  };

  const policeRespondToSOS = async () => {
    try {
      await API.post(
        "/police-departments/respond-sos",
        {
          sosId: sosAlert.id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert(
        "✅ Response Sent",
        "SOS sender has been notified that police noted the SOS alert."
      );
    } catch (error) {
      console.log("Police respond error:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to respond to SOS alert");
    }
  };

  const fetchAmbulanceDrivers = async () => {
    try {
      const res = await API.get("/hospitals/ambulance-drivers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setAmbulanceDrivers(res.data || []);
      setSelectedDriverId(null);
      setShowShareModal(true);
    } catch (error) {
      console.log("Fetch ambulance drivers error:", error.response?.data || error.message);
      Alert.alert("Error", "Could not load ambulance drivers");
    }
  };

  const shareWithAmbulanceDriver = async () => {
    if (!selectedDriverId) {
      Alert.alert("Select Driver", "Please select an ambulance driver.");
      return;
    }

    try {
      await API.post(
        "/sos/share",
        {
          sosId: sosAlert.id,
          driverId: selectedDriverId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert("✅ Shared", "SOS alert shared with ambulance driver.");
      setShowShareModal(false);
      setSelectedDriverId(null);
    } catch (error) {
      console.log("Share SOS error:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to share SOS alert");
    }
  };

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: "#1F2937",
      }}
    >
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => {
            if (user?.role === "hospital_admin") {
              setScreen("sosDashboard");
            } else {
              setScreen("policeSosAlerts");
            }
          }}
        >
          <Text style={styles.menuText}>← Back to SOS Alerts</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>📍 SOS Alert #{sosAlert.id}</Text>

        <Text style={styles.info}>
          <Text style={{ fontWeight: "bold" }}>Sender:</Text>{" "}
          {sosAlert.senderName}
        </Text>

        <Text style={styles.info}>
          <Text style={{ fontWeight: "bold" }}>Role:</Text>{" "}
          {sosAlert.senderRole}
        </Text>

        <Text style={styles.info}>
          <Text style={{ fontWeight: "bold" }}>Vehicle:</Text>{" "}
          {sosAlert.vehicleId || "Not assigned"}
        </Text>

        <Text style={styles.warningText}>
          <Text style={{ fontWeight: "bold" }}>📍 Location:</Text>
        </Text>

        <Text style={styles.info}>Latitude: {sosAlert.latitude}</Text>
        <Text style={styles.info}>Longitude: {sosAlert.longitude}</Text>

        <Text style={styles.warningText}>
          <Text style={{ fontWeight: "bold" }}>🚨 Status:</Text>{" "}
          {sosAlert.status}
        </Text>

        {sosAlert.distance && (
          <Text style={styles.warningText}>
            <Text style={{ fontWeight: "bold" }}>Distance:</Text>{" "}
            {sosAlert.distance} km
          </Text>
        )}

        {user?.role === "hospital_admin" && (
          <>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#16a34a" }]}
              onPress={hospitalRespondToSOS}
            >
              <Text style={styles.buttonText}>🏥 Hospital Respond</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#2563eb" }]}
              onPress={fetchAmbulanceDrivers}
            >
              <Text style={styles.buttonText}>
                🚑 Share with Ambulance Driver
              </Text>
            </TouchableOpacity>
          </>
        )}

        {user?.role === "police_admin" && (
          <>
            <TouchableOpacity
              style={[
                styles.menuButton,
                {
                  marginTop: 15,
                  backgroundColor: "#DC2626",
                },
              ]}
              onPress={policeRespondToSOS}
            >
              <Text style={styles.menuText}>🚔 Respond to SOS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.menuButton,
                {
                  marginTop: 10,
                  backgroundColor: "#2563EB",
                },
              ]}
              onPress={() => setPoliceShareVisible(true)}
            >
              <Text style={styles.menuText}>📢 Share With Officers</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={[styles.mapBox, fullScreenMap && { flex: 1, height: "100%", marginHorizontal: 0 }]}>
        <MapView
          ref={mapRef}
          style={styles.map}
          region={{
            latitude: Number(sosAlert.latitude),
            longitude: Number(sosAlert.longitude),
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker
            coordinate={{
              latitude: Number(sosAlert.latitude),
              longitude: Number(sosAlert.longitude),
            }}
            title={`🚨 SOS Alert #${sosAlert.id}`}
            description={sosAlert.senderName}
            pinColor="#DC2626"
          >
            <View
              style={{
                backgroundColor: "#DC2626",
                borderRadius: 50,
                padding: 8,
                borderWidth: 3,
                borderColor: "#fff",
              }}
            >
              <Text
                style={{
                  fontSize: 24,
                  textAlign: "center",
                }}
              >
                🚨
              </Text>
            </View>
          </Marker>
        </MapView>
        <FullscreenMapButton fullScreen={fullScreenMap} onPress={() => setFullScreenMap((value) => !value)} />
      </View>

      {showShareModal && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
            zIndex: 999,
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              padding: 20,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: "80%",
            }}
          >
            <Text style={styles.title}>🚑 Select Ambulance Driver</Text>

            {ambulanceDrivers.length === 0 ? (
              <Text style={{ color: "#666", marginVertical: 15 }}>
                No ambulance drivers found.
              </Text>
            ) : (
              ambulanceDrivers.map((driver) => (
                <TouchableOpacity
                  key={driver.id}
                  style={{
                    padding: 12,
                    marginBottom: 8,
                    borderRadius: 8,
                    backgroundColor:
                      selectedDriverId === driver.id ? "#DBEAFE" : "#F3F4F6",
                    borderWidth: selectedDriverId === driver.id ? 2 : 0,
                    borderColor: "#2563eb",
                  }}
                  onPress={() => setSelectedDriverId(driver.id)}
                >
                  <Text style={{ fontWeight: "bold" }}>🚑 {driver.name}</Text>
                  <Text style={{ color: "#666" }}>{driver.email}</Text>
                </TouchableOpacity>
              ))
            )}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#2563eb" }]}
              onPress={shareWithAmbulanceDriver}
            >
              <Text style={styles.buttonText}>Share SOS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#999" }]}
              onPress={() => {
                setShowShareModal(false);
                setSelectedDriverId(null);
              }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ShareSOSWithPoliceOfficersModal
        visible={policeShareVisible}
        sosAlert={sosAlert}
        token={token}
        onClose={() => setPoliceShareVisible(false)}
      />
    </ScrollView>
  );
}

export default SOSMapScreen;
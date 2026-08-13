import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";

import MapView, { Marker } from "react-native-maps";
import API from "../services/api";
import styles from "../styles/styles";

function RoadIncidentMapScreen({ token, user, incident, setScreen }) {
  const [availableOfficers, setAvailableOfficers] = useState([]);
  const [selectedOfficers, setSelectedOfficers] = useState([]);
  const [showPoliceShareModal, setShowPoliceShareModal] = useState(false);

  const [ambulanceDrivers, setAmbulanceDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [showAmbulanceShareModal, setShowAmbulanceShareModal] = useState(false);

  if (!incident) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No incident selected</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setScreen("policeNearbyIncidents")}
        >
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lat = Number(incident.latitude || incident.lat || incident.incidentLatitude);
  const lng = Number(incident.longitude || incident.lng || incident.incidentLongitude);

  if (!lat || !lng) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>⚠️ Location not available</Text>
        <Text style={styles.subtitle}>
          This incident does not have valid latitude and longitude.
        </Text>
        

        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            setScreen(
              user?.role === "hospital_admin"
                ? "dashboard"
                : "policeNearbyIncidents"
            )
          }
        >
          <Text style={styles.buttonText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hospitalRespondToIncident = async () => {
    try {
      await API.post(
        `/road-incidents/${incident.id}/hospital-respond`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert(
        "✅ Response Recorded",
        "Hospital response has been recorded and reporter notified."
      );
    } catch (error) {
      console.log("Hospital respond error:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to respond to incident");
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
      setShowAmbulanceShareModal(true);
    } catch (error) {
      console.log("Driver fetch error:", error.response?.data || error.message);
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
        `/road-incidents/${incident.id}/hospital-share`,
        {
          driverId: selectedDriverId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert("✅ Shared", "Road incident shared with ambulance driver.");
      setShowAmbulanceShareModal(false);
      setSelectedDriverId(null);
    } catch (error) {
      console.log("Share error:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to share incident");
    }
  };

  const fetchPoliceOfficers = async () => {
    try {
      const res = await API.get("/police-departments/officers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setAvailableOfficers(res.data || []);
      setSelectedOfficers([]);
      setShowPoliceShareModal(true);
    } catch (error) {
      console.log("Officer fetch error:", error.response?.data || error.message);
      Alert.alert("Error", "Could not load police officers");
    }
  };

  const toggleOfficerSelection = (officerId) => {
    setSelectedOfficers((prev) =>
      prev.includes(officerId)
        ? prev.filter((id) => id !== officerId)
        : [...prev, officerId]
    );
  };

  const shareIncident = async () => {
    if (selectedOfficers.length === 0) {
      Alert.alert("Info", "Please select at least one police officer");
      return;
    }

    try {
      await API.post(
        "/police-departments/share-incident",
        {
          incidentId: incident.id,
          officerIds: selectedOfficers,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert(
        "✅ Shared",
        `Incident shared with ${selectedOfficers.length} officer(s)`
      );

      setShowPoliceShareModal(false);
      setSelectedOfficers([]);
      setAvailableOfficers([]);
    } catch (error) {
      console.log("Share incident error:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to share incident");
    }
  };
  const policeRespondToIncident = async () => {
  try {
    await API.post(
      "/police-departments/respond-incident",
      {
        incidentId: incident.id,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    Alert.alert(
      "✅ Police Response Recorded",
      "Police response has been recorded and reporter notified."
    );
  } catch (error) {
    console.log(
      "Police respond error:",
      error.response?.data || error.message
    );

    Alert.alert("Error", "Failed to respond to incident");
  }
};
  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚠️ Road Incident Map</Text>

      <MapView
        style={{ width: "100%", height: 400 }}
        initialRegion={{
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker
          coordinate={{
            latitude: lat,
            longitude: lng,
          }}
          title={incident.type || "Road Incident"}
          description={incident.description || "Incident location"}
        />
      </MapView>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {incident.type || "Road Incident"}
        </Text>

        <Text style={styles.info}>
          {incident.description || "No description"}
        </Text>

        <Text style={styles.info}>
          📍 {lat.toFixed(4)}, {lng.toFixed(4)}
        </Text>

        <Text style={styles.info}>
          Status: {incident.status || "Active"}
        </Text>
{/* Hospital Admin Buttons */}
{user?.role === "hospital_admin" &&
  incident.status !== "Police Responding" &&
  incident.status !== "Resolved" && (
    <>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#16a34a" }]}
        onPress={hospitalRespondToIncident}
      >
        <Text style={styles.buttonText}>
          🏥 Hospital Respond
        </Text>
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

{/* Police Admin Buttons */}
{user?.role === "police_admin" &&
  incident.status !== "Police Responding" &&
  incident.status !== "Resolved" && (
    <>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#DC2626" }]}
        onPress={policeRespondToIncident}
      >
        <Text style={styles.buttonText}>
          🚔 Police Respond
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#0066cc" }]}
        onPress={fetchPoliceOfficers}
      >
        <Text style={styles.buttonText}>
          📢 Share with Police Officers
        </Text>
      </TouchableOpacity>
    </>
)}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#999" }]}
          onPress={() =>
            setScreen(
              user?.role === "hospital_admin"
                ? "dashboard"
                : "policeNearbyIncidents"
            )
          }
        >
          <Text style={styles.buttonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      {showAmbulanceShareModal && (
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

            <ScrollView style={{ maxHeight: 300 }}>
              {ambulanceDrivers.map((driver) => (
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
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#2563eb" }]}
              onPress={shareWithAmbulanceDriver}
            >
              <Text style={styles.buttonText}>Share Incident</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#999" }]}
              onPress={() => {
                setShowAmbulanceShareModal(false);
                setSelectedDriverId(null);
              }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showPoliceShareModal && (
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
            <Text style={styles.title}>👮 Share with Police Officers</Text>

            <ScrollView style={{ maxHeight: 300 }}>
              {availableOfficers.map((officer) => (
                <TouchableOpacity
                  key={officer.id}
                  style={{
                    padding: 12,
                    marginBottom: 8,
                    borderRadius: 8,
                    backgroundColor: selectedOfficers.includes(officer.id)
                      ? "#E3F2FD"
                      : "#F5F5F5",
                    borderWidth: selectedOfficers.includes(officer.id) ? 2 : 0,
                    borderColor: "#0066cc",
                  }}
                  onPress={() => toggleOfficerSelection(officer.id)}
                >
                  <Text style={{ fontWeight: "bold" }}>
                    {selectedOfficers.includes(officer.id) ? "✅" : "⬜"} 👮{" "}
                    {officer.name}
                  </Text>

                  <Text style={{ color: "#666", fontSize: 12 }}>
                    {officer.email}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor:
                    selectedOfficers.length > 0 ? "#0066cc" : "#CCC",
                },
              ]}
              onPress={shareIncident}
              disabled={selectedOfficers.length === 0}
            >
              <Text style={styles.buttonText}>
                Share ({selectedOfficers.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#999" }]}
              onPress={() => setShowPoliceShareModal(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

export default RoadIncidentMapScreen;
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";

import API from "../services/api";
import styles from "../styles/styles";

function RegisterPoliceOfficerScreen({ token, user, setScreen }) {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [registering, setRegistering] = useState(false);

  const [formData, setFormData] = useState({
    officerName: "",
    officerEmail: "",
    officerPassword: "",
    badgeNumber: "",
    licenseNumber: "",
    rank: "Constable",
  });

  useEffect(() => {
    fetchPoliceOfficers();
    const interval = setInterval(fetchPoliceOfficers, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPoliceOfficers = async () => {
    try {
      setLoading(true);

      if (!user?.policeDepartmentId) {
        Alert.alert("Error", "Police department not assigned. Contact your administrator.");
        setLoading(false);
        return;
      }

      const res = await API.get(
        "/police-departments/officers",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setOfficers(res.data || []);
    } catch (error) {
      console.log("Fetch officers error:", error);
      
      // Handle 404 gracefully - might be first time loading
      if (error.response?.status === 404) {
        console.log("No officers found yet - this is normal for new police departments");
        setOfficers([]);
      } else {
        const errorMsg = error.response?.data?.error || "Could not fetch officers";
        Alert.alert("Error", errorMsg);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPoliceOfficers();
  };

  const handleRegisterOfficer = async () => {
    if (
      !formData.officerName ||
      !formData.officerEmail ||
      !formData.officerPassword
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      setRegistering(true);

      await API.post(
        "/police-departments/officers",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert("Success", "Police officer registered successfully");

      // Reset form
      setFormData({
        officerName: "",
        officerEmail: "",
        officerPassword: "",
        badgeNumber: "",
        licenseNumber: "",
        rank: "Constable",
      });

      setShowForm(false);
      fetchPoliceOfficers();
    } catch (error) {
      console.log("Register error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to register officer"
      );
    } finally {
      setRegistering(false);
    }
  };

  const handleDeleteOfficer = async (officerId) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this officer?",
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Delete",
          onPress: async () => {
            try {
              await API.delete(
                `/police-departments/officers/${officerId}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              Alert.alert("Success", "Officer deleted successfully");
              fetchPoliceOfficers();
            } catch (error) {
              console.log("Delete error:", error);
              Alert.alert("Error", "Failed to delete officer");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {!user?.policeDepartmentId ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", marginTop: 40 }}>
          <Text style={styles.title}>⚠️ Setup Required</Text>
          <Text style={styles.subtitle}>
            Police department not assigned to your account.
          </Text>
          <Text style={{ marginTop: 10, color: "#999", textAlign: "center", paddingHorizontal: 20 }}>
            Please contact your administrator to assign you to a police station.
          </Text>
          <TouchableOpacity
            style={[styles.button, { marginTop: 20 }]}
            onPress={() => setScreen("dashboard")}
          >
            <Text style={styles.buttonText}>← Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.title}>👮 Police Officers</Text>
          <Text style={styles.subtitle}>Manage your police department officers</Text>

          {loading && !refreshing && (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator size="large" color="#0066cc" />
              <Text style={{ marginTop: 10 }}>Loading officers...</Text>
            </View>
          )}

          {!loading && (
            <ScrollView
              style={{ flex: 1 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            >
          {/* Registration Form */}
          {showForm && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Register New Officer</Text>

              <TextInput
                style={styles.input}
                placeholder="Officer Name"
                placeholderTextColor="#999"
                value={formData.officerName}
                onChangeText={(text) =>
                  setFormData({ ...formData, officerName: text })
                }
              />

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#999"
                value={formData.officerEmail}
                onChangeText={(text) =>
                  setFormData({ ...formData, officerEmail: text })
                }
                keyboardType="email-address"
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#999"
                value={formData.officerPassword}
                onChangeText={(text) =>
                  setFormData({ ...formData, officerPassword: text })
                }
                secureTextEntry
              />

              <TextInput
                style={styles.input}
                placeholder="Badge Number (optional)"
                placeholderTextColor="#999"
                value={formData.badgeNumber}
                onChangeText={(text) =>
                  setFormData({ ...formData, badgeNumber: text })
                }
              />

              <TextInput
                style={styles.input}
                placeholder="License Number (optional)"
                placeholderTextColor="#999"
                value={formData.licenseNumber}
                onChangeText={(text) =>
                  setFormData({ ...formData, licenseNumber: text })
                }
              />

              <View style={{ marginBottom: 15 }}>
                <Text style={{ color: "#fff", marginBottom: 8 }}>Rank:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 10 }}
                >
                  {["Constable", "Sergeant", "Inspector", "Sub-Inspector"].map(
                    (rank) => (
                      <TouchableOpacity
                        key={rank}
                        style={[
                          styles.button,
                          {
                            backgroundColor:
                              formData.rank === rank ? "#0066cc" : "#666",
                            marginRight: 10,
                            flex: 0.3,
                          },
                        ]}
                        onPress={() =>
                          setFormData({ ...formData, rank })
                        }
                      >
                        <Text style={styles.buttonText}>{rank}</Text>
                      </TouchableOpacity>
                    )
                  )}
                </ScrollView>
              </View>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: "#6bcf7f" }]}
                onPress={handleRegisterOfficer}
                disabled={registering}
              >
                <Text style={styles.buttonText}>
                  {registering ? "Registering..." : "✓ Register Officer"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: "#999", marginTop: 10 }]}
                onPress={() => setShowForm(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Officers List */}
          {officers.length === 0 && !showForm ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", marginTop: 40 }}>
              <Text style={styles.subtitle}>No officers registered yet</Text>
              <Text style={{ marginTop: 10, color: "#666" }}>
                Register your first officer using the button below
              </Text>
            </View>
          ) : (
            officers.map((officer) => (
              <View key={officer.id} style={styles.card}>
                <View style={{ marginBottom: 15 }}>
                  <Text style={styles.cardTitle}>{officer.name}</Text>
                  <Text style={{ color: "#999", marginBottom: 8 }}>
                    {officer.email}
                  </Text>

                  {officer.licenseNumber && (
                    <Text style={{ color: "#666", marginBottom: 5 }}>
                      🎖️ License: {officer.licenseNumber}
                    </Text>
                  )}

                  <Text style={{ color: "#666", marginBottom: 10, fontSize: 12 }}>
                    Joined: {new Date(officer.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: "#ff6b6b" }]}
                  onPress={() => handleDeleteOfficer(officer.id)}
                >
                  <Text style={styles.buttonText}>🗑️ Delete Officer</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          <View style={{ height: 20 }} />
          </ScrollView>
          )}

          {!loading && (
            <View style={{ gap: 10, marginBottom: 10 }}>
              {!showForm && (
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: "#6bcf7f" }]}
                  onPress={() => setShowForm(true)}
                >
                  <Text style={styles.buttonText}>+ Register New Officer</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, { backgroundColor: "#0066cc" }]}
                onPress={onRefresh}
                disabled={refreshing}
              >
                <Text style={styles.buttonText}>
                  {refreshing ? "Refreshing..." : "🔄 Refresh List"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: "#666" }]}
                onPress={() => setScreen("policeAdminDashboard")}
              >
                <Text style={styles.buttonText}>← Back to Dashboard</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}

export default RegisterPoliceOfficerScreen;

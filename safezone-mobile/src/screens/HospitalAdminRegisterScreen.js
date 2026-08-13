import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
} from "react-native";

import API from "../services/api";
import styles from "../styles/styles";

function HospitalAdminRegisterScreen({ setScreen }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    hospitalId: "",
  });

  const [hospitals, setHospitals] = useState([]);
  const [filteredHospitals, setFilteredHospitals] = useState([]);
  const [hospitalSearch, setHospitalSearch] = useState("");
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingHospitals, setLoadingHospitals] = useState(false);

  // Fetch all hospitals on component mount
  const fetchHospitals = async () => {
    setLoadingHospitals(true);
    try {
      const res = await API.get("/hospitals");
      setHospitals(res.data || []);
      console.log("Hospitals loaded:", res.data?.length || 0);
    } catch (error) {
      console.log("Error fetching hospitals:", error);
      Alert.alert("Error", "Failed to load hospitals list");
    } finally {
      setLoadingHospitals(false);
    }
  };

  React.useEffect(() => {
    fetchHospitals();
  }, []);

  const handleHospitalSearch = (text) => {
    setHospitalSearch(text);

    if (text.trim().length === 0) {
      setFilteredHospitals([]);
      return;
    }

    const filtered = hospitals.filter((hospital) =>
      hospital.name.toLowerCase().includes(text.toLowerCase())
    );

    setFilteredHospitals(filtered);
  };

  const selectHospital = (hospital) => {
    setSelectedHospital(hospital);
    setForm({
      ...form,
      hospitalId: hospital.id,
    });
    setHospitalSearch(hospital.name);
    setFilteredHospitals([]);
  };

  const handleChange = (field, value) => {
    setForm({
      ...form,
      [field]: value,
    });
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      Alert.alert("Validation Error", "Please enter admin name");
      return false;
    }

    if (!form.email.trim()) {
      Alert.alert("Validation Error", "Please enter admin email");
      return false;
    }

    if (!form.email.includes("@")) {
      Alert.alert("Validation Error", "Please enter valid email");
      return false;
    }

    if (!form.password.trim()) {
      Alert.alert("Validation Error", "Please enter password");
      return false;
    }

    if (form.password.length < 6) {
      Alert.alert("Validation Error", "Password must be at least 6 characters");
      return false;
    }

    if (!form.phone.trim()) {
      Alert.alert("Validation Error", "Please enter phone number");
      return false;
    }

    if (!form.hospitalId) {
      Alert.alert("Validation Error", "Please select a hospital");
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await API.post("/auth/register", {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        role: "hospital_admin",
        hospitalId: Number(form.hospitalId),
      });

      Alert.alert(
        "Success",
        "Hospital admin registered successfully!",
        [
          {
            text: "OK",
            onPress: () => setScreen("login"),
          },
        ]
      );

      // Reset form
      setForm({
        name: "",
        email: "",
        password: "",
        phone: "",
        hospitalId: "",
      });
      setSelectedHospital(null);
      setHospitalSearch("");
    } catch (error) {
      console.log("Registration error:", error.response?.data || error.message);
      Alert.alert(
        "Registration Failed",
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Failed to register hospital admin"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#111827" }}
    >
      <ScrollView
        contentContainerStyle={{ paddingVertical: 30, paddingHorizontal: 25 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>SafeZone Guardians</Text>
        <Text style={[styles.info, { marginBottom: 20, textAlign: "center" }]}>
          Hospital Admin Registration
        </Text>

        {/* Admin Name */}
        <TextInput
          placeholder="Admin Full Name"
          placeholderTextColor="#9CA3AF"
          value={form.name}
          onChangeText={(value) => handleChange("name", value)}
          style={styles.input}
        />

        {/* Admin Email */}
        <TextInput
          placeholder="Admin Email"
          placeholderTextColor="#9CA3AF"
          value={form.email}
          onChangeText={(value) => handleChange("email", value)}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Admin Password */}
        <TextInput
          placeholder="Password (min 6 characters)"
          placeholderTextColor="#9CA3AF"
          value={form.password}
          onChangeText={(value) => handleChange("password", value)}
          style={styles.input}
          secureTextEntry
        />

        {/* Admin Phone */}
        <TextInput
          placeholder="Phone Number"
          placeholderTextColor="#9CA3AF"
          value={form.phone}
          onChangeText={(value) => handleChange("phone", value)}
          style={styles.input}
          keyboardType="phone-pad"
        />

        {/* Hospital Selection */}
        <View style={{ marginBottom: 15 }}>
          <Text style={{ color: "#E5E7EB", marginBottom: 8, fontWeight: "600" }}>
            Select Hospital
          </Text>

          {loadingHospitals ? (
            <View
              style={{
                padding: 12,
                backgroundColor: "#1F2937",
                borderRadius: 8,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator color="#3B82F6" />
              <Text style={{ color: "#9CA3AF", marginTop: 8 }}>
                Loading hospitals...
              </Text>
            </View>
          ) : (
            <>
              <TextInput
                placeholder="Search hospital by name"
                placeholderTextColor="#9CA3AF"
                value={hospitalSearch}
                onChangeText={handleHospitalSearch}
                style={styles.input}
              />

              {filteredHospitals.length > 0 && (
                <View
                  style={{
                    backgroundColor: "#1F2937",
                    borderRadius: 8,
                    marginTop: 8,
                    maxHeight: 200,
                    borderWidth: 1,
                    borderColor: "#374151",
                  }}
                >
                  <FlatList
                    data={filteredHospitals}
                    keyExtractor={(item) => item.id.toString()}
                    scrollEnabled={true}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => selectHospital(item)}
                        style={{
                          padding: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: "#374151",
                        }}
                      >
                        <Text
                          style={{
                            color: "#E5E7EB",
                            fontWeight: "600",
                            marginBottom: 4,
                          }}
                        >
                          {item.name}
                        </Text>
                        <Text style={{ color: "#9CA3AF", fontSize: 12 }}>
                          {item.address}
                        </Text>
                        <Text style={{ color: "#9CA3AF", fontSize: 12 }}>
                          📞 {item.phone}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}

              {hospitalSearch.trim().length > 0 &&
                filteredHospitals.length === 0 && (
                  <View
                    style={{
                      padding: 12,
                      backgroundColor: "#1F2937",
                      borderRadius: 8,
                      marginTop: 8,
                    }}
                  >
                    <Text style={{ color: "#9CA3AF", textAlign: "center" }}>
                      No hospitals found
                    </Text>
                  </View>
                )}
            </>
          )}
        </View>

        {/* Selected Hospital Info */}
        {selectedHospital && (
          <View
            style={{
              backgroundColor: "#1F2937",
              padding: 12,
              borderRadius: 8,
              marginBottom: 20,
              borderLeftWidth: 4,
              borderLeftColor: "#3B82F6",
            }}
          >
            <Text style={{ color: "#3B82F6", fontWeight: "bold", fontSize: 14 }}>
              ✓ Selected Hospital
            </Text>
            <Text
              style={{
                color: "#E5E7EB",
                fontWeight: "600",
                marginTop: 8,
              }}
            >
              {selectedHospital.name}
            </Text>
            <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 4 }}>
              📍 {selectedHospital.address}
            </Text>
            <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>
              📞 {selectedHospital.phone}
            </Text>
            <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>
              Type: {selectedHospital.type || "General"}
            </Text>
          </View>
        )}

        {/* Register Button */}
        <TouchableOpacity
          style={[styles.button, { opacity: loading ? 0.6 : 1 }]}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Registering..." : "Register as Hospital Admin"}
          </Text>
        </TouchableOpacity>

        {/* Back to Login */}
        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 16 }}>
          <Text style={styles.info}>Already have an account? </Text>
          <TouchableOpacity onPress={() => setScreen("login")}>
            <Text style={[styles.info, { color: "#3B82F6", fontWeight: "bold" }]}>
              Login
            </Text>
          </TouchableOpacity>
        </View>

        {/* Back to Hospital Register */}
        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 12 }}>
          <Text style={styles.info}>Want to register a new hospital? </Text>
          <TouchableOpacity onPress={() => setScreen("hospitalRegister")}>
            <Text style={[styles.info, { color: "#10B981", fontWeight: "bold" }]}>
              Hospital Register
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default HospitalAdminRegisterScreen;

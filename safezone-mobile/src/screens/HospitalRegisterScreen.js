import React, { useEffect, useState } from "react";
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
} from "react-native";
import { Picker } from "@react-native-picker/picker";

import API from "../services/api";
import styles from "../styles/styles";

function HospitalRegisterScreen({
  setScreen,
  adminMode = false,
  successScreen = "login",
  token = null,
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const [form, setForm] = useState({
    hospitalName: "",
    hospitalType: "Public",
    address: "",
    phone: "",
    email: "",
    latitude: "",
    longitude: "",
    adminEmail: "",
    adminPassword: "",
    registrationNumber: "",
    importantInfo: "",
  });

  const [hospitalQuery, setHospitalQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const searchHospitals = async (query) => {
    const trimmed = query.trim();

    if (trimmed.length < 4) {
      setSuggestions([]);
      return;
    }

    try {
      setSearching(true);

      const encodedQuery = encodeURIComponent(`${trimmed} hospital Sri Lanka`);

      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodedQuery}&limit=5&lat=7.8731&lon=80.7718`
      );

      if (!response.ok) {
        const text = await response.text();
        console.log("Hospital search failed:", response.status, text);
        setSuggestions([]);
        return;
      }

      const data = await response.json();

      const results = (data.features || []).map((item, index) => {
        const props = item.properties || {};
        const coordinates = item.geometry.coordinates || [];

        const displayName = [
          props.name,
          props.street,
          props.city,
          props.county,
          props.state,
          props.country,
        ]
          .filter(Boolean)
          .join(", ");

        return {
          place_id: `${props.osm_id || index}`,
          name: props.name || displayName.split(",")[0] || "Hospital",
          display_name: displayName || "Hospital",
          lat: coordinates[1],
          lon: coordinates[0],
        };
      });

      setSuggestions(results);
    } catch (error) {
      console.log("Hospital search failed", error);
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      searchHospitals(hospitalQuery);
    }, 1500);

    return () => clearTimeout(delay);
  }, [hospitalQuery]);

  const handleQueryChange = (text) => {
    setHospitalQuery(text);
  };

  const selectHospital = (hospital) => {
    setHospitalQuery(hospital.display_name);

    setForm((prev) => ({
      ...prev,
      hospitalName: hospital.name || hospital.display_name.split(",")[0],
      address: hospital.display_name,
      latitude: String(hospital.lat || ""),
      longitude: String(hospital.lon || ""),
    }));

    setSuggestions([]);
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!form.hospitalName.trim()) {
          Alert.alert("Validation Error", "Please select hospital name");
          return false;
        }
        if (!form.latitude || !form.longitude) {
          Alert.alert("Validation Error", "Please select a valid hospital location");
          return false;
        }
        return true;

      case 2:
        if (!form.phone.trim()) {
          Alert.alert("Validation Error", "Please enter phone number");
          return false;
        }
        if (!form.email.trim()) {
          Alert.alert("Validation Error", "Please enter hospital email");
          return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(form.email)) {
          Alert.alert("Validation Error", "Please enter a valid email");
          return false;
        }
        return true;

      case 3:
        if (!form.registrationNumber.trim()) {
          Alert.alert("Validation Error", "Please enter registration number");
          return false;
        }
        return true;

      case 4:
        if (!form.adminEmail.trim()) {
          Alert.alert("Validation Error", "Please enter admin email");
          return false;
        }
        if (!form.adminPassword.trim()) {
          Alert.alert("Validation Error", "Please enter admin password");
          return false;
        }
        const emailRegex2 = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex2.test(form.adminEmail)) {
          Alert.alert("Validation Error", "Please enter a valid admin email");
          return false;
        }
        if (form.adminPassword.length < 6) {
          Alert.alert("Validation Error", "Password must be at least 6 characters");
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };;

  const handleRegister = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);

    try {
      const requestConfig = token
        ? {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        : undefined;

      await API.post("/hospitals", form, requestConfig);

      Alert.alert("Success", "Hospital registered successfully!", [
        { text: "OK" },
      ]);

      setForm({
        hospitalName: "",
        hospitalType: "Public",
        address: "",
        phone: "",
        email: "",
        latitude: "",
        longitude: "",
        adminEmail: "",
        adminPassword: "",
        registrationNumber: "",
        importantInfo: "",
      });

      setHospitalQuery("");
      setSuggestions([]);
      setCurrentStep(1);
      setScreen(successScreen);
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to register hospital"
      );
    } finally {
      setLoading(false);
    }
  };

  const progressPercentage = (currentStep / totalSteps) * 100;

  const stepConfig = [
    { number: 1, title: "Basic Info", icon: "🏥" },
    { number: 2, title: "Contact", icon: "📞" },
    { number: 3, title: "Details", icon: "📋" },
    { number: 4, title: "Admin", icon: "🔐" },
  ];

  const renderStepIndicator = () => (
    <View style={{ marginBottom: 24 }}>
      {/* Progress Bar */}
      <View style={{ marginBottom: 16 }}>
        <View
          style={{
            height: 6,
            backgroundColor: "#1F2937",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: "100%",
              width: `${progressPercentage}%`,
              backgroundColor: "#0F766E",
              borderRadius: 3,
            }}
          />
        </View>
        <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 8, textAlign: "center" }}>
          Step {currentStep} of {totalSteps}
        </Text>
      </View>

      {/* Step Circles */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {stepConfig.map((step) => (
          <View key={step.number} style={{ alignItems: "center", flex: 1 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor:
                  currentStep >= step.number ? "#0F766E" : "#1F2937",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 8,
                borderWidth: 2,
                borderColor:
                  currentStep === step.number ? "#06B6D4" : "#0F766E",
              }}
            >
              <Text style={{ fontSize: 20 }}>{step.icon}</Text>
            </View>
            <Text
              style={{
                fontSize: 11,
                color:
                  currentStep === step.number ? "#06B6D4" : "#9CA3AF",
                fontWeight: currentStep === step.number ? "600" : "400",
              }}
            >
              {step.title}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#111827" }}
    >
      <ScrollView
        contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>SafeZone Guardians</Text>
        <Text style={[styles.info, { marginBottom: 20, textAlign: "center" }]}>
          Hospital Registration
        </Text>

        {renderStepIndicator()}

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: "#E5E7EB",
                marginBottom: 16,
              }}
            >
              🏥 Hospital Basic Information
            </Text>

            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: "#9CA3AF", marginBottom: 8, fontSize: 12 }}>
                Hospital Name
              </Text>
              <TextInput
                placeholder="Search hospital name in Sri Lanka"
                placeholderTextColor="#9CA3AF"
                value={hospitalQuery}
                onChangeText={handleQueryChange}
                style={styles.input}
              />

              {searching && (
                <Text style={[styles.info, { marginTop: 8 }]}>
                  Searching hospitals...
                </Text>
              )}

              {suggestions.length > 0 && (
                <View
                  style={{
                    backgroundColor: "#1F2937",
                    borderRadius: 8,
                    marginTop: 8,
                    maxHeight: 180,
                  }}
                >
                  <FlatList
                    data={suggestions}
                    keyExtractor={(item) => String(item.place_id)}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => selectHospital(item)}
                        style={{
                          padding: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: "#374151",
                        }}
                      >
                        <Text style={{ color: "#E5E7EB", fontSize: 13 }}>
                          🏥 {item.display_name}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}
            </View>

            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: "#9CA3AF", marginBottom: 8, fontSize: 12 }}>
                Hospital Type
              </Text>
              <View
                style={{
                  backgroundColor: "#1F2937",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <Picker
                  selectedValue={form.hospitalType}
                  onValueChange={(value) => handleChange("hospitalType", value)}
                  style={{ color: "#E5E7EB" }}
                >
                  <Picker.Item label="Public Hospital" value="Public" />
                  <Picker.Item label="Private Hospital" value="Private" />
                </Picker>
              </View>
            </View>

            {form.hospitalName && (
              <View
                style={{
                  backgroundColor: "#1F2937",
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 20,
                  borderLeftWidth: 4,
                  borderLeftColor: "#0F766E",
                }}
              >
                <Text style={{ color: "#E5E7EB", fontWeight: "bold" }}>
                  ✓ {form.hospitalName}
                </Text>
                <Text style={{ color: "#9CA3AF", fontSize: 11, marginTop: 4 }}>
                  {form.address}
                </Text>
                <Text style={{ color: "#9CA3AF", fontSize: 11, marginTop: 2 }}>
                  Lat: {form.latitude}, Lon: {form.longitude}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Step 2: Contact Information */}
        {currentStep === 2 && (
          <View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: "#E5E7EB",
                marginBottom: 16,
              }}
            >
              📞 Contact Information
            </Text>

            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: "#9CA3AF", marginBottom: 8, fontSize: 12 }}>
                Phone Number
              </Text>
              <TextInput
                placeholder="Enter phone number"
                placeholderTextColor="#9CA3AF"
                value={form.phone}
                onChangeText={(value) => handleChange("phone", value)}
                style={styles.input}
                keyboardType="phone-pad"
              />
            </View>

            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: "#9CA3AF", marginBottom: 8, fontSize: 12 }}>
                Hospital Email
              </Text>
              <TextInput
                placeholder="Enter hospital email"
                placeholderTextColor="#9CA3AF"
                value={form.email}
                onChangeText={(value) => handleChange("email", value)}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
        )}

        {/* Step 3: Hospital Details */}
        {currentStep === 3 && (
          <View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: "#E5E7EB",
                marginBottom: 16,
              }}
            >
              📋 Hospital Details
            </Text>

            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: "#9CA3AF", marginBottom: 8, fontSize: 12 }}>
                Registration Number
              </Text>
              <TextInput
                placeholder="Enter registration number"
                placeholderTextColor="#9CA3AF"
                value={form.registrationNumber}
                onChangeText={(value) => handleChange("registrationNumber", value)}
                style={styles.input}
              />
            </View>

            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: "#9CA3AF", marginBottom: 8, fontSize: 12 }}>
                Important Information
              </Text>
              <TextInput
                placeholder="Enter any important information"
                placeholderTextColor="#9CA3AF"
                value={form.importantInfo}
                onChangeText={(value) => handleChange("importantInfo", value)}
                style={[styles.input, { height: 100, textAlignVertical: "top" }]}
                multiline
              />
            </View>
          </View>
        )}

        {/* Step 4: Admin Credentials */}
        {currentStep === 4 && (
          <View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: "#E5E7EB",
                marginBottom: 16,
              }}
            >
              🔐 Admin Credentials
            </Text>

            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: "#9CA3AF", marginBottom: 8, fontSize: 12 }}>
                Admin Email
              </Text>
              <TextInput
                placeholder="Enter admin email"
                placeholderTextColor="#9CA3AF"
                value={form.adminEmail}
                onChangeText={(value) => handleChange("adminEmail", value)}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: "#9CA3AF", marginBottom: 8, fontSize: 12 }}>
                Admin Password
              </Text>
              <TextInput
                placeholder="Enter password (min 6 characters)"
                placeholderTextColor="#9CA3AF"
                value={form.adminPassword}
                onChangeText={(value) => handleChange("adminPassword", value)}
                style={styles.input}
                secureTextEntry
              />
            </View>

            <View
              style={{
                backgroundColor: "#1F2937",
                padding: 12,
                borderRadius: 8,
                borderLeftWidth: 4,
                borderLeftColor: "#06B6D4",
              }}
            >
              <Text style={{ color: "#06B6D4", fontWeight: "600", marginBottom: 6 }}>
                📝 Summary
              </Text>
              <Text style={{ color: "#9CA3AF", fontSize: 12, lineHeight: 18 }}>
                Hospital: {form.hospitalName}{"\n"}
                Email: {form.email}{"\n"}
                Phone: {form.phone}
              </Text>
            </View>
          </View>
        )}

        {/* Navigation Buttons */}
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            marginTop: 32,
            marginBottom: 20,
          }}
        >
          {currentStep > 1 && (
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 8,
                backgroundColor: "#1F2937",
                alignItems: "center",
                borderWidth: 2,
                borderColor: "#374151",
              }}
              onPress={handlePrevious}
            >
              <Text style={{ color: "#E5E7EB", fontWeight: "600" }}>
                ← Previous
              </Text>
            </TouchableOpacity>
          )}

          {currentStep < totalSteps ? (
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 8,
                backgroundColor: "#0F766E",
                alignItems: "center",
              }}
              onPress={handleNext}
            >
              <Text style={{ color: "#FFF", fontWeight: "600" }}>
                Next →
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 8,
                backgroundColor: "#10B981",
                alignItems: "center",
                opacity: loading ? 0.6 : 1,
              }}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={{ color: "#FFF", fontWeight: "600" }}>
                {loading ? "Registering..." : "✓ Register Hospital"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default HospitalRegisterScreen;
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
} from "react-native";

import { Picker } from "@react-native-picker/picker";

import API from "../services/api";
import styles from "../styles/styles";

function PoliceRegisterScreen({ setScreen, token }) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const [form, setForm] = useState({
    departmentName: "",
    departmentType: "Traffic",
    address: "",
    phone: "",
    email: "",
    registrationNumber: "",
    commanderName: "",
    commanderEmail: "",
    commanderPassword: "",
    jurisdiction: "",
    latitude: "",
    longitude: "",
  });

  const [loading, setLoading] = useState(false);
  const [stationSuggestions, setStationSuggestions] = useState([]);
  const [searchingStation, setSearchingStation] = useState(false);

  const handleChange = (field, value) => {
    setForm({
      ...form,
      [field]: value,
    });
  };
const searchPoliceStations = async (text) => {
  handleChange("departmentName", text);

  if (text.trim().length < 3) {
    setStationSuggestions([]);
    return;
  }

  try {
    setSearchingStation(true);

    const query = encodeURIComponent(`${text} police station Sri Lanka`);

    const response = await fetch(
      `https://photon.komoot.io/api/?q=${query}&limit=8&lat=7.8731&lon=80.7718`
    );

    const data = await response.json();

    const results = (data.features || []).map((item, index) => {
      const props = item.properties || {};
      const coordinates = item.geometry.coordinates;

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
        display_name: displayName || "Police Station",
        lat: coordinates[1],
        lon: coordinates[0],
      };
    });

    setStationSuggestions(results);
  } catch (error) {
    console.log("Police station search error:", error);
    setStationSuggestions([]);
  } finally {
    setSearchingStation(false);
  }
};
  const validateForm = () => {
    if (!form.departmentName.trim()) {
      Alert.alert("Validation Error", "Please enter police department name");
      return false;
    }

    if (!form.address.trim()) {
      Alert.alert("Validation Error", "Please enter department address");
      return false;
    }

    if (!form.phone.trim()) {
      Alert.alert("Validation Error", "Please enter phone number");
      return false;
    }

    if (!form.email.trim()) {
      Alert.alert("Validation Error", "Please enter department email");
      return false;
    }

    if (!form.registrationNumber.trim()) {
      Alert.alert("Validation Error", "Please enter registration number");
      return false;
    }

    if (!form.commanderName.trim()) {
      Alert.alert("Validation Error", "Please enter commander/admin name");
      return false;
    }

    if (!form.commanderEmail.trim()) {
      Alert.alert("Validation Error", "Please enter commander email");
      return false;
    }

    if (!form.commanderPassword.trim()) {
      Alert.alert("Validation Error", "Please enter commander password");
      return false;
    }

    if (form.commanderPassword.length < 6) {
      Alert.alert("Validation Error", "Password must be at least 6 characters");
      return false;
    }

    if (!form.jurisdiction.trim()) {
      Alert.alert("Validation Error", "Please enter jurisdiction/area");
      return false;
    }

    return true;
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!form.departmentName.trim()) {
          Alert.alert("Validation Error", "Please enter police department name");
          return false;
        }
        if (!form.latitude || !form.longitude) {
          Alert.alert("Validation Error", "Please select a valid police station");
          return false;
        }
        return true;

      case 2:
        if (!form.address.trim()) {
          Alert.alert("Validation Error", "Please enter department address");
          return false;
        }
        if (!form.phone.trim()) {
          Alert.alert("Validation Error", "Please enter phone number");
          return false;
        }
        if (!form.email.trim()) {
          Alert.alert("Validation Error", "Please enter department email");
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
        if (!form.jurisdiction.trim()) {
          Alert.alert("Validation Error", "Please enter jurisdiction/area");
          return false;
        }
        return true;

      case 4:
        if (!form.commanderName.trim()) {
          Alert.alert("Validation Error", "Please enter commander/admin name");
          return false;
        }
        if (!form.commanderEmail.trim()) {
          Alert.alert("Validation Error", "Please enter commander email");
          return false;
        }
        if (!form.commanderPassword.trim()) {
          Alert.alert("Validation Error", "Please enter commander password");
          return false;
        }
        const emailRegex2 = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex2.test(form.commanderEmail)) {
          Alert.alert("Validation Error", "Please enter a valid commander email");
          return false;
        }
        if (form.commanderPassword.length < 6) {
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
  };

  const handleRegister = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);

    try {
      const policeDepartmentData = {
        stationName: form.departmentName,
        stationCode: form.registrationNumber,
        division: form.departmentType,
        address: form.address,
        phone: form.phone,
        emergencyNumber: form.phone,
        officerInCharge: form.commanderName,
        email: form.email,
        latitude: form.latitude,
        longitude: form.longitude,
        district: form.jurisdiction,
        province: form.jurisdiction,
        adminName: form.commanderName,
        adminEmail: form.commanderEmail,
        adminPassword: form.commanderPassword,
      };

      const response = await API.post(
        "/police-departments",
        policeDepartmentData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert(
        "Success",
        "Police department registered successfully!",
        [{ text: "OK" }]
      );

      setForm({
        departmentName: "",
        departmentType: "Traffic",
        address: "",
        phone: "",
        email: "",
        registrationNumber: "",
        commanderName: "",
        commanderEmail: "",
        commanderPassword: "",
        jurisdiction: "",
        latitude: "",
        longitude: "",
      });

      setCurrentStep(1);
      setScreen("login");
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to register police department"
      );
    } finally {
      setLoading(false);
    }
  };

  const progressPercentage = (currentStep / totalSteps) * 100;

  const stepConfig = [
    { number: 1, title: "Station", icon: "👮" },
    { number: 2, title: "Contact", icon: "📞" },
    { number: 3, title: "Details", icon: "📋" },
    { number: 4, title: "Commander", icon: "🔐" },
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
              backgroundColor: "#1E40AF",
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
                  currentStep >= step.number ? "#1E40AF" : "#1F2937",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 8,
                borderWidth: 2,
                borderColor:
                  currentStep === step.number ? "#3B82F6" : "#1E40AF",
              }}
            >
              <Text style={{ fontSize: 20 }}>{step.icon}</Text>
            </View>
            <Text
              style={{
                fontSize: 11,
                color:
                  currentStep === step.number ? "#3B82F6" : "#9CA3AF",
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
          Police Department Registration
        </Text>

        {renderStepIndicator()}

        {/* Step 1: Basic Department Info */}
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
              👮 Police Station Information
            </Text>

            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: "#9CA3AF", marginBottom: 8, fontSize: 12 }}>
                Department Name
              </Text>
              <TextInput
                placeholder="Search Police Station Name"
                placeholderTextColor="#9CA3AF"
                value={form.departmentName}
                onChangeText={searchPoliceStations}
                style={styles.input}
              />

              {searchingStation && (
                <Text style={[styles.info, { marginTop: 8 }]}>
                  Searching police stations...
                </Text>
              )}

              {stationSuggestions.length > 0 && (
                <View
                  style={{
                    backgroundColor: "#1F2937",
                    borderRadius: 8,
                    marginTop: 8,
                    maxHeight: 180,
                  }}
                >
                  <FlatList
                    data={stationSuggestions}
                    keyExtractor={(item) => String(item.place_id)}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => {
                          const stationName = item.display_name.split(",")[0];
                          setForm((prev) => ({
                            ...prev,
                            departmentName: stationName,
                            address: item.display_name,
                            latitude: item.lat,
                            longitude: item.lon,
                          }));
                          setStationSuggestions([]);
                        }}
                        style={{
                          padding: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: "#374151",
                        }}
                      >
                        <Text style={{ color: "#E5E7EB", fontSize: 13 }}>
                          👮 {item.display_name}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}
            </View>

            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: "#9CA3AF", marginBottom: 8, fontSize: 12 }}>
                Department Type
              </Text>
              <View
                style={{
                  backgroundColor: "#1F2937",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <Picker
                  selectedValue={form.departmentType}
                  onValueChange={(value) => handleChange("departmentType", value)}
                  style={{ color: "#E5E7EB" }}
                >
                  <Picker.Item label="Traffic Police" value="Traffic" />
                  <Picker.Item label="City Police" value="City" />
                  <Picker.Item label="Highway Patrol" value="Highway" />
                  <Picker.Item label="Special Operations" value="Special" />
                  <Picker.Item label="Other" value="Other" />
                </Picker>
              </View>
            </View>

            {form.departmentName && (
              <View
                style={{
                  backgroundColor: "#1F2937",
                  padding: 12,
                  borderRadius: 8,
                  borderLeftWidth: 4,
                  borderLeftColor: "#1E40AF",
                }}
              >
                <Text style={{ color: "#E5E7EB", fontWeight: "bold" }}>
                  ✓ {form.departmentName}
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
                Department Address
              </Text>
              <TextInput
                placeholder="Enter department address"
                placeholderTextColor="#9CA3AF"
                value={form.address}
                onChangeText={(value) => handleChange("address", value)}
                style={styles.input}
              />
            </View>

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
                Department Email
              </Text>
              <TextInput
                placeholder="Enter department email"
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

        {/* Step 3: Registration Details */}
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
              📋 Registration Details
            </Text>

            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: "#9CA3AF", marginBottom: 8, fontSize: 12 }}>
                Registration Number
              </Text>
              <TextInput
                placeholder="Enter police department registration number"
                placeholderTextColor="#9CA3AF"
                value={form.registrationNumber}
                onChangeText={(value) => handleChange("registrationNumber", value)}
                style={styles.input}
              />
            </View>

            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: "#9CA3AF", marginBottom: 8, fontSize: 12 }}>
                Jurisdiction / Area of Coverage
              </Text>
              <TextInput
                placeholder="Enter jurisdiction or area"
                placeholderTextColor="#9CA3AF"
                value={form.jurisdiction}
                onChangeText={(value) => handleChange("jurisdiction", value)}
                style={[styles.input, { height: 100, textAlignVertical: "top" }]}
                multiline
              />
            </View>
          </View>
        )}

        {/* Step 4: Commander Credentials */}
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
              🔐 Commander Credentials
            </Text>

            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: "#9CA3AF", marginBottom: 8, fontSize: 12 }}>
                Commander/Admin Name
              </Text>
              <TextInput
                placeholder="Enter commander full name"
                placeholderTextColor="#9CA3AF"
                value={form.commanderName}
                onChangeText={(value) => handleChange("commanderName", value)}
                style={styles.input}
              />
            </View>

            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: "#9CA3AF", marginBottom: 8, fontSize: 12 }}>
                Commander Email
              </Text>
              <TextInput
                placeholder="Enter commander email"
                placeholderTextColor="#9CA3AF"
                value={form.commanderEmail}
                onChangeText={(value) => handleChange("commanderEmail", value)}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: "#9CA3AF", marginBottom: 8, fontSize: 12 }}>
                Commander Password
              </Text>
              <TextInput
                placeholder="Enter password (min 6 characters)"
                placeholderTextColor="#9CA3AF"
                value={form.commanderPassword}
                onChangeText={(value) => handleChange("commanderPassword", value)}
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
                borderLeftColor: "#3B82F6",
              }}
            >
              <Text style={{ color: "#3B82F6", fontWeight: "600", marginBottom: 6 }}>
                📝 Summary
              </Text>
              <Text style={{ color: "#9CA3AF", fontSize: 12, lineHeight: 18 }}>
                Department: {form.departmentName}{"\n"}
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
                backgroundColor: "#1E40AF",
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
                {loading ? "Registering..." : "✓ Register Department"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default PoliceRegisterScreen;

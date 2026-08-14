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
  ActionSheetIOS,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

import API from "../services/api";
import styles from "../styles/styles";

function RegisterScreen({ setUser, setToken, setScreen }) {
  const rideVehicleOptions = [
    { label: "Tuk-tuk", value: "tuk_tuk" },
    { label: "Bike", value: "bike" },
    { label: "Car", value: "car" },
  ];

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    phone: "",
    licenseNumber: "",
    vehicleNumber: "",
    vehicleType: "car",
    gpsDeviceId: "",
    vehicleMake: "",
    vehicleModel: "",
    becomeRideDriver: false,
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setForm({
      ...form,
      [field]: value,
    });
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      Alert.alert("Validation Error", "Please enter your name");
      return false;
    }

    if (!form.email.trim()) {
      Alert.alert("Validation Error", "Please enter your email");
      return false;
    }

    if (!form.password.trim()) {
      Alert.alert("Validation Error", "Please enter a password");
      return false;
    }

    if (form.role === "driver") {
      if (!form.phone.trim()) {
        Alert.alert("Validation Error", "Please enter phone number");
        return false;
      }

      if (!form.licenseNumber.trim()) {
        Alert.alert("Validation Error", "Please enter license number");
        return false;
      }

      if (!form.vehicleNumber.trim()) {
        Alert.alert("Validation Error", "Please enter vehicle number");
        return false;
      }

      if (!form.gpsDeviceId.trim()) {
        Alert.alert("Validation Error", "Please enter GPS device ID");
        return false;
      }
    }

    if (form.becomeRideDriver) {
      if (!form.phone.trim()) {
        Alert.alert("Validation Error", "Please enter phone number for driver registration");
        return false;
      }

      if (!form.licenseNumber.trim()) {
        Alert.alert("Validation Error", "Please enter license number for ride-driver registration");
        return false;
      }

      if (!form.vehicleNumber.trim()) {
        Alert.alert("Validation Error", "Please enter vehicle number for ride-driver registration");
        return false;
      }

      if (!form.vehicleType.trim()) {
        Alert.alert("Validation Error", "Please choose a vehicle type");
        return false;
      }
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...form,
        becomeRideDriver: Boolean(form.becomeRideDriver),
        rideDriver: form.becomeRideDriver
          ? {
              vehicleType: form.vehicleType,
              vehicleMake: form.vehicleMake,
              vehicleModel: form.vehicleModel,
              vehicleNumber: form.vehicleNumber,
              licenseNumber: form.licenseNumber,
              isOnline: true,
            }
          : null,
      };

      const response = await API.post("/auth/register", payload);

      Alert.alert(
        "Success",
        "Registration successful! Logging you in...",
        [{ text: "OK" }]
      );

      // Auto-login after registration
      setUser(response.data.user);
      setToken(response.data.token);
      setScreen("dashboard");
    } catch (error) {
      Alert.alert(
        "Registration Failed",
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 100}
      style={styles.loginContainer}
    >
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingVertical: 30, paddingHorizontal: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Register for SafeZone Guardians</Text>

          <View style={styles.card}>
        {/* Full Name */}
          <TextInput
            placeholder="Full Name"
            placeholderTextColor="#9CA3AF"
            value={form.name}
            onChangeText={(value) => handleChange("name", value)}
            style={styles.input}
          />

        {/* Email */}
          <TextInput
            placeholder="Email"
            placeholderTextColor="#9CA3AF"
            value={form.email}
            onChangeText={(value) => handleChange("email", value)}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
          />

        {/* Password */}
          <TextInput
            placeholder="Password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={form.password}
            onChangeText={(value) => handleChange("password", value)}
            style={styles.input}
          />

        {/* Role Selector */}
          <Text style={[styles.info, { marginTop: 8, marginBottom: 12 }]}>Select role</Text>

          <View style={{ flexDirection: "row", marginBottom: 12 }}>
            <TouchableOpacity
              style={form.role === "user" ? styles.menuButtonActive : styles.menuButton}
              onPress={() => handleChange("role", "user")}
            >
              <Text style={styles.menuText}>👤 User</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={form.role === "driver" ? styles.menuButtonActive : styles.menuButton}
              onPress={() => handleChange("role", "driver")}
            >
              <Text style={styles.menuText}>🚗 Driver</Text>
            </TouchableOpacity>
          </View>

        {/* Ride-driver registration option (screen 1) */}
        <View style={{ marginTop: 14, marginBottom: 12, padding: 12, borderRadius: 10, backgroundColor: "#1F2937", borderWidth: 1, borderColor: "#334155" }}>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center" }}
            onPress={() => handleChange("becomeRideDriver", !form.becomeRideDriver)}
          >
            <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: form.becomeRideDriver ? "#22C55E" : "#94A3B8", backgroundColor: form.becomeRideDriver ? "#22C55E" : "transparent", justifyContent: "center", alignItems: "center" }}>
              {form.becomeRideDriver && <Text style={{ color: "#111827", fontWeight: "bold" }}>✓</Text>}
            </View>
            <Text style={[styles.info, { marginLeft: 10, color: "#E2E8F0" }]}>I want to also register as a ride driver</Text>
          </TouchableOpacity>
          </View>

        {/* Driver Information */}
        {form.role === "driver" && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 12, marginBottom: 12 }]}>
              🚗 Driver Information
            </Text>

            <TextInput
              placeholder="Phone Number"
              placeholderTextColor="#9CA3AF"
              value={form.phone}
              onChangeText={(value) => handleChange("phone", value)}
              style={styles.input}
              keyboardType="phone-pad"
            />

            <TextInput
              placeholder="Driving License Number"
              placeholderTextColor="#9CA3AF"
              value={form.licenseNumber}
              onChangeText={(value) => handleChange("licenseNumber", value)}
              style={styles.input}
            />

            <Text style={[styles.sectionTitle, { marginTop: 12, marginBottom: 12 }]}>
              🚙 Vehicle Information
            </Text>

            <TextInput
              placeholder="Vehicle Number (e.g. CAR-001)"
              placeholderTextColor="#9CA3AF"
              value={form.vehicleNumber}
              onChangeText={(value) => handleChange("vehicleNumber", value)}
              style={styles.input}
            />

            <Text style={[styles.info, { marginTop: 12, marginBottom: 8 }]}>Vehicle Type:</Text>
            {Platform.OS === "ios" ? (
              <TouchableOpacity
                style={{ backgroundColor: "#1F2937", borderRadius: 8, marginBottom: 16, padding: 12 }}
                onPress={() => {
                  const options = ["Car", "Bike", "Tuk-tuk", "Cancel"];
                  const valueMap = {
                    Car: "car",
                    Bike: "bike",
                    "Tuk-tuk": "tuk_tuk",
                  };
                  ActionSheetIOS.showActionSheetWithOptions(
                    { options, cancelButtonIndex: options.length - 1 },
                    (buttonIndex) => {
                      if (buttonIndex !== options.length - 1) {
                        handleChange("vehicleType", valueMap[options[buttonIndex]]);
                      }
                    }
                  );
                }}
              >
                <Text style={{ color: "white" }}>{rideVehicleOptions.find((option) => option.value === form.vehicleType)?.label || "Car"}</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ backgroundColor: "#1F2937", borderRadius: 8, marginBottom: 16 }}>
                <Picker
                  selectedValue={form.vehicleType}
                  onValueChange={(value) => handleChange("vehicleType", value)}
                  style={{ color: "white", height: 50 }}
                  itemStyle={{ color: "white" }}
                >
                  {rideVehicleOptions.map((option) => (
                    <Picker.Item key={option.value} label={option.label} value={option.value} />
                  ))}
                </Picker>
              </View>
            )}

            <TextInput
              placeholder="GPS Device ID (e.g. GPS-CAR-001)"
              placeholderTextColor="#9CA3AF"
              value={form.gpsDeviceId}
              onChangeText={(value) => handleChange("gpsDeviceId", value)}
              style={styles.input}
            />
          </>
        )}

        {form.becomeRideDriver && (
          <View style={{ marginTop: 8 }}>
            <Text style={[styles.sectionTitle, { marginTop: 12, marginBottom: 12 }]}>
              🚖 Ride Driver Profile
            </Text>

            <TextInput
              placeholder="Phone Number"
              placeholderTextColor="#9CA3AF"
              value={form.phone}
              onChangeText={(value) => handleChange("phone", value)}
              style={styles.input}
              keyboardType="phone-pad"
            />

            <TextInput
              placeholder="Driving License Number"
              placeholderTextColor="#9CA3AF"
              value={form.licenseNumber}
              onChangeText={(value) => handleChange("licenseNumber", value)}
              style={styles.input}
            />

            <TextInput
              placeholder="Vehicle Number (e.g. RIDE-001)"
              placeholderTextColor="#9CA3AF"
              value={form.vehicleNumber}
              onChangeText={(value) => handleChange("vehicleNumber", value)}
              style={styles.input}
            />

            <TextInput
              placeholder="Vehicle Make"
              placeholderTextColor="#9CA3AF"
              value={form.vehicleMake}
              onChangeText={(value) => handleChange("vehicleMake", value)}
              style={styles.input}
            />

            <TextInput
              placeholder="Vehicle Model"
              placeholderTextColor="#9CA3AF"
              value={form.vehicleModel}
              onChangeText={(value) => handleChange("vehicleModel", value)}
              style={styles.input}
            />

            <Text style={[styles.info, { marginTop: 12, marginBottom: 8 }]}>Vehicle Type:</Text>
            {Platform.OS === "ios" ? (
              <TouchableOpacity
                style={{ backgroundColor: "#1F2937", borderRadius: 8, marginBottom: 16, padding: 12 }}
                onPress={() => {
                  const options = ["Tuk-tuk", "Bike", "Car", "Cancel"];
                  const valueMap = {
                    "Tuk-tuk": "tuk_tuk",
                    Bike: "bike",
                    Car: "car",
                  };
                  ActionSheetIOS.showActionSheetWithOptions(
                    { options, cancelButtonIndex: options.length - 1 },
                    (buttonIndex) => {
                      if (buttonIndex !== options.length - 1) {
                        handleChange("vehicleType", valueMap[options[buttonIndex]]);
                      }
                    }
                  );
                }}
              >
                <Text style={{ color: "white" }}>{rideVehicleOptions.find((option) => option.value === form.vehicleType)?.label || "Car"}</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ backgroundColor: "#1F2937", borderRadius: 8, marginBottom: 16 }}>
                <Picker
                  selectedValue={form.vehicleType}
                  onValueChange={(value) => handleChange("vehicleType", value)}
                  style={{ color: "white", height: 50 }}
                  itemStyle={{ color: "white" }}
                >
                  {rideVehicleOptions.map((option) => (
                    <Picker.Item key={option.value} label={option.label} value={option.value} />
                  ))}
                </Picker>
              </View>
            )}
          </View>
        )}

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 10, opacity: loading ? 0.7 : 1 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? "Registering..." : "Create account"}</Text>
          </TouchableOpacity>
        </View>

        {/* Login Link */}
        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 16 }}>
          <Text style={styles.info}>Already have an account? </Text>
          <TouchableOpacity onPress={() => setScreen("login")}>
            <Text style={[styles.info, { color: "#3B82F6", fontWeight: "bold" }]}> 
              Login
            </Text>
          </TouchableOpacity>
        </View>


      </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

export default RegisterScreen;

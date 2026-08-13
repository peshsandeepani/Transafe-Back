import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";

import API from "../services/api";
import styles from "../styles/styles";

function RegisterAmbulanceDriverScreen({ token, user }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "123456",
    phone: "",
    licenseNumber: "",
    ambulanceId: "",
    gpsDeviceId: "",
  });

  const handleChange = (name, value) => {
    setForm({
      ...form,
      [name]: value,
    });
  };

  const registerAmbulanceDriver = async () => {
    try {
      if (
        !form.name ||
        !form.email ||
        !form.phone ||
        !form.licenseNumber ||
        !form.ambulanceId ||
        !form.gpsDeviceId
      ) {
        Alert.alert("Missing Details", "Please fill all fields");
        return;
      }

      await API.post(
        "/hospitals/ambulance-drivers",
        {
          driverName: form.name,
          driverEmail: form.email,
          driverPassword: form.password,
          ambulanceNumber: form.ambulanceId,
          gpsDeviceId: form.gpsDeviceId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert(
        "Success",
        "Ambulance and driver registered successfully"
      );

      setForm({
        name: "",
        email: "",
        password: "123456",
        phone: "",
        licenseNumber: "",
        ambulanceId: "",
        gpsDeviceId: "",
      });
    } catch (error) {
      console.log(error.response?.data || error.message);

      Alert.alert(
        "Error",
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Registration failed"
      );
    }
  };

  return (
    <ScrollView style={styles.card}>
      <Text style={styles.sectionTitle}>
        🚑 Register Ambulance Driver
      </Text>

      <Text style={styles.info}>
        Hospital ID: {user.hospitalId}
      </Text>

      <TextInput
        placeholder="Driver Name"
        placeholderTextColor="#9CA3AF"
        value={form.name}
        onChangeText={(value) => handleChange("name", value)}
        style={styles.input}
      />

      <TextInput
        placeholder="Driver Email"
        placeholderTextColor="#9CA3AF"
        value={form.email}
        onChangeText={(value) => handleChange("email", value)}
        style={styles.input}
        autoCapitalize="none"
      />

      <TextInput
        placeholder="Temporary Password"
        placeholderTextColor="#9CA3AF"
        value={form.password}
        onChangeText={(value) => handleChange("password", value)}
        style={styles.input}
      />

      <TextInput
        placeholder="Phone Number"
        placeholderTextColor="#9CA3AF"
        value={form.phone}
        onChangeText={(value) => handleChange("phone", value)}
        style={styles.input}
      />

      <TextInput
        placeholder="License Number"
        placeholderTextColor="#9CA3AF"
        value={form.licenseNumber}
        onChangeText={(value) => handleChange("licenseNumber", value)}
        style={styles.input}
      />

      <TextInput
        placeholder="Ambulance ID e.g. AMB-002"
        placeholderTextColor="#9CA3AF"
        value={form.ambulanceId}
        onChangeText={(value) => handleChange("ambulanceId", value)}
        style={styles.input}
      />

      <TextInput
        placeholder="GPS Device ID e.g. GPS-AMB-002"
        placeholderTextColor="#9CA3AF"
        value={form.gpsDeviceId}
        onChangeText={(value) => handleChange("gpsDeviceId", value)}
        style={styles.input}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={registerAmbulanceDriver}
      >
        <Text style={styles.buttonText}>
          Register Ambulance & Driver
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

export default RegisterAmbulanceDriverScreen;
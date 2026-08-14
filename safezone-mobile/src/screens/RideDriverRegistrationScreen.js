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

function RideDriverRegistrationScreen({ token, user, setScreen }) {
  const normalizeRideVehicleType = (value) => {
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/-/g, "_")
      .replace(/\s+/g, "_");

    if (normalized === "tuk_tuk" || normalized === "tuktuk") return "tuk_tuk";
    if (normalized === "bike") return "bike";
    if (normalized === "car") return "car";

    return "car";
  };

  const [vehicleType, setVehicleType] = useState("car");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    try {
      setLoading(true);

      const payload = {
        vehicleType: normalizeRideVehicleType(vehicleType),
        vehicleMake,
        vehicleModel,
        vehicleNumber,
        licenseNumber,
        isOnline: true,
      };

      const res = await API.post("/rides/drivers/register", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      Alert.alert("Driver profile saved", res.data.message || "Profile created");
      setScreen("dashboard");
    } catch (error) {
      console.log(error.response?.data || error.message);
      Alert.alert("Driver profile failed", error.response?.data?.message || "Unable to save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>Ride Driver Profile</Text>

      <Text style={{ fontSize: 14, fontWeight: "bold", marginBottom: 6 }}>Vehicle type</Text>
      <TextInput value={vehicleType} onChangeText={setVehicleType} style={{ borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 }} />

      <Text style={{ fontSize: 14, fontWeight: "bold", marginBottom: 6 }}>Vehicle make</Text>
      <TextInput value={vehicleMake} onChangeText={setVehicleMake} style={{ borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 }} />

      <Text style={{ fontSize: 14, fontWeight: "bold", marginBottom: 6 }}>Vehicle model</Text>
      <TextInput value={vehicleModel} onChangeText={setVehicleModel} style={{ borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 }} />

      <Text style={{ fontSize: 14, fontWeight: "bold", marginBottom: 6 }}>Vehicle number</Text>
      <TextInput value={vehicleNumber} onChangeText={setVehicleNumber} style={{ borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 }} />

      <Text style={{ fontSize: 14, fontWeight: "bold", marginBottom: 6 }}>License number</Text>
      <TextInput value={licenseNumber} onChangeText={setLicenseNumber} style={{ borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 20 }} />

      <TouchableOpacity
        style={{ backgroundColor: "#10B981", padding: 15, borderRadius: 12, alignItems: "center" }}
        onPress={submit}
        disabled={loading}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>{loading ? "Saving..." : "Save Driver Profile"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

export default RideDriverRegistrationScreen;

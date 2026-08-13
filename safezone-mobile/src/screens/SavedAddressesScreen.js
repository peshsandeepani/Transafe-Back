import React, { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import API from "../services/api";

function SavedAddressesScreen({ token, setScreen }) {
  const [addresses, setAddresses] = useState([]);
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const loadAddresses = async () => {
    try {
      const response = await API.get("/saved-addresses", { headers });
      setAddresses(response.data.addresses || []);
    } catch (error) {
      Alert.alert("Unable to load addresses", error.response?.data?.message || error.message);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setLabel("");
    setAddress("");
    setLatitude("");
    setLongitude("");
  };

  const saveAddress = async () => {
    if (!label.trim() || !address.trim() || !latitude || !longitude) {
      Alert.alert("Missing details", "Enter a label, address, latitude, and longitude.");
      return;
    }

    try {
      setSaving(true);
      const payload = { label, address, latitude: Number(latitude), longitude: Number(longitude) };
      if (editingId) {
        await API.put(`/saved-addresses/${editingId}`, payload, { headers });
      } else {
        await API.post("/saved-addresses", payload, { headers });
      }
      resetForm();
      await loadAddresses();
    } catch (error) {
      Alert.alert("Unable to save address", error.response?.data?.message || error.message);
    } finally {
      setSaving(false);
    }
  };

  const editAddress = (item) => {
    setEditingId(item.id);
    setLabel(item.label);
    setAddress(item.address);
    setLatitude(String(item.latitude));
    setLongitude(String(item.longitude));
  };

  const deleteAddress = (id) => {
    Alert.alert("Remove address?", "This saved address will be deleted.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await API.delete(`/saved-addresses/${id}`, { headers });
            await loadAddresses();
          } catch (error) {
            Alert.alert("Unable to remove address", error.response?.data?.message || error.message);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0F172A" }} contentContainerStyle={{ padding: 18, paddingBottom: 110 }}>
      <TouchableOpacity onPress={() => setScreen("citizenTab")} style={{ marginBottom: 18 }}>
        <Text style={{ color: "#60A5FA", fontWeight: "700" }}>‹ Back to Account</Text>
      </TouchableOpacity>
      <Text style={{ color: "#F8FAFC", fontSize: 25, fontWeight: "800", marginBottom: 18 }}>Saved Addresses</Text>

      <View style={{ backgroundColor: "#1E293B", borderRadius: 16, padding: 15, marginBottom: 18, borderWidth: 1, borderColor: "#334155" }}>
        <Text style={{ color: "#F8FAFC", fontWeight: "800", marginBottom: 10 }}>{editingId ? "Edit address" : "Add address"}</Text>
        <TextInput value={label} onChangeText={setLabel} placeholder="Label e.g. Home" placeholderTextColor="#64748B" style={inputStyle} />
        <TextInput value={address} onChangeText={setAddress} placeholder="Address" placeholderTextColor="#64748B" style={inputStyle} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TextInput value={latitude} onChangeText={setLatitude} placeholder="Latitude" placeholderTextColor="#64748B" keyboardType="decimal-pad" style={[inputStyle, { flex: 1 }]} />
          <TextInput value={longitude} onChangeText={setLongitude} placeholder="Longitude" placeholderTextColor="#64748B" keyboardType="decimal-pad" style={[inputStyle, { flex: 1 }]} />
        </View>
        <TouchableOpacity onPress={saveAddress} disabled={saving} style={{ backgroundColor: "#059669", borderRadius: 12, padding: 13, alignItems: "center", marginTop: 4 }}>
          <Text style={{ color: "white", fontWeight: "800" }}>{saving ? "Saving..." : editingId ? "Update Address" : "Save Address"}</Text>
        </TouchableOpacity>
        {editingId && <TouchableOpacity onPress={resetForm} style={{ alignItems: "center", padding: 10 }}><Text style={{ color: "#94A3B8" }}>Cancel edit</Text></TouchableOpacity>}
      </View>

      {addresses.map((item) => (
        <View key={item.id} style={{ backgroundColor: "#1E293B", borderRadius: 14, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: "#334155" }}>
          <Text style={{ color: "#A7F3D0", fontWeight: "800" }}>{item.label}</Text>
          <Text style={{ color: "#F8FAFC", marginTop: 6 }}>{item.address}</Text>
          <Text style={{ color: "#64748B", fontSize: 12, marginTop: 5 }}>{item.latitude}, {item.longitude}</Text>
          <View style={{ flexDirection: "row", marginTop: 10, gap: 18 }}>
            <TouchableOpacity onPress={() => editAddress(item)}><Text style={{ color: "#60A5FA", fontWeight: "700" }}>Edit</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => deleteAddress(item.id)}><Text style={{ color: "#F87171", fontWeight: "700" }}>Delete</Text></TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const inputStyle = {
  backgroundColor: "#0F172A",
  color: "#F8FAFC",
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "#475569",
  padding: 12,
  marginBottom: 10,
};

export default SavedAddressesScreen;

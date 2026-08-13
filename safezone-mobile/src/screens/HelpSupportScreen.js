import React from "react";
import { Alert, Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";

const faqs = [
  {
    question: "How do I book a ride?",
    answer: "Open Rides from Home, choose your pickup and destination, select a vehicle, then tap Book Now.",
  },
  {
    question: "How do I report a road incident?",
    answer: "Open Report Incident from Home and submit the location, type, description, and image if available.",
  },
  {
    question: "How do I raise an SOS alert?",
    answer: "Open SOS from Home and follow the emergency alert steps. Keep location permission enabled for accurate response.",
  },
];

function HelpSupportScreen({ setScreen }) {
  const contactSupport = async () => {
    const url = "mailto:?subject=TranSafe%20Support%20Request";
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Support", "No email app is available on this device.");
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0F172A" }} contentContainerStyle={{ padding: 18, paddingBottom: 110 }}>
      <TouchableOpacity onPress={() => setScreen("citizenTab")} style={{ marginBottom: 18 }}>
        <Text style={{ color: "#60A5FA", fontWeight: "700" }}>‹ Back to Account</Text>
      </TouchableOpacity>
      <Text style={{ color: "#F8FAFC", fontSize: 25, fontWeight: "800", marginBottom: 8 }}>Help and Support</Text>
      <Text style={{ color: "#94A3B8", marginBottom: 18 }}>Find answers to common TranSafe questions or contact support from your device.</Text>

      {faqs.map((faq) => (
        <View key={faq.question} style={{ backgroundColor: "#1E293B", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#334155" }}>
          <Text style={{ color: "#F8FAFC", fontWeight: "800", fontSize: 15 }}>{faq.question}</Text>
          <Text style={{ color: "#CBD5E1", lineHeight: 20, marginTop: 7 }}>{faq.answer}</Text>
        </View>
      ))}

      <TouchableOpacity onPress={contactSupport} style={{ backgroundColor: "#064E3B", borderRadius: 14, padding: 16, marginTop: 8, borderWidth: 1, borderColor: "#10B981" }}>
        <Text style={{ color: "#A7F3D0", fontWeight: "800", textAlign: "center" }}>Contact Support by Email</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

export default HelpSupportScreen;

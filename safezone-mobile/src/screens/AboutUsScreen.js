import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

function AboutUsScreen({ setScreen }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0F172A" }} contentContainerStyle={{ padding: 18, paddingBottom: 110 }}>
      <TouchableOpacity onPress={() => setScreen("citizenTab")} style={{ marginBottom: 18 }}>
        <Text style={{ color: "#60A5FA", fontWeight: "700" }}>‹ Back to Account</Text>
      </TouchableOpacity>
      <View style={{ alignItems: "center", backgroundColor: "#1E293B", borderRadius: 18, padding: 24, borderWidth: 1, borderColor: "#334155" }}>
        <Text style={{ color: "#34D399", fontSize: 30, fontWeight: "900" }}>TranSafe</Text>
        <Text style={{ color: "#CBD5E1", textAlign: "center", lineHeight: 21, marginTop: 14 }}>A connected safety and mobility platform for safer rides, emergency response, incident reporting, and community protection.</Text>
        <Text style={{ color: "#64748B", marginTop: 20 }}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

export default AboutUsScreen;

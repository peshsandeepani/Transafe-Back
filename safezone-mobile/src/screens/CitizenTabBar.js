import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

const tabs = [
  { key: "home", icon: "🏠", label: "Home" },
  { key: "activities", icon: "📋", label: "Activities" },
  { key: "notifications", icon: "🔔", label: "Notifications" },
  { key: "account", icon: "👤", label: "Account" },
];

function CitizenTabBar({ activeTab, onChange }) {
  return (
    <View style={{ position: "absolute", left: 12, right: 12, bottom: 16, height: 68, backgroundColor: "#1E293B", borderRadius: 20, borderWidth: 1, borderColor: "#334155", flexDirection: "row", padding: 7, elevation: 8 }}>
      {tabs.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <TouchableOpacity key={tab.key} onPress={() => onChange(tab.key)} style={{ flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: active ? "#064E3B" : "transparent" }}>
            <Text style={{ fontSize: 19 }}>{tab.icon}</Text>
            <Text style={{ color: active ? "#A7F3D0" : "#94A3B8", fontSize: 11, fontWeight: "700", marginTop: 3 }}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default CitizenTabBar;

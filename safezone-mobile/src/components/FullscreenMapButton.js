import React from "react";
import { Text, TouchableOpacity } from "react-native";

function FullscreenMapButton({ fullScreen, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={fullScreen ? "Exit full screen map" : "Open full screen map"}
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        backgroundColor: "#0F172A",
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#475569",
        zIndex: 5,
      }}
    >
      <Text style={{ color: "#F8FAFC", fontWeight: "800" }}>{fullScreen ? "Exit map" : "Full screen"}</Text>
    </TouchableOpacity>
  );
}

export default FullscreenMapButton;

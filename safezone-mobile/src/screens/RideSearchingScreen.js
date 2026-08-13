import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import MapView, { Marker, Circle } from "react-native-maps";
import { doc, onSnapshot } from "firebase/firestore";
import API from "../services/api";
import { firestore } from "../services/firebase";
import FullscreenMapButton from "../components/FullscreenMapButton";

function RideSearchingScreen({ token, user, setScreen, currentRideRequest }) {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fullScreenMap, setFullScreenMap] = useState(false);

  useEffect(() => {
    if (!currentRideRequest) return;

    const rideDoc = doc(firestore, "liveRideRequests", String(currentRideRequest));
    const unsubscribe = onSnapshot(
      rideDoc,
      (snapshot) => {
        if (snapshot.exists()) {
          const live = { id: snapshot.id, ...snapshot.data() };
          setRequest(live);
          setLoading(false);

          if (live.status === "accepted") {
            setScreen("rideTracking");
          }
        } else {
          setLoading(false);
        }
      },
      (err) => {
        console.log("Ride request listener error:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentRideRequest, setScreen]);

  const handleCancel = async () => {
    if (!currentRideRequest) return;

    try {
      await API.patch(
        `/rides/requests/${currentRideRequest}/decline`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Ride cancelled", "The ride request has been cancelled.");
      setScreen("dashboard");
    } catch (error) {
      console.log(error.response?.data || error.message);
      Alert.alert("Cancellation failed", error.response?.data?.message || "Unable to cancel this ride request");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#111827", padding: 16 }}>
      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: "#E2E8F0", fontSize: 24, fontWeight: "700" }}>Searching nearby drivers</Text>
        <Text style={{ color: "#94A3B8", marginTop: 6 }}>Pickup: {request?.pickupAddress || "Your location"}</Text>
      </View>

      <View style={{ height: fullScreenMap ? "100%" : 280, flex: fullScreenMap ? 1 : undefined, borderRadius: 16, overflow: "hidden", backgroundColor: "#1E293B", borderWidth: 1, borderColor: "#334155" }}>
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            latitude: Number(request?.pickupLatitude || 6.9271),
            longitude: Number(request?.pickupLongitude || 79.8612),
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
        >
          {request?.pickupLatitude && request?.pickupLongitude && (
            <Marker coordinate={{ latitude: Number(request.pickupLatitude), longitude: Number(request.pickupLongitude) }} />
          )}
          {request?.pickupLatitude && request?.pickupLongitude && (
            <Circle center={{ latitude: Number(request.pickupLatitude), longitude: Number(request.pickupLongitude) }} radius={450} strokeWidth={2} strokeColor="#22C55E" fillColor="rgba(34,197,94,0.18)" />
          )}
        </MapView>
        <FullscreenMapButton fullScreen={fullScreenMap} onPress={() => setFullScreenMap((value) => !value)} />
      </View>

      <View style={{ backgroundColor: "#1E293B", borderRadius: 16, padding: 16, marginTop: 12 }}>
        <Text style={{ color: "#F8FAFC", fontSize: 16, fontWeight: "700", marginBottom: 12 }}>Searching nearby drivers...</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1, height: 8, borderRadius: 999, backgroundColor: "#475569", overflow: "hidden" }}>
            <View style={{ height: "100%", width: request?.status === "accepted" ? "100%" : "40%", backgroundColor: "#06B6D4" }} />
          </View>
          <ActivityIndicator size="small" color="#F8FAFC" style={{ marginLeft: 12 }} />
        </View>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16 }}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "#1E293B", padding: 14, borderRadius: 10, marginRight: 8, borderWidth: 1, borderColor: "#334155" }}
          onPress={() => setScreen("rideRequest")}
        >
          <Text style={{ color: "#F8FAFC", fontWeight: "700", textAlign: "center" }}>Book another ride</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "#EF4444", padding: 14, borderRadius: 10, marginLeft: 8 }}
          onPress={handleCancel}
        >
          <Text style={{ color: "white", fontWeight: "700", textAlign: "center" }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default RideSearchingScreen;

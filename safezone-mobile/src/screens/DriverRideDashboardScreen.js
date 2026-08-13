import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { ref, onValue } from "firebase/database";
import API from "../services/api";
import { firestore, rtdb } from "../services/firebase";
import { getVehicleId } from "../services/routeService";

function DriverRideDashboardScreen({ token, user, setScreen, activeScreen, setSelectedRideRequest }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);
  const [nearbyRequests, setNearbyRequests] = useState([]);
  const driverLocationRef = useRef(null);

  const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const computeNearbyRequests = (allRequests, location) => {
    const requestsWithDistance = allRequests.map((request) => {
      const distance = location
        ? calculateDistanceKm(
            location.latitude,
            location.longitude,
            Number(request.pickupLatitude),
            Number(request.pickupLongitude)
          )
        : null;
      return { request, distance };
    });

    const sorted = requestsWithDistance.sort((a, b) => {
      if (a.distance == null) return 1;
      if (b.distance == null) return -1;
      return a.distance - b.distance;
    });

    const nearest = sorted.filter(({ distance }) => distance != null && distance <= 10);
    setNearbyRequests(nearest.length > 0 ? nearest.map((item) => item.request) : sorted.map((item) => item.request));
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await API.get("/rides/requests", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const requested = (res.data.requests || []).filter((request) => request.status === "requested");
      setRequests(requested);
      computeNearbyRequests(requested, driverLocation);
    } catch (error) {
      console.log(error.response?.data || error.message);
      Alert.alert("Unable to load ride queue", error.response?.data?.message || "Connection error");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const vehicleId = getVehicleId(user);
    if (!vehicleId) return;

    const locationRef = ref(rtdb, `liveLocations/${vehicleId}`);
    const unsubLocation = onValue(locationRef, (snapshot) => {
      const value = snapshot.val();
      if (value?.latitude != null && value?.longitude != null) {
        const location = {
          latitude: Number(value.latitude),
          longitude: Number(value.longitude),
        };
        setDriverLocation(location);
        driverLocationRef.current = location;
        computeNearbyRequests(requests, location);
      }
    });

    return () => unsubLocation();
  }, [user, requests]);

  useEffect(() => {
    let initialSnapshot = true;
    fetchRequests();

    const rideRequestsQuery = query(
      collection(firestore, "liveRideRequests"),
      orderBy("createdAtServer", "desc")
    );

    const unsubscribeRideRequests = onSnapshot(rideRequestsQuery, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const requested = docs.filter((request) => request.status === "requested");
      setRequests(requested);
      computeNearbyRequests(requested, driverLocationRef.current);

      if (initialSnapshot) {
        initialSnapshot = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        const ride = { id: change.doc.id, ...change.doc.data() };

        if (change.type === "added") {
          const location = driverLocationRef.current;
          const distance = location
            ? calculateDistanceKm(
                location.latitude,
                location.longitude,
                Number(ride.pickupLatitude),
                Number(ride.pickupLongitude)
              )
            : null;

          if (distance != null && distance <= 10) {
            if (activeScreen !== "driverRideDashboard" && !(typeof activeScreen === "string" && activeScreen.startsWith("rideRequest"))) {
              Alert.alert(
                "🚕 Nearby Ride Request",
                `${ride.riderName || "A rider"} needs a ${ride.vehicleType || "ride"} from ${ride.pickupAddress || "pickup"}.`
              );
            }
          }
        }

        if (change.type === "modified" && ride.status === "accepted") {
          if (activeScreen !== "driverRideDashboard" && !(typeof activeScreen === "string" && activeScreen.startsWith("rideRequest"))) {
            Alert.alert(
              "✅ Ride accepted",
              `A driver has accepted ride #${ride.rideRequestId || ride.id}. Open the navigation screen now.`
            );
          }
        }
      });
    });

    return () => unsubscribeRideRequests();
  }, []);

  const acceptRequest = async (id) => {
    try {
      const res = await API.patch(
        `/rides/requests/${id}/accept`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const acceptedRequest = res.data.request || requests.find((request) => Number(request.id) === Number(id));
      setSelectedRideRequest(acceptedRequest || { id });
      setRequests((currentRequests) =>
        currentRequests.filter((request) => Number(request.id) !== Number(id))
      );
      setScreen("driverRideTracking");
    } catch (error) {
      console.log(error.response?.data || error.message);
      Alert.alert("Unable to accept ride", error.response?.data?.message || "Request could not be accepted");
    }
  };

  const isRideDriver = Boolean(user?.isRideDriver || user?.rideDriverProfile?.id);

  return (
    <ScrollView style={{ padding: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 24, fontWeight: "bold" }}>Ride Queue</Text>
          <Text style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>
            Driver: {user?.name || "Current user"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {isRideDriver && (
            <TouchableOpacity
              onPress={() => setScreen("wallet")}
              style={{
                backgroundColor: "#10B981",
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 16, marginBottom: 2 }}>👛</Text>
              <Text style={{ color: "#F8FAFC", fontSize: 10, fontWeight: "700" }}>Wallet</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setScreen("saveCard")}
            style={{
              backgroundColor: "#2563EB",
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 8,
              alignItems: "center",
              justifyContent: "center",
              marginLeft: isRideDriver ? 10 : 0,
            }}
          >
            <Text style={{ fontSize: 16, marginBottom: 2 }}>🎫</Text>
            <Text style={{ color: "#F8FAFC", fontSize: 10, fontWeight: "700" }}>Cards</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" />
      ) : requests.length === 0 ? (
        <View style={{ padding: 20, backgroundColor: "#E2E8F0", borderRadius: 12 }}>
          <Text style={{ fontSize: 15 }}>No active ride requests available.</Text>
        </View>
      ) : (
        (nearbyRequests.length > 0 ? nearbyRequests : requests).map((request) => (
          <View key={request.id} style={{ borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: "bold" }}>Request #{request.id}</Text>
            <Text style={{ marginTop: 4 }}>Status: {request.status}</Text>
            <Text style={{ marginTop: 4 }}>Pickup: {request.pickupAddress || "N/A"}</Text>
            <Text style={{ marginTop: 4 }}>Destination: {request.destinationAddress || "N/A"}</Text>
            <Text style={{ marginTop: 4 }}>Fare estimate: {request.fareEstimate || "N/A"}</Text>
            <TouchableOpacity
              style={{ marginTop: 12, backgroundColor: "#16A34A", padding: 12, borderRadius: 10 }}
              onPress={() => acceptRequest(request.id)}
            >
              <Text style={{ color: "white", fontWeight: "bold", textAlign: "center" }}>Accept Ride</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

export default DriverRideDashboardScreen;

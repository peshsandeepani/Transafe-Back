import React, { useEffect, useRef, useState } from "react";
import { Alert, ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { onValue, ref } from "firebase/database";
import API from "../services/api";
import { rtdb } from "../services/firebase";
import { fetchOSMRoutes, formatDistance, formatDuration, getVehicleId, writeLiveLocation } from "../services/routeService";
import useHeadingUpMap from "../hooks/useHeadingUpMap";
import FullscreenMapButton from "../components/FullscreenMapButton";

function DriverRideTrackingScreen({ token, user, rideRequest, setScreen }) {
  const mapRef = useRef(null);
  const [phase, setPhase] = useState("pickup");
  const [driverLocation, setDriverLocation] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [route, setRoute] = useState([]);
  const [routeDistance, setRouteDistance] = useState(null);
  const [routeDuration, setRouteDuration] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [fullScreenMap, setFullScreenMap] = useState(false);
  const { headingUp, toggleNorthUp } = useHeadingUpMap(mapRef, driverLocation);

  const pickup = {
    latitude: Number(rideRequest?.pickupLatitude || 6.9271),
    longitude: Number(rideRequest?.pickupLongitude || 79.8612),
  };
  const drop = {
    latitude: Number(rideRequest?.destinationLatitude || 6.9236),
    longitude: Number(rideRequest?.destinationLongitude || 79.8434),
  };
  const target = phase === "pickup" ? pickup : drop;
  const liveLocationKey = getVehicleId(user);

  const getLiveLocationCandidates = ({ id, assignedVehicleId }) => {
    const ids = new Set();
    if (assignedVehicleId) {
      ids.add(assignedVehicleId);
      ids.add(`vehicle_${assignedVehicleId}`);
    }
    if (id != null) {
      ids.add(`mobile_user_${id}`);
      ids.add(`${id}`);
      ids.add(`driver_${id}`);
      ids.add(`vehicle_${id}`);
    }
    return [...ids];
  };

  useEffect(() => {
    const locationKeys = getLiveLocationCandidates(user);
    if (locationKeys.length === 0) return undefined;

    const unsubscribers = locationKeys.map((candidate) => {
      const locationRef = ref(rtdb, `liveLocations/${candidate}`);
      return onValue(locationRef, (snapshot) => {
        const value = snapshot.val();
        if (value?.latitude != null && value?.longitude != null) {
          setDriverLocation({ latitude: Number(value.latitude), longitude: Number(value.longitude), heading: Number(value.heading || 0) });
        }
      });
    });

    let watcher;
    const startLocationUpdates = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") return;

      watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        (location) => {
          const nextLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            speed: location.coords.speed,
            heading: location.coords.heading,
          };
          setDriverLocation(nextLocation);
          writeLiveLocation(user, nextLocation);
        }
      );
    };
    startLocationUpdates().catch((error) => console.log("Driver location error:", error));

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      watcher?.remove();
    };
  }, [user]);

  useEffect(() => {
    const riderId = rideRequest?.riderId || rideRequest?.rider?.id;
    if (!riderId) return undefined;

    const riderCandidates = getLiveLocationCandidates({ id: riderId });
    const unsubscribers = riderCandidates.map((candidate) => {
      const riderLocationRef = ref(rtdb, `liveLocations/${candidate}`);
      return onValue(riderLocationRef, (snapshot) => {
        const value = snapshot.val();
        if (value?.latitude != null && value?.longitude != null) {
          setRiderLocation({
            latitude: Number(value.latitude),
            longitude: Number(value.longitude),
            heading: Number(value.heading || 0),
          });
        }
      });
    });

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [rideRequest?.riderId, rideRequest?.rider?.id]);

  useEffect(() => {
    const start = driverLocation || pickup;
    let active = true;
    setLoadingRoute(true);

    fetchOSMRoutes(start, target)
      .then((routes) => {
        if (!active || routes.length === 0) return;
        const selectedRoute = routes[0];
        setRoute(selectedRoute.geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude })));
        setRouteDistance(selectedRoute.distance);
        setRouteDuration(selectedRoute.duration);
      })
      .catch((error) => console.log("Driver route error:", error))
      .finally(() => {
        if (active) setLoadingRoute(false);
      });

    return () => {
      active = false;
    };
  }, [driverLocation?.latitude, driverLocation?.longitude, phase, target.latitude, target.longitude]);

  const updateStatus = async (status) => {
    try {
      setUpdatingStatus(true);
      await API.patch(`/rides/requests/${rideRequest.id}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } });
      if (status === "picked_up") setPhase("trip");
    } catch (error) {
      Alert.alert("Unable to update ride", error.response?.data?.message || error.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const completeTrip = async () => {
    try {
      setUpdatingStatus(true);
      await API.post(`/rides/requests/${rideRequest.id}/complete`, {}, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert("Trip completed", "The ride has been completed.", [
        { text: "Open Payments", onPress: () => setScreen("payments") },
        { text: "Home", onPress: () => setScreen("dashboard") },
      ]);
    } catch (error) {
      Alert.alert("Unable to complete trip", error.response?.data?.message || error.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const recenter = () => {
    if (!driverLocation) return;
    toggleNorthUp();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#111827", padding: 16 }}>
      <Text style={{ color: "#F8FAFC", fontSize: 24, fontWeight: "800" }}>{phase === "pickup" ? "Navigating to rider" : "Trip in progress"}</Text>
      <Text style={{ color: "#94A3B8", marginTop: 5 }}>{phase === "pickup" ? "Follow the route to the rider's pickup location." : "Drive the rider to the drop-off location."}</Text>

      <View style={{ height: fullScreenMap ? "100%" : 390, flex: fullScreenMap ? 1 : undefined, marginTop: 14, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#334155" }}>
        <MapView ref={mapRef} style={{ flex: 1 }} initialRegion={{ ...target, latitudeDelta: 0.03, longitudeDelta: 0.03 }}>
          {driverLocation && (
            <Marker coordinate={driverLocation} rotation={Number(driverLocation.heading || 0)} anchor={{ x: 0.5, y: 0.5 }}>
              <Text style={{ color: "#22C55E", fontSize: 30 }}>▲</Text>
            </Marker>
          )}
          {riderLocation && (
            <Marker coordinate={riderLocation} pinColor="#3B82F6">
              <Text style={{ fontWeight: "700", color: "#FFFFFF", backgroundColor: "rgba(59,130,246,0.9)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                Rider
              </Text>
            </Marker>
          )}
          <Marker coordinate={pickup} pinColor="#F59E0B">
            <Text style={{ fontWeight: "700", color: "#0F172A", backgroundColor: "rgba(249, 115, 22, 0.9)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
              Pickup
            </Text>
          </Marker>
          {route.length > 0 && <Polyline coordinates={route} strokeColor="#34D399" strokeWidth={5} />}
        </MapView>
        <FullscreenMapButton fullScreen={fullScreenMap} onPress={() => setFullScreenMap((value) => !value)} />
        <TouchableOpacity onPress={recenter} style={{ position: "absolute", right: 12, bottom: 12, backgroundColor: "#0F172A", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 }}>
          <Text style={{ color: "#F8FAFC", fontWeight: "800" }}>{headingUp ? "North up" : "Heading up"}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ backgroundColor: "#1E293B", borderRadius: 14, padding: 14, marginTop: 12 }}>
        {loadingRoute ? <ActivityIndicator color="#34D399" /> : <Text style={{ color: "#A7F3D0", fontWeight: "800" }}>{formatDistance(routeDistance)} · {formatDuration(routeDuration)}</Text>}
        <Text style={{ color: "#CBD5E1", marginTop: 6 }}>{phase === "pickup" ? rideRequest?.pickupAddress || "Pickup location" : rideRequest?.destinationAddress || "Drop-off location"}</Text>
      </View>

      {phase === "pickup" ? (
        <TouchableOpacity disabled={updatingStatus} onPress={() => updateStatus("picked_up")} style={{ backgroundColor: "#2563EB", padding: 15, borderRadius: 12, marginTop: 14 }}>
          <Text style={{ color: "white", fontWeight: "800", textAlign: "center" }}>{updatingStatus ? "Updating..." : "Picked up rider"}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity disabled={updatingStatus} onPress={completeTrip} style={{ backgroundColor: "#10B981", padding: 15, borderRadius: 12, marginTop: 14 }}>
          <Text style={{ color: "#052E16", fontWeight: "800", textAlign: "center" }}>{updatingStatus ? "Completing..." : "Complete Trip"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default DriverRideTrackingScreen;

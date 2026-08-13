import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Linking, Alert } from "react-native";
import MapView, { Marker, Polyline, Circle } from "react-native-maps";
import * as Location from "expo-location";
import { ref, onValue } from "firebase/database";
import { rtdb, firestore } from "../services/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { fetchOSMRoutes, formatDistance, formatDuration, writeLiveLocation, clearLiveLocation } from "../services/routeService";
import API from "../services/api";
import useHeadingUpMap from "../hooks/useHeadingUpMap";
import FullscreenMapButton from "../components/FullscreenMapButton";

function RideTrackingScreen({ token, user, setScreen, currentRideRequest }) {
  const [driverLocation, setDriverLocation] = useState(null);
  const [request, setRequest] = useState(null);
  const [route, setRoute] = useState([]);
  const [routeDistance, setRouteDistance] = useState(null);
  const [routeDuration, setRouteDuration] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(5);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [fullScreenMap, setFullScreenMap] = useState(false);
  const [walletNotificationSent, setWalletNotificationSent] = useState(false);
  const mapRef = useRef(null);
  const { headingUp, toggleNorthUp } = useHeadingUpMap(mapRef, driverLocation);

  useEffect(() => {
    if (!currentRideRequest) return;

    let activeUnsubs = [];

    const subscribeToDriverCandidates = (driverUserId, driverId) => {
      const ids = new Set();
      if (driverUserId) {
        ids.add(`mobile_user_${driverUserId}`);
        ids.add(`${driverUserId}`);
        ids.add(`driver_${driverUserId}`);
        ids.add(`vehicle_${driverUserId}`);
      }
      if (driverId) {
        ids.add(`mobile_user_${driverId}`);
        ids.add(`${driverId}`);
        ids.add(`driver_${driverId}`);
        ids.add(`vehicle_${driverId}`);
      }

      ids.forEach((candidate) => {
        const driversRef = ref(rtdb, `liveLocations/${candidate}`);
        const unsub = onValue(driversRef, (snapshot) => {
          const value = snapshot.val();
          if (value) {
            setDriverLocation({ ...value, heading: Number(value.heading || 0) });
            activeUnsubs.forEach((u) => u());
            activeUnsubs = [];
          }
        });
        activeUnsubs.push(unsub);
      });
    };

    const rideDocRef = doc(firestore, "liveRideRequests", String(currentRideRequest));
    const unsubRide = onSnapshot(
      rideDocRef,
      (snapshot) => {
        if (!snapshot.exists()) return;
        const live = snapshot.data();

        const driverUserId = live.acceptedDriverUserId || null;
        const driverId = live.acceptedDriverId || null;
        if (driverUserId || driverId) {
          subscribeToDriverCandidates(driverUserId, driverId);
        }

        setRequest({ id: snapshot.id, ...live });
      },
      (err) => console.log("Ride doc listener error:", err)
    );

    return () => {
      unsubRide();
      activeUnsubs.forEach((u) => u());
      activeUnsubs = [];
    };
  }, [currentRideRequest]);

  useEffect(() => {
    const computeRoute = async () => {
      if (!request) return;

      const status = request.status;
      const showingToPickup = status === "accepted" || status === "driver_en_route";
      const showingToDestination = status === "picked_up" || status === "in_progress";

      if (!showingToPickup && !showingToDestination) {
        return;
      }

        const start = showingToPickup
        ? driverLocation
          ? { latitude: Number(driverLocation.latitude), longitude: Number(driverLocation.longitude) }
          : null
        : driverLocation
          ? { latitude: Number(driverLocation.latitude), longitude: Number(driverLocation.longitude) }
          : { latitude: Number(request.pickupLatitude), longitude: Number(request.pickupLongitude) };

      const dest = showingToPickup
        ? { latitude: Number(request.pickupLatitude), longitude: Number(request.pickupLongitude) }
        : { latitude: Number(request.destinationLatitude), longitude: Number(request.destinationLongitude) };

      setShowMap(true);
      if (!start || !dest || Number.isNaN(start.latitude) || Number.isNaN(start.longitude) || Number.isNaN(dest.latitude) || Number.isNaN(dest.longitude)) {
        setRoute([]);
        setRouteDistance(null);
        setRouteDuration(null);
        setLoadingRoute(false);
        return;
      }

      setLoadingRoute(true);
      try {
        const routes = await fetchOSMRoutes(start, dest);
        if (routes && routes.length > 0) {
          const selected = routes[0];
          setRoute(selected.geometry.coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng })));
          setRouteDistance(selected.distance);
          setRouteDuration(selected.duration);
        } else {
          setRoute([]);
          setRouteDistance(null);
          setRouteDuration(null);
        }
      } catch (err) {
        console.log("Route fetch error:", err);
        setRoute([]);
        setRouteDistance(null);
        setRouteDuration(null);
      } finally {
        setLoadingRoute(false);
      }
    };

    computeRoute();
  }, [request, driverLocation]);

  useEffect(() => {
    if (!request) return;
    const status = String(request.status || "").toLowerCase();
    if (status !== "completed") return;

    setShowMap(false);
    setShowRating(true);

    if (!walletNotificationSent) {
      API.get("/wallet", { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
          const bal = res.data.wallet?.balance;
          if (bal != null) {
            Alert.alert("Trip completed", `Your wallet has been updated. Current balance: ${bal}`);
          } else {
            Alert.alert("Trip completed", "Your trip completed successfully. Your wallet has been updated.");
          }
        })
        .catch((err) => console.log("Wallet refresh error:", err));

      setWalletNotificationSent(true);
    }
  }, [request, token, walletNotificationSent]);

  useEffect(() => {
    if (!request || !mapRef.current) return;

    const isOnDestination = request.status === "picked_up" || request.status === "in_progress";
    if (!isOnDestination) return;
    if (request.destinationLatitude == null || request.destinationLongitude == null) return;

    const region = {
      latitude: Number(request.destinationLatitude),
      longitude: Number(request.destinationLongitude),
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    };

    mapRef.current.animateToRegion(region, 1000);
  }, [request?.status, request?.destinationLatitude, request?.destinationLongitude]);

  useEffect(() => {
    if (!request || !user) return;

    let watcher = null;
    let isMounted = true;

    const startRiderLocationUpdates = async () => {
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

          if (!isMounted) return;
          setRiderLocation(nextLocation);
          writeLiveLocation(user, nextLocation);
        }
      );
    };

    startRiderLocationUpdates().catch((error) => console.log("Rider location tracker error:", error));

    return () => {
      isMounted = false;
      watcher?.remove();
      clearLiveLocation(user).catch((error) => console.log("Clear rider live location error:", error));
    };
  }, [request, user]);

  const pickup = {
    latitude: Number(request?.pickupLatitude || 6.9271),
    longitude: Number(request?.pickupLongitude || 79.8612),
  };

  const destination = {
    latitude: Number(request?.destinationLatitude || 6.9236),
    longitude: Number(request?.destinationLongitude || 79.8434),
  };

  const driver = {
    latitude: Number(driverLocation?.latitude || 6.9271),
    longitude: Number(driverLocation?.longitude || 79.8612),
  };

  const showingToPickup = request?.status === "accepted" || request?.status === "driver_en_route";
  const showingToDestination = request?.status === "picked_up" || request?.status === "in_progress";
  const showDriverDetails = request?.status === "accepted" || request?.status === "driver_en_route";

  const submitRating = async (score) => {
    try {
      setSubmittingRating(true);
      await API.post(`/rides/requests/${currentRideRequest}/rate`, { rating: score }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert("Thanks for rating", "Thank you — your rating was submitted.");
      setShowRating(false);
      setScreen("dashboard");
    } catch (error) {
      console.log("Rating submit error:", error.response?.data || error.message);
      Alert.alert("Unable to submit rating", error.response?.data?.message || error.message);
    } finally {
      setSubmittingRating(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#111827", padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "700", color: "#F8FAFC", marginBottom: 12 }}>{request?.status === "picked_up" || request?.status === "in_progress" ? "Trip in progress" : "Driver found"}</Text>

      {showMap ? (
        <View style={{ height: fullScreenMap ? "100%" : 420, flex: fullScreenMap ? 1 : undefined, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#334155", backgroundColor: "#1E293B" }}>
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            initialRegion={{
              latitude: driver.latitude,
              longitude: driver.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
          >
            {driverLocation && (
              <Marker coordinate={{ latitude: driver.latitude, longitude: driver.longitude }} rotation={Number(driverLocation.heading || 0)} anchor={{ x: 0.5, y: 0.5 }}>
                <View>
                  <Text style={{ color: "#22C55E", fontSize: 30 }}>▲</Text>
                </View>
              </Marker>
            )}
            {riderLocation && showingToPickup && (
              <Marker coordinate={{ latitude: riderLocation.latitude, longitude: riderLocation.longitude }} pinColor="#3B82F6">
                <View>
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", backgroundColor: "rgba(59,130,246,0.9)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>Rider</Text>
                </View>
              </Marker>
            )}
            <Marker coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }} pinColor="#F59E0B">
              <View>
                <Text style={{ fontWeight: "700", color: "#0F172A", backgroundColor: "rgba(249,115,22,0.9)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>Pickup</Text>
              </View>
            </Marker>
            {showingToDestination && request?.destinationLatitude != null && request?.destinationLongitude != null && (
              <Marker coordinate={{ latitude: Number(request.destinationLatitude), longitude: Number(request.destinationLongitude) }} pinColor="#38BDF8">
                <View>
                  <Text style={{ fontWeight: "700", color: "#0F172A", backgroundColor: "rgba(56,189,248,0.9)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>Drop</Text>
                </View>
              </Marker>
            )}
            {route.length > 0 && <Polyline coordinates={route} strokeColor="#34D399" strokeWidth={5} />}
            {driverLocation && showingToPickup && (
              <Polyline coordinates={[
                { latitude: driver.latitude, longitude: driver.longitude },
                { latitude: pickup.latitude, longitude: pickup.longitude },
              ]} strokeColor="#E2E8F0" strokeWidth={2} lineDashPattern={[4, 6]} />
            )}
            <Circle center={{ latitude: pickup.latitude, longitude: pickup.longitude }} radius={120} strokeWidth={1} strokeColor="#FBBF24" fillColor="rgba(251,191,36,0.1)" />
          </MapView>
          <FullscreenMapButton fullScreen={fullScreenMap} onPress={() => setFullScreenMap((value) => !value)} />
          <TouchableOpacity onPress={toggleNorthUp} style={{ position: "absolute", right: 10, bottom: 10, backgroundColor: "#0F172A", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 }}>
            <Text style={{ color: "#F8FAFC", fontWeight: "800" }}>{headingUp ? "North up" : "Heading up"}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ height: 200, borderRadius: 12, backgroundColor: "#0B1220", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#F8FAFC" }}>Trip completed</Text>
        </View>
      )}

      <View style={{ backgroundColor: "#1E293B", borderRadius: 16, padding: 14, marginTop: 12 }}>
        {(request?.status === "picked_up" || request?.status === "in_progress" || request?.status === "accepted" || request?.status === "driver_en_route") ? (
          <>
            <Text style={{ color: "#F8FAFC", fontSize: 18, fontWeight: "700" }}>
              {request?.status === "picked_up" || request?.status === "in_progress" ? "Trip in progress" : "Driver is on the way"}
            </Text>
            {loadingRoute ? (
              <Text style={{ color: "#A7F3D0" }}>Calculating route...</Text>
            ) : routeDistance != null && routeDuration != null ? (
              <Text style={{ color: "#A7F3D0", fontWeight: "800" }}>{formatDistance(routeDistance)} · {formatDuration(routeDuration)}</Text>
            ) : (
              <Text style={{ color: "#94A3B8" }}>Waiting for driver location...</Text>
            )}
            <Text style={{ color: "#CBD5E1", marginTop: 6 }}>
              {request?.status === "picked_up" || request?.status === "in_progress"
                ? request?.destinationAddress || "Drop-off location"
                : request?.pickupAddress || "Pickup location"}
            </Text>
            {showDriverDetails && (
              <View style={{ marginTop: 12, padding: 12, backgroundColor: "#111827", borderRadius: 14 }}>
                <Text style={{ color: "#F8FAFC", fontSize: 16, fontWeight: "700" }}>Driver details</Text>
                <Text style={{ color: "#CBD5E1", marginTop: 8 }}>Name: {request?.acceptedDriverName || "Not available"}</Text>
                <Text style={{ color: "#CBD5E1", marginTop: 4 }}>Phone: {request?.acceptedDriverPhone || "Not available"}</Text>
                <Text style={{ color: "#CBD5E1", marginTop: 4 }}>Vehicle: {request?.acceptedDriverVehicleNumber || "Not available"}</Text>
                {request?.acceptedDriverRatingAverage != null && (
                  <Text style={{ color: "#CBD5E1", marginTop: 4 }}>
                    Driver rating: {Number(request.acceptedDriverRatingAverage).toFixed(1)} ⭐ ({request.acceptedDriverRatingCount || 0})
                  </Text>
                )}
                <View style={{ flexDirection: "row", marginTop: 12 }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: "#2563EB", padding: 12, borderRadius: 10, marginRight: 8 }}
                    onPress={() => {
                      if (request?.acceptedDriverPhone) {
                        Linking.openURL(`tel:${request.acceptedDriverPhone}`);
                      } else {
                        Alert.alert("No phone number", "Driver contact is not available yet.");
                      }
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "700", textAlign: "center" }}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: "#16A34A", padding: 12, borderRadius: 10, marginLeft: 8 }}
                    onPress={() => {
                      if (request?.acceptedDriverPhone) {
                        Linking.openURL(`sms:${request.acceptedDriverPhone}`);
                      } else {
                        Alert.alert("No phone number", "Driver contact is not available yet.");
                      }
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "700", textAlign: "center" }}>Message</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={{ color: "#F8FAFC", fontSize: 18, fontWeight: "700" }}>Meet your driver here</Text>
            <Text style={{ color: "#CBD5E1", marginTop: 4 }}>Driver: {user?.name || "SafeZone Driver"}</Text>
            <View style={{ flexDirection: "row", marginTop: 12 }}>
              <TouchableOpacity style={{ flex: 1, backgroundColor: "#2563EB", padding: 12, borderRadius: 10, marginRight: 8 }} onPress={() => Linking.openURL(`tel:+123456789`)}>
                <Text style={{ color: "white", fontWeight: "700", textAlign: "center" }}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, backgroundColor: "#16A34A", padding: 12, borderRadius: 10, marginLeft: 8 }} onPress={() => Linking.openURL(`sms:+123456789`)}>
                <Text style={{ color: "white", fontWeight: "700", textAlign: "center" }}>Message</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {!showMap && (
        <TouchableOpacity
          style={{ marginTop: 14, backgroundColor: "#10B981", padding: 14, borderRadius: 12 }}
          onPress={() => setScreen("dashboard")}
        >
          <Text style={{ color: "white", fontWeight: "700", textAlign: "center" }}>Back to home</Text>
        </TouchableOpacity>
      )}
      {request?.status === "completed" && !showRating && (
        <TouchableOpacity
          style={{ marginTop: 14, backgroundColor: "#2563EB", padding: 14, borderRadius: 12 }}
          onPress={() => setShowRating(true)}
        >
          <Text style={{ color: "white", fontWeight: "700", textAlign: "center" }}>Rate your ride</Text>
        </TouchableOpacity>
      )}

      {showRating && (
        <View style={{ position: "absolute", left: 20, right: 20, top: "30%", backgroundColor: "#0B1220", padding: 18, borderRadius: 12, alignItems: "center" }}>
          <Text style={{ color: "#F8FAFC", fontSize: 18, fontWeight: "700", marginBottom: 12 }}>Rate your ride</Text>
          <View style={{ flexDirection: "row", marginBottom: 12 }}>
            {[1,2,3,4,5].map((s) => (
              <TouchableOpacity key={s} onPress={() => setRating(s)} style={{ padding: 8 }}>
                <Text style={{ fontSize: 28, color: s <= rating ? "#F59E0B" : "#475569" }}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity disabled={submittingRating} onPress={() => submitRating(rating)} style={{ backgroundColor: "#2563EB", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 }}>
            <Text style={{ color: "white", fontWeight: "700" }}>{submittingRating ? "Submitting..." : "Submit rating"}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default RideTrackingScreen;

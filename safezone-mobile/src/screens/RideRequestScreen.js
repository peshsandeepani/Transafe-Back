import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import API from "../services/api";
import styles from "../styles/styles";
import FullscreenMapButton from "../components/FullscreenMapButton";

function RideRequestScreen({ token, user, setScreen, setCurrentRideRequest, ridePaymentSelection = "cash", setRidePaymentSelection, initialDestinationSearch = false }) {
  const [pickupAddress, setPickupAddress] = useState("Current Location");
  const [pickupQuery, setPickupQuery] = useState("Current Location");
  const [pickupLatitude, setPickupLatitude] = useState(6.9271);
  const [pickupLongitude, setPickupLongitude] = useState(79.8612);
  const [stopQuery, setStopQuery] = useState("");
  const [stopAddress, setStopAddress] = useState("");
  const [stopLatitude, setStopLatitude] = useState(null);
  const [stopLongitude, setStopLongitude] = useState(null);
  const [returnDropQuery, setReturnDropQuery] = useState("Same as pickup");
  const [returnDropAddress, setReturnDropAddress] = useState("Same as pickup");
  const [returnDropLatitude, setReturnDropLatitude] = useState(6.9271);
  const [returnDropLongitude, setReturnDropLongitude] = useState(79.8612);
  const [seatStep, setSeatStep] = useState(2);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [stopSuggestions, setStopSuggestions] = useState([]);
  const [dropSuggestions, setDropSuggestions] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState("car");
  const [selectedPayment, setSelectedPayment] = useState(ridePaymentSelection || "cash");
  const [tripType, setTripType] = useState("one_way");
  const [loading, setLoading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [fareEstimate, setFareEstimate] = useState(680);
  const [defaultCard, setDefaultCard] = useState(null);
  const [hasCardMethods, setHasCardMethods] = useState(false);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [outboundFareEstimate, setOutboundFareEstimate] = useState(680);
  const [returnFareEstimate, setReturnFareEstimate] = useState(0);
  const [routeDistanceKm, setRouteDistanceKm] = useState(0);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [fullScreenMap, setFullScreenMap] = useState(false);
  const searchTimerRef = useRef(null);

  const vehicleTypes = {
    tuk_tuk: { label: "Tuk-tuk", icon: "🛺", minRate: 80, maxRate: 110, estimate: 7, rating: 4.8 },
    bike: { label: "Bike", icon: "🏍️", minRate: 50, maxRate: 60, estimate: 5, rating: 4.7 },
    car: { label: "Car (Flex)", icon: "🚗", minRate: 100, maxRate: 140, estimate: 7, rating: 4.6 },
  };

  const searchPlaces = (query, target = "stop") => {
    const suggestionsMap = {
      pickup: setPickupSuggestions,
      stop: setStopSuggestions,
      drop: setDropSuggestions,
    };
    const suggestionsSetter = suggestionsMap[target] || setStopSuggestions;

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    if (!query || query.trim().length < 2) {
      suggestionsSetter([]);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      try {
        const response = await API.get("/places/search", {
          params: { q: query.trim() },
        });

        suggestionsSetter(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.log("Place search error:", error);
        suggestionsSetter([]);
      }
    }, 500);
  };

  const loadSavedPaymentMethods = async () => {
    try {
      setLoadingPaymentMethods(true);
      const response = await API.get("/payments/methods", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const methods = response.data.methods || [];
        setHasCardMethods(methods.length > 0);
        const defaultMethod = methods.find((method) => method.isDefault) || methods[0] || null;
        setDefaultCard(defaultMethod);
      }
    } catch (error) {
      console.log("Load payment methods error:", error);
      setHasCardMethods(false);
      setDefaultCard(null);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadSavedPaymentMethods();
  }, [token]);

  const getCurrentRidePickup = async () => {
    try {
      setFetchingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert("Location permission needed", "Please allow SafeZone to read your current GPS position.");
        setFetchingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = location.coords.latitude;
      const lon = location.coords.longitude;

      setPickupLatitude(lat);
      setPickupLongitude(lon);
      setPickupAddress("Current Location");
      setPickupQuery("Current Location");
      setPickupSuggestions([]);
      setReturnDropLatitude(lat);
      setReturnDropLongitude(lon);
      setReturnDropAddress("Same as pickup");
      setReturnDropQuery("Same as pickup");
    } catch (error) {
      console.log("GPS fetch error:", error);
      Alert.alert("Location unavailable", "Unable to fetch your current location.");
    } finally {
      setFetchingLocation(false);
    }
  };

  useEffect(() => {
    getCurrentRidePickup();
  }, []);

  useEffect(() => {
    if (ridePaymentSelection) {
      setSelectedPayment(ridePaymentSelection);
    }
  }, [ridePaymentSelection]);

  const computeRoute = async (routeTripType = tripType) => {
    if (!stopLatitude || !stopLongitude) {
      setRouteCoordinates([]);
      setFareEstimate(0);
      setOutboundFareEstimate(0);
      setReturnFareEstimate(0);
      setRouteDistanceKm(0);
      return;
    }
    try {
      const legs = [
        {
          from: { latitude: pickupLatitude, longitude: pickupLongitude },
          to: { latitude: stopLatitude, longitude: stopLongitude },
        },
      ];
  
      if (routeTripType === "round_trip") {
        legs.push({
          from: { latitude: stopLatitude, longitude: stopLongitude },
          to: { latitude: returnDropLatitude, longitude: returnDropLongitude },
        });
      }

      const fullRoute = [];
      const legDistancesKm = [];

      for (const leg of legs) {
        const url = `https://router.project-osrm.org/route/v1/driving/${leg.from.longitude},${leg.from.latitude};${leg.to.longitude},${leg.to.latitude}?geometries=geojson&overview=full`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates.map((point) => ({
            latitude: point[1],
            longitude: point[0],
          }));
          fullRoute.push(...coords);
          legDistancesKm.push(route.distance / 1000);
        }
      }

      if (fullRoute.length > 0) {
        setRouteCoordinates(fullRoute);
      }

      const averageRate = (vehicleTypes[selectedVehicle].minRate + vehicleTypes[selectedVehicle].maxRate) / 2;
      setRouteDistanceKm(legDistancesKm.reduce((total, distance) => total + distance, 0));
      const outboundEstimate = Math.round((legDistancesKm[0] || 0) * averageRate);
      const returnEstimate = routeTripType === "round_trip"
        ? Math.round((legDistancesKm[1] || 0) * averageRate)
        : 0;
      setOutboundFareEstimate(outboundEstimate);
      setReturnFareEstimate(returnEstimate);
      setFareEstimate(outboundEstimate + returnEstimate);
    } catch (error) {
      console.log("OSRM route error:", error);
    }
  };

  useEffect(() => {
    if (!stopLatitude || !stopLongitude) return;
    computeRoute();
  }, [
    pickupLatitude,
    pickupLongitude,
    stopLatitude,
    stopLongitude,
    returnDropLatitude,
    returnDropLongitude,
    tripType,
    selectedVehicle,
  ]);

  const totalFare = tripType === "round_trip"
    ? outboundFareEstimate + returnFareEstimate
    : outboundFareEstimate;

  const getVehicleFare = (vehicleType) => {
    const vehicle = vehicleTypes[vehicleType];
    const distance = routeDistanceKm || 3;
    const averageRate = (vehicle.minRate + vehicle.maxRate) / 2;
    return Math.round(distance * averageRate);
  };

  const getVehicleFareLabel = (vehicleType) => {
    const vehicle = vehicleTypes[vehicleType];
    const distance = routeDistanceKm || 3;
    const minFare = Math.round(distance * vehicle.minRate);
    const maxFare = Math.round(distance * vehicle.maxRate);
    return `LKR ${minFare} - ${maxFare}`;
  };

  const submitRideRequest = async () => {
    if (!stopLatitude || !stopLongitude) {
      Alert.alert(
        "Select destination",
        "Please choose a destination from the search suggestions before booking."
      );
      return;
    }
    try {
      setLoading(true);

      const payloadFareEstimate = Number(totalFare) || getVehicleFare(selectedVehicle);
      const payload = {
        pickupAddress,
        pickupLatitude: Number(pickupLatitude),
        pickupLongitude: Number(pickupLongitude),
        stopAddress,
        stopLatitude: Number(stopLatitude),
        stopLongitude: Number(stopLongitude),
        destinationAddress: stopAddress,
        destinationLatitude: Number(stopLatitude),
        destinationLongitude: Number(stopLongitude),
        returnDropAddress,
        returnDropLatitude: Number(returnDropLatitude),
        returnDropLongitude: Number(returnDropLongitude),
        vehicleType: selectedVehicle,
        fareEstimate: payloadFareEstimate,
        paymentMethod: selectedPayment,
        tripType,
      };

      const res = await API.post("/rides/requests", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const rideId = res.data.request?.id || res.data.id || res.data.request;
      setCurrentRideRequest(rideId);
      Alert.alert("Ride requested", res.data.message || "Your ride has been requested.");
      setScreen("rideSearching");
    } catch (error) {
      if (selectedPayment === "card" && !defaultCard) {
        Alert.alert("No saved card", "Please add and select a saved card before booking with card payment.");
        return;
      }

      console.log(error.response?.data || error.message);
      Alert.alert("Booking failed", error.response?.data?.message || "Unable to create ride request");
    } finally {
      setLoading(false);
    }
  };

  if (seatStep === 3) {
    return (
      <ScrollView style={{ backgroundColor: "#111827", padding: 14 }}>
        <Text style={{ fontSize: 24, fontWeight: "700", color: "#F8FAFC", marginBottom: 12 }}>Choose your ride</Text>

        <View style={{ height: fullScreenMap ? "100%" : 240, flex: fullScreenMap ? 1 : undefined, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#334155" }}>
          <View style={{ position: "absolute", top: 14, left: 14, right: 14, zIndex: 2 }}>
            <View style={{ backgroundColor: "rgba(15, 23, 42, 0.94)", borderRadius: 14, borderWidth: 1, borderColor: "#334155", padding: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 5 }}>
              <Text style={{ color: "#94A3B8", fontSize: 12, marginBottom: 6, fontWeight: "700" }}>Search destination</Text>
              <TextInput
                value={stopQuery}
                placeholder="Search destination"
                placeholderTextColor="#94A3B8"
                onChangeText={(value) => {
                  setStopQuery(value);
                  searchPlaces(value, "stop");
                }}
                style={{ backgroundColor: "#0F172A", color: "#F8FAFC", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#475569" }}
              />
              {stopSuggestions.length > 0 && (
                <View style={{ marginTop: 10, maxHeight: 180, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#334155", backgroundColor: "#111827" }}>
                  {stopSuggestions.map((s, idx) => (
                    <TouchableOpacity
                      key={`map-stop-${s.place_id || idx}-${s.display_name}`}
                      style={{ padding: 12, borderBottomWidth: idx < stopSuggestions.length - 1 ? 1 : 0, borderBottomColor: "#334155" }}
                      onPress={() => {
                        setStopAddress(s.display_name);
                        setStopQuery(s.display_name);
                        setStopLatitude(Number(s.lat));
                        setStopLongitude(Number(s.lon));
                        setStopSuggestions([]);
                        computeRoute();
                      }}
                    >
                      <Text style={{ color: "#F8FAFC" }}>{s.display_name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
          <MapView
            style={{ flex: 1 }}
            initialRegion={{
              latitude: 6.9271,
              longitude: 79.8612,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Marker coordinate={{ latitude: pickupLatitude, longitude: pickupLongitude }} pinColor="#34D399" />
            {stopLatitude != null && stopLongitude != null && (
              <Marker coordinate={{ latitude: stopLatitude, longitude: stopLongitude }} pinColor="#FBBF24" />
            )}
            {tripType === "round_trip" && (
              <Marker coordinate={{ latitude: returnDropLatitude, longitude: returnDropLongitude }} pinColor="#38BDF8" />
            )}
            <Polyline coordinates={routeCoordinates} strokeColor="#020617" strokeWidth={4} />
          </MapView>
          <FullscreenMapButton fullScreen={fullScreenMap} onPress={() => setFullScreenMap((value) => !value)} />
        </View>

        <View style={{ marginTop: 14 }}>
          <Text style={{ color: "#E2E8F0", fontSize: 16, fontWeight: "700", marginBottom: 10 }}>Vehicle type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
            {Object.keys(vehicleTypes).map((key) => (
              <TouchableOpacity
                key={key}
                style={{
                  backgroundColor: selectedVehicle === key ? "#022C22" : "#1E293B",
                  borderWidth: selectedVehicle === key ? 2 : 1,
                  borderColor: selectedVehicle === key ? "#34D399" : "#475569",
                  padding: 14,
                  borderRadius: 12,
                  minWidth: 148,
                  marginRight: 12,
                }}
                onPress={() => {
                  setSelectedVehicle(key);
                  computeRoute();
                }}
              >
                <Text style={{ fontSize: 26 }}>{vehicleTypes[key].icon}</Text>
                <Text style={{ color: "#F8FAFC", fontWeight: "700", marginTop: 8 }}>{vehicleTypes[key].label}</Text>
                <Text style={{ color: "#94A3B8", marginTop: 4 }}>{vehicleTypes[key].estimate} mins</Text>
                <Text style={{ color: "#F8FAFC", marginTop: 4 }}>{getVehicleFareLabel(key)}</Text>
                <Text style={{ color: "#F8FAFC", marginTop: 4 }}>⭐ {vehicleTypes[key].rating}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={{ color: "#E2E8F0", fontSize: 16, fontWeight: "700", marginBottom: 12 }}>Payment</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 10, backgroundColor: selectedPayment === "cash" ? "#064E3B" : "#1F2937", borderWidth: 1, borderColor: "#334155" }}
              onPress={() => setSelectedPayment("cash")}
            >
              <Text style={{ marginRight: 6 }}>💵</Text>
              <Text style={{ color: "#F8FAFC" }}>Cash</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 10, backgroundColor: selectedPayment === "card" ? "#064E3B" : "#1F2937", borderWidth: 1, borderColor: "#334155" }}
              onPress={() => {
                if (!hasCardMethods) {
                  Alert.alert(
                    "Add a card",
                    "No saved card found. Please add a card before selecting card payment.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Add Card", onPress: () => setScreen("addCard") },
                    ]
                  );
                  return;
                }

                setSelectedPayment("card");
                if (setRidePaymentSelection) {
                  setRidePaymentSelection("card");
                }
              }}
              onLongPress={() => setScreen("addCard")}
              delayLongPress={450}
            >
              <Text style={{ marginRight: 6 }}>💳</Text>
              <Text style={{ color: "#F8FAFC" }}>Card</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 10, backgroundColor: "#1F2937", borderWidth: 1, borderColor: "#334155" }}>
              <Text style={{ marginRight: 6 }}>✳</Text>
              <Text style={{ color: "#F8FAFC" }}>Add Promo</Text>
            </TouchableOpacity>
          </View>
          {selectedPayment === "card" && (
            <View style={{ marginTop: 10 }}>
              {loadingPaymentMethods ? (
                <Text style={{ color: "#94A3B8", fontSize: 12 }}>
                  Checking saved cards...
                </Text>
              ) : defaultCard ? (
                <Text style={{ color: "#94A3B8", fontSize: 12 }}>
                  Default card: {defaultCard.cardBrand} ****{defaultCard.cardLast4}
                </Text>
              ) : (
                <Text style={{ color: "#FBCFE8", fontSize: 12 }}>
                  No saved card available. Tap card again to add one.
                </Text>
              )}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={{ backgroundColor: "#22C55E", padding: 16, borderRadius: 12, marginTop: 18, alignItems: "center" }}
          onPress={submitRideRequest}
          disabled={loading}
        >
          <Text style={{ color: "#052E16", fontWeight: "800", fontSize: 16 }}>{loading ? "Creating ride..." : "Book Now"}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: "#111827", padding: 16 }}>
      <Text style={{ fontSize: 26, fontWeight: "800", color: "#F8FAFC", marginBottom: 14 }}>Book a Ride</Text>

      <View style={{ flexDirection: "row", backgroundColor: "#1E293B", borderRadius: 12, padding: 8, marginBottom: 16 }}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: tripType === "one_way" ? "#22C55E" : "#1F2937", padding: 10, borderRadius: 8 }}
          onPress={() => {
            setTripType("one_way");
            computeRoute("one_way");
          }}
        >
          <Text style={{ color: "white", fontWeight: "700", textAlign: "center" }}>One way</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: tripType === "round_trip" ? "#22C55E" : "#1F2937", opacity: tripType === "round_trip" ? 1 : 0.45, padding: 10, borderRadius: 8 }}
          onPress={() => {
            setTripType("round_trip");
            if (returnDropAddress === "Same as pickup") {
              setReturnDropLatitude(pickupLatitude);
              setReturnDropLongitude(pickupLongitude);
            }
            computeRoute("round_trip");
          }}
        >
          <Text style={{ color: "#CBD5E1", fontWeight: "700", textAlign: "center" }}>Return trip</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ color: "#94A3B8", fontWeight: "700", marginBottom: 6 }}>PICKUP</Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TextInput
          value={pickupQuery}
          placeholder="Where are you picking up?"
          placeholderTextColor="#94A3B8"
          style={{ flex: 1, backgroundColor: "#1E293B", color: "#F8FAFC", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#334155", marginBottom: 12 }}
          onChangeText={(value) => {
            setPickupQuery(value);
            searchPlaces(value, "pickup");
          }}
        />
        <TouchableOpacity
          style={{ marginLeft: 8, backgroundColor: "#2563EB", borderRadius: 99, width: 38, height: 38, alignItems: "center", justifyContent: "center" }}
          onPress={getCurrentRidePickup}
          disabled={fetchingLocation}
        >
          <Text style={{ color: "white", fontSize: 18, fontWeight: "700" }}>{fetchingLocation ? "..." : "⌖"}</Text>
        </TouchableOpacity>
      </View>
      {pickupSuggestions.length > 0 && (
        <View style={{ marginTop: -6, marginBottom: 12, backgroundColor: "#1E293B", borderRadius: 10, borderWidth: 1, borderColor: "#475569" }}>
          {pickupSuggestions.map((s, idx) => (
            <TouchableOpacity
              key={`pickup-${s.place_id || idx}-${s.display_name}`}
              style={{ padding: 12, borderBottomWidth: idx < pickupSuggestions.length - 1 ? 1 : 0, borderBottomColor: "#334155" }}
              onPress={() => {
                setPickupAddress(s.display_name);
                setPickupQuery(s.display_name);
                setPickupLatitude(Number(s.lat));
                setPickupLongitude(Number(s.lon));
                setPickupSuggestions([]);
                computeRoute();
              }}
            >
              <Text style={{ color: "#F8FAFC" }}>{s.display_name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <Text style={{ color: "#A7F3D0", fontSize: 12, marginBottom: 12 }}>{pickupAddress}</Text>

      <Text style={{ color: "#94A3B8", fontWeight: "700", marginBottom: 6 }}>{tripType === "round_trip" ? "STOP" : "DROP"}</Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TextInput
          value={tripType === "round_trip" ? stopQuery : stopQuery}
          autoFocus={initialDestinationSearch}
          placeholder="Where are you going?"
          placeholderTextColor="#94A3B8"
          onChangeText={(value) => {
            setStopQuery(value);
            searchPlaces(value, "stop");
          }}
          style={{ flex: 1, backgroundColor: "#1E293B", color: "#F8FAFC", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#334155" }}
        />
        <TouchableOpacity style={{ marginLeft: 8, backgroundColor: "#2563EB", borderRadius: 99, width: 38, height: 38, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "white", fontSize: 20, fontWeight: "700" }}>+</Text>
        </TouchableOpacity>
      </View>

      {stopSuggestions.length > 0 && (
        <View style={{ marginTop: 6, backgroundColor: "#1E293B", borderRadius: 10, borderWidth: 1, borderColor: "#475569" }}>
          {stopSuggestions.map((s, idx) => (
            <TouchableOpacity
              key={`stop-${s.place_id || idx}-${s.display_name}`}
              style={{ padding: 12, borderBottomWidth: idx < stopSuggestions.length - 1 ? 1 : 0, borderBottomColor: "#334155" }}
              onPress={() => {
                setStopAddress(s.display_name);
                setStopQuery(s.display_name);
                setStopLatitude(Number(s.lat));
                setStopLongitude(Number(s.lon));
                setStopSuggestions([]);
                computeRoute();
                setSeatStep(3);
              }}
            >
              <Text style={{ color: "#F8FAFC" }}>{s.display_name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {tripType === "round_trip" && (
        <>
          <Text style={{ color: "#94A3B8", fontWeight: "700", marginBottom: 6, marginTop: 12 }}>DROP</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TextInput
              value={returnDropQuery}
              placeholder="Same as pickup"
              placeholderTextColor="#94A3B8"
              onChangeText={(value) => {
                setReturnDropQuery(value);
                searchPlaces(value, "drop");
              }}
              style={{ flex: 1, backgroundColor: "#1E293B", color: "#F8FAFC", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#334155" }}
            />
            <TouchableOpacity style={{ marginLeft: 8, backgroundColor: "#2563EB", borderRadius: 99, width: 38, height: 38, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "white", fontSize: 20, fontWeight: "700" }}>+</Text>
            </TouchableOpacity>
          </View>

          {dropSuggestions.length > 0 && (
            <View style={{ marginTop: 6, backgroundColor: "#1E293B", borderRadius: 10, borderWidth: 1, borderColor: "#475569" }}>
              {dropSuggestions.map((s, idx) => (
                <TouchableOpacity
                  key={`drop-${s.place_id || idx}-${s.display_name}`}
                  style={{ padding: 12, borderBottomWidth: idx < dropSuggestions.length - 1 ? 1 : 0, borderBottomColor: "#334155" }}
                  onPress={() => {
                    setReturnDropAddress(s.display_name);
                    setReturnDropQuery(s.display_name);
                    setReturnDropLatitude(Number(s.lat));
                    setReturnDropLongitude(Number(s.lon));
                    setDropSuggestions([]);
                    computeRoute();
                    setSeatStep(3);
                  }}
                >
                  <Text style={{ color: "#F8FAFC" }}>{s.display_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}

      <View style={{ marginTop: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#F8FAFC", fontWeight: "700" }}>Saved Addresses</Text>
          <Text style={{ color: "#60A5FA" }}>See all</Text>
        </View>
        <View style={{ flexDirection: "row", marginTop: 8 }}>
          <TouchableOpacity style={{ backgroundColor: "#1E293B", borderRadius: 8, padding: 8, marginRight: 8 }}>
            <Text style={{ color: "#F8FAFC" }}>🏠 Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ backgroundColor: "#1E293B", borderRadius: 8, padding: 8, marginRight: 8 }}>
            <Text style={{ color: "#F8FAFC" }}>💼 Work</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ backgroundColor: "#1E293B", borderRadius: 8, padding: 8 }}>
            <Text style={{ color: "#F8FAFC" }}>📍 Set location on map</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ marginTop: 20 }}>
        <Text style={{ color: "#F8FAFC", fontWeight: "700", marginBottom: 10 }}>Recent / frequent locations</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { title: "Galle Face", icon: "🏖️" },
            { title: "Colombo Fort", icon: "🏢" },
            { title: "Rajagiriya", icon: "📍" },
          ].map((item, index) => (
            <TouchableOpacity key={index} style={{ backgroundColor: "#1E293B", borderRadius: 10, padding: 10, marginRight: 10 }}>
              <Text>{item.icon}</Text>
              <Text style={{ color: "#E2E8F0" }}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

export default RideRequestScreen;

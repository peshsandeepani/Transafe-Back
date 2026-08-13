import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";

import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";

import API from "../services/api";
import styles from "../styles/styles";
import useHeadingUpMap from "../hooks/useHeadingUpMap";
import FullscreenMapButton from "../components/FullscreenMapButton";

function AmbulanceTripsScreen({ token, user }) {
  const [ambulanceId, setAmbulanceId] = useState("");
  const [tripStarted, setTripStarted] = useState(false);
  const [tripId, setTripId] = useState(null);

  const [currentLocation, setCurrentLocation] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  const [destinationQuery, setDestinationQuery] = useState("");
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [fullScreenMap, setFullScreenMap] = useState(false);
  const mapRef = useRef(null);
  const { headingUp, toggleNorthUp } = useHeadingUpMap(mapRef, currentLocation);

  useEffect(() => {
    if (user?.assignedVehicleId) {
      setAmbulanceId(user.assignedVehicleId);
    }
  }, [user]);

  const searchDestination = async (query) => {
    try {
      setDestinationQuery(query);

      if (query.trim().length < 3) {
        setDestinationSuggestions([]);
        return;
      }

      const encodedQuery = encodeURIComponent(`${query}, Sri Lanka`);

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=5&countrycodes=lk`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "SafeZoneGuardiansMobileApp",
          },
        }
      );

      const text = await res.text();
      const data = JSON.parse(text);

      setDestinationSuggestions(data || []);
    } catch (error) {
      console.log(error);
      setDestinationSuggestions([]);
    }
  };

  const fetchRoutes = async (start, end) => {
    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?alternatives=3&geometries=geojson&overview=full`
      );

      const data = await res.json();

      const sortedRoutes = (data.routes || []).sort(
        (a, b) => a.distance - b.distance
      );

      setRoutes(sortedRoutes);
      setSelectedRouteIndex(0);
    } catch (error) {
      console.log(error);
      Alert.alert("Route Error", "Could not load route suggestions");
    }
  };

  const startTrip = async () => {
    try {
      if (!ambulanceId) {
        Alert.alert(
          "Ambulance Not Assigned",
          "This account does not have an assigned ambulance."
        );
        return;
      }

      if (!selectedDestination) {
        Alert.alert(
          "Select Destination",
          "Please select destination from suggestions"
        );
        return;
      }

      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission required"
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});

      const start = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        heading: location.coords.heading,
      };

      setCurrentLocation(start);

      await fetchRoutes(start, selectedDestination);

      const res = await API.post(
        "/ambulance-trips/start",
        {
          ambulanceId,
          driverName: user.name,
          startLatitude: start.latitude,
          startLongitude: start.longitude,
          endLatitude: selectedDestination.latitude,
          endLongitude: selectedDestination.longitude,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setTripId(res.data.trip.id);
      setTripStarted(true);

      Alert.alert(
        "Trip Started",
        "Ambulance emergency trip started"
      );
    } catch (error) {
      console.log(error.response?.data || error.message);

      Alert.alert(
        "Trip Error",
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to start ambulance trip"
      );
    }
  };

  const endTrip = async () => {
    try {
      if (!tripId) {
        Alert.alert(
          "No Active Trip",
          "There is no active trip to complete."
        );
        return;
      }

      await API.put(
        `/ambulance-trips/${tripId}/end`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setTripStarted(false);
      setTripId(null);
      setSelectedDestination(null);
      setCurrentLocation(null);
      setDestinationQuery("");
      setDestinationSuggestions([]);
      setRoutes([]);
      setSelectedRouteIndex(0);

      Alert.alert(
        "Trip Completed",
        "Ambulance trip completed"
      );
    } catch (error) {
      console.log(error.response?.data || error.message);

      Alert.alert(
        "Trip Error",
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to complete trip"
      );
    }
  };
  useEffect(() => {
  let intervalId;

  const updateAmbulanceLocation = async () => {
    try {
      if (!tripStarted || !ambulanceId) return;

      const location = await Location.getCurrentPositionAsync({});

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        heading: location.coords.heading,
      };

      setCurrentLocation(newLocation);

      await API.put(
        `/ambulance-trips/${tripId}/location`,
        newLocation,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (error) {
      console.log(error.response?.data || error.message);
    }
  };

  if (tripStarted && ambulanceId) {
    updateAmbulanceLocation();

    intervalId = setInterval(() => {
      updateAmbulanceLocation();
    }, 5000);
  }

  return () => {
    if (intervalId) clearInterval(intervalId);
  };
}, [tripStarted, tripId]);
  return (
    <ScrollView style={styles.card}>
      <Text style={styles.sectionTitle}>
        🚑 Ambulance Driver
      </Text>

      <TextInput
        placeholder="Ambulance ID"
        placeholderTextColor="#9CA3AF"
        value={ambulanceId}
        editable={false}
        style={styles.input}
      />

      {!tripStarted && (
        <>
          <TextInput
            placeholder="Type destination"
            placeholderTextColor="#9CA3AF"
            value={destinationQuery}
            onChangeText={searchDestination}
            style={styles.input}
          />

          {destinationSuggestions.map((item) => (
            <TouchableOpacity
              key={item.place_id}
              style={styles.incidentCard}
              onPress={() => {
                const selected = {
                  latitude: Number(item.lat),
                  longitude: Number(item.lon),
                  name: item.display_name,
                };

                setSelectedDestination(selected);
                setDestinationQuery(item.display_name);
                setDestinationSuggestions([]);
              }}
            >
              <Text style={styles.info}>{item.display_name}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {tripStarted && currentLocation && selectedDestination && (
        <View style={[styles.mapBox, fullScreenMap && { flex: 1, height: "100%", marginHorizontal: 0 }]}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
          >
            {routes.map((route, index) => {
              const coordinates = route.geometry.coordinates.map((coord) => ({
                latitude: coord[1],
                longitude: coord[0],
              }));

              return (
                <Polyline
                  key={index}
                  coordinates={coordinates}
                  strokeColor={
                    index === selectedRouteIndex
                      ? "#DC2626"
                      : "#86EFAC"
                  }
                  strokeWidth={
                    index === selectedRouteIndex
                      ? 6
                      : 4
                  }
                  tappable
                  onPress={() => setSelectedRouteIndex(index)}
                />
              );
            })}

            <Marker coordinate={currentLocation} rotation={Number(currentLocation.heading || 0)} title="Ambulance" anchor={{ x: 0.5, y: 0.5 }}>
              <Text style={{ fontSize: 30 }}>▲</Text>
            </Marker>

            <Marker
              coordinate={selectedDestination}
              title="Destination"
            >
              <Text style={{ fontSize: 36 }}>📍</Text>
            </Marker>
          </MapView>
          <FullscreenMapButton fullScreen={fullScreenMap} onPress={() => setFullScreenMap((value) => !value)} />
          <TouchableOpacity onPress={toggleNorthUp} style={{ position: "absolute", right: 10, bottom: 10, backgroundColor: "#0F172A", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 }}>
            <Text style={{ color: "#F8FAFC", fontWeight: "800" }}>{headingUp ? "North up" : "Heading up"}</Text>
          </TouchableOpacity>
        </View>
      )}

      {tripStarted && routes.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>
            Suggested Routes
          </Text>

          {routes.map((route, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuButton,
                {
                  backgroundColor:
                    index === selectedRouteIndex
                      ? "#DC2626"
                      : "#166534",
                },
              ]}
              onPress={() => setSelectedRouteIndex(index)}
            >
              <Text style={styles.menuText}>
                {index === 0
                  ? "Shortest Route"
                  : `Route ${index + 1}`}{" "}
                - {(route.distance / 1000).toFixed(2)} km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!tripStarted ? (
        <TouchableOpacity
          style={styles.button}
          onPress={startTrip}
        >
          <Text style={styles.buttonText}>
            Start Emergency Trip
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: "#DC2626",
            },
          ]}
          onPress={endTrip}
        >
          <Text style={styles.buttonText}>
            Complete Trip
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

export default AmbulanceTripsScreen;
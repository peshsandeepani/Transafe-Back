import React, { useEffect, useRef, useState } from "react";
import { ScrollView, Text, TouchableOpacity, Alert, Image, View } from "react-native";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
// TEMPORARILY DISABLED FOR EXPO GO / iOS DEV — google-signin
// TODO: Restore this native Google module import and the runtime Google configuration when the Android/iOS native dev-client path is ready.
// import { GoogleSignin } from "@react-native-google-signin/google-signin";

import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import HospitalRegisterScreen from "./src/screens/HospitalRegisterScreen";
import PoliceRegisterScreen from "./src/screens/PoliceRegisterScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import GPSTrackingScreen from "./src/screens/GPSTrackingScreen";
import RoadIncidentsScreen from "./src/screens/RoadIncidentsScreen";
import AmbulanceWarningsScreen from "./src/screens/AmbulanceWarningsScreen";
import AmbulanceTripsScreen from "./src/screens/AmbulanceTripsScreen";
import HospitalDashboardScreen from "./src/screens/HospitalDashboardScreen";
import HospitalChartsScreen from "./src/screens/HospitalChartsScreen";
import RegisterAmbulanceDriverScreen from "./src/screens/RegisterAmbulanceDriverScreen";
import HospitalAmbulanceTripsScreen from "./src/screens/HospitalAmbulanceTripsScreen";
import HospitalAmbulanceTripMapScreen from "./src/screens/HospitalAmbulanceTripMapScreen";
import EmergencySOSScreen from "./src/screens/EmergencySOSScreen";
import SOSDashboardScreen from "./src/screens/SOSDashboardScreen";
import SOSMapScreen from "./src/screens/SOSMapScreen";
import SharedSOSAlertScreen from "./src/screens/SharedSOSAlertScreen";
import NearbyIncidentsScreen from "./src/screens/NearbyIncidentsScreen";
import RoadIncidentDetailsScreen from "./src/screens/RoadIncidentDetailsScreen";
import RespondingToIncidentScreen from "./src/screens/RespondingToIncidentScreen";
import PoliceNearbyIncidentsScreen from "./src/screens/PoliceNearbyIncidentsScreen";
import PoliceSosAlertsScreen from "./src/screens/PoliceSosAlertsScreen";
import RegisterPoliceOfficerScreen from "./src/screens/RegisterPoliceOfficerScreen";
import RoadIncidentMapScreen from "./src/screens/RoadIncidentMapScreen";
import PoliceAdminDashboardScreen from "./src/screens/PoliceAdminDashboardScreen";
import PoliceDashboardScreen from "./src/screens/PoliceDashboardScreen";
import PoliceOfficerDashboardScreen from "./src/screens/PoliceOfficerDashboardScreen";
import OfficerSOSAlertsScreen from "./src/screens/OfficerSOSAlertsScreen";
import OfficerIncidentAlertsScreen from "./src/screens/OfficerIncidentAlertsScreen";
import OfficerSOSMapScreen from "./src/screens/OfficerSOSMapScreen";
import OfficerIncidentMapScreen from "./src/screens/OfficerIncidentMapScreen";
import OfficerTripTrackingScreen from "./src/screens/OfficerTripTrackingScreen";
import SharedRoadIncidentsScreen from "./src/screens/SharedRoadIncidentsScreen";
import AdminRegisterHospitalScreen from "./src/screens/AdminRegisterHospitalScreen";
import AdminRegisterPoliceScreen from "./src/screens/AdminRegisterPoliceScreen";
import AdminSystemOverviewScreen from "./src/screens/AdminSystemOverviewScreen";
import AdminDashboardScreen from "./src/screens/AdminDashboardScreen";
import RideRequestScreen from "./src/screens/RideRequestScreen";
import RideSearchingScreen from "./src/screens/RideSearchingScreen";
import RideTrackingScreen from "./src/screens/RideTrackingScreen";
import DriverRideDashboardScreen from "./src/screens/DriverRideDashboardScreen";
import DriverRideTrackingScreen from "./src/screens/DriverRideTrackingScreen";
import RideDriverRegistrationScreen from "./src/screens/RideDriverRegistrationScreen";
import AddCardScreen from "./src/screens/AddCardScreen";
import CitizenHomeScreen from "./src/screens/CitizenHomeScreen";
import CitizenTabBar from "./src/screens/CitizenTabBar";
import CitizenActivitiesScreen from "./src/screens/CitizenActivitiesScreen";
import CitizenNotificationsScreen from "./src/screens/CitizenNotificationsScreen";
import CitizenAccountScreen from "./src/screens/CitizenAccountScreen";
import HelpSupportScreen from "./src/screens/HelpSupportScreen";
import SavedAddressesScreen from "./src/screens/SavedAddressesScreen";
import PaymentsScreen from "./src/screens/PaymentsScreen";
import WalletScreen from "./src/screens/WalletScreen";
import AboutUsScreen from "./src/screens/AboutUsScreen";

import socket from "./src/services/socket";
import { firestore, rtdb } from "./src/services/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
} from "firebase/firestore";
import { ref, onValue } from "firebase/database";
import styles from "./src/styles/styles";

export default function App() {
  // TEMPORARILY DISABLED FOR EXPO GO / iOS DEV — google-signin
  // TODO: Restore this startup Google Sign-In configuration once the Android native Google Sign-In package is compatible with the active Expo runtime.
  // useEffect(() => {
  //   GoogleSignin.configure({
  //     webClientId:
  //       "5326434186-gbltc18vup6hu8k7m7ggd9eq0e9t8tjs.apps.googleusercontent.com",
  //   });
  // }, []);

  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [screen, setScreen] = useState("dashboard");
  const [currentRideRequest, setCurrentRideRequest] = useState(null);
  const [selectedRideRequest, setSelectedRideRequest] = useState(null);
  const rideRequestNotificationsReady = useRef(false);
  const userNotificationListenerStartedAt = useRef(Date.now());
  const [citizenTab, setCitizenTab] = useState("home");
  const [userNotifications, setUserNotifications] = useState([]);

  const [ambulanceWarning, setAmbulanceWarning] = useState(null);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [warningPopupShown, setWarningPopupShown] = useState(false);

  const [selectedSosAlert, setSelectedSosAlert] = useState(null);
  const [sharedSOSAlerts, setSharedSOSAlerts] = useState([]);

  const [nearbyIncidents, setNearbyIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [respondingIncident, setRespondingIncident] = useState(null);
  const [incidentNotifications, setIncidentNotifications] = useState([]);
  const [incidentCallbacks, setIncidentCallbacks] = useState(null);

  const [policeRespondedIncidents, setPoliceRespondedIncidents] = useState([]);

  const [officerSOSAlerts, setOfficerSOSAlerts] = useState([]);
  const [officerIncidentAlerts, setOfficerIncidentAlerts] = useState([]);
  const [selectedOfficerSOS, setSelectedOfficerSOS] = useState(null);
  const [selectedOfficerIncident, setSelectedOfficerIncident] = useState(null);
  const [officerTripDestination, setOfficerTripDestination] = useState(null);

  const [sharedRoadIncidents, setSharedRoadIncidents] = useState([]);
  const [selectedSharedRoadIncident, setSelectedSharedRoadIncident] =
    useState(null);

  const [liveAmbulanceTrips, setLiveAmbulanceTrips] = useState([]);
  const [selectedAmbulanceTrip, setSelectedAmbulanceTrip] = useState(null);

  // Firebase listener initialization flags
  const [firebaseListenersInitialized, setFirebaseListenersInitialized] =
    useState(false);
  const [liveRoadIncidentsInitialLoadDone, setLiveRoadIncidentsInitialLoadDone] =
    useState(false);
  const [liveSOSAlertsInitialLoadDone, setLiveSOSAlertsInitialLoadDone] =
    useState(false);
  const [liveUserNotificationsInitialLoadDone, setLiveUserNotificationsInitialLoadDone] =
    useState(false);

  const playEmergencyAlarm = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("./assets/emergency-alarm.mp3")
      );
      await sound.playAsync();
    } catch (error) {
      console.log("Alarm error:", error);
    }
  };
 

  useEffect(() => {
    if (!user) return;

    const loadOfficerAlerts = async () => {
      try {
        if (user.role !== "police_officer") return;

        const savedSOS = await AsyncStorage.getItem(
          `officerSOSAlerts_${user.id}`
        );

        const savedIncidents = await AsyncStorage.getItem(
          `officerIncidentAlerts_${user.id}`
        );

        if (savedSOS) setOfficerSOSAlerts(JSON.parse(savedSOS));
        if (savedIncidents) setOfficerIncidentAlerts(JSON.parse(savedIncidents));
      } catch (error) {
        console.log("Load officer alerts error:", error);
      }
    };

    loadOfficerAlerts();
   socket.off("nearbyEmergencyAlert");
socket.on("nearbyEmergencyAlert", (data) => {
  console.log("Nearby Emergency Alert:", data);

  setAmbulanceWarning(data);

  Alert.alert(
    "🚑 Ambulance Approaching",
    `${data.message}\n\nDistance: ${data.distance} km`
  );
});
    socket.off("incidentNotification");
    socket.on("incidentNotification", (data) => {
      if (!user) return;
      if (Number(data.userId) !== Number(user.id)) return;

      Alert.alert(
        data.title || "🚔 Police Response",
        data.message || "Police have noted your road incident report."
      );
    });

    socket.off("incidentHospitalResponse");
    socket.on("incidentHospitalResponse", (data) => {
      if (!user) return;
      if (Number(data.reporterId) !== Number(user.id)) return;

      Alert.alert(
        data.title || "🏥 Hospital Response",
        data.message || "Hospital has noted your road incident report."
      );
    });

    socket.off("nearbyDriverWarning");
    socket.on("nearbyDriverWarning", (warning) => {
      if (!user || warning.vehicleId !== user.assignedVehicleId) return;

      setAmbulanceWarning(warning);

      // Show alert for every distance update/state change
      Alert.alert(
        `🚑 ${warning.label || "Ambulance Approaching"}`,
        `${warning.message}\n\nDistance: ${warning.distance} km`
      );
    });

    socket.off("gpsUpdate");
    socket.on("gpsUpdate", (newLocation) => {
      if (!user || newLocation.vehicleId !== user.assignedVehicleId) return;
      setGpsLocation(newLocation);
    });

    socket.off("clearAmbulanceWarning");
    socket.on("clearAmbulanceWarning", (data) => {
      if (!user || data.vehicleId !== user.assignedVehicleId) return;
      setAmbulanceWarning(null);
      setWarningPopupShown(false);
    });

    socket.off("clearAmbulanceWarningAll");
    socket.on("clearAmbulanceWarningAll", () => {
      setAmbulanceWarning(null);
      setWarningPopupShown(false);
    });

    socket.off("newSOSAlertAdmin");
    socket.on("newSOSAlertAdmin", async (sos) => {
      if (!user || user.role !== "admin") return;

      await playEmergencyAlarm();

      Alert.alert(
        "🚨 EMERGENCY SOS ALERT",
        `${sos.senderName} needs help!\n\nRole: ${sos.senderRole}\nVehicle: ${
          sos.vehicleId || "N/A"
        }\nLocation: ${sos.latitude}, ${sos.longitude}`
      );

      setScreen("sosDashboard");
    });

    socket.off("nearbyHospitalSOSAlert");
    socket.on("nearbyHospitalSOSAlert", (sos) => {
      if (!user || user.role !== "hospital_admin") return;

      if (Number(user.hospitalId) !== Number(sos.hospitalId)) return;

      Alert.alert(
        "🚨 Nearby Emergency SOS",
        `${sos.senderName} needs help nearby!\n\nDistance: ${sos.distance} km`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open SOS Alerts", onPress: () => setScreen("sosDashboard") },
        ]
      );
    });

    socket.off("nearbyPoliceSOSAlert");
    socket.on("nearbyPoliceSOSAlert", (sos) => {
      if (!user || user.role !== "police_admin") return;

      if (Number(user.policeDepartmentId) !== Number(sos.policeDepartmentId)) {
        return;
      }

      Alert.alert(
        "🆘 Nearby SOS Emergency",
        `${sos.senderName || "A user"} needs help nearby.\n\nDistance: ${
          sos.distance || "N/A"
        } km`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open SOS Alerts",
            onPress: () => setScreen("policeSosAlerts"),
          },
        ]
      );
    });

    socket.off("newRoadIncidentHospitalAlert");
    socket.on("newRoadIncidentHospitalAlert", (incident) => {
      if (!user || (user.role !== "hospital_admin" && user.role !== "admin")) {
        return;
      }

      Alert.alert(
        "🚨 Road Incident Alert",
        `${incident.type}\n\n${incident.description}\n\nLocation: ${
          incident.locationName || "Location not available"
        }`
      );
    });

    socket.off("nearbyPoliceRoadIncidentAlert");
    socket.on("nearbyPoliceRoadIncidentAlert", (incident) => {
      if (!user || user.role !== "police_admin") return;

      if (
        Number(user.policeDepartmentId) !==
        Number(incident.policeDepartmentId)
      ) {
        return;
      }

      Alert.alert(
        "🚨 Nearby Road Incident",
        `${incident.type || "Road incident"} reported nearby.\n\n${
          incident.description || ""
        }\n\nDistance: ${incident.distance || "N/A"} km`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Incidents",
            onPress: () => setScreen("policeNearbyIncidents"),
          },
        ]
      );
    });

    socket.off("roadIncidentNearbyWarning");
    socket.on("roadIncidentNearbyWarning", (warning) => {
      if (!user || warning.vehicleId !== user.assignedVehicleId) return;

      Alert.alert(
        "🚨 Road Incident Nearby",
        `${warning.type}\n${warning.description}\n\nLocation: ${
          warning.locationName || "Nearby area"
        }\nDistance: ${warning.distance} km`
      );

      setScreen("gpsTracking");
    });

    socket.off("roadIncidentNearby");
    socket.on("roadIncidentNearby", (data) => {
      if (
        !user ||
        (user.role !== "ambulance_driver" && user.role !== "hospital_admin")
      ) {
        return;
      }

      Alert.alert(
        "🚨 Nearby Road Incident",
        `${data.type?.toUpperCase()}\n${data.description}\n\nDistance: ${
          data.distance?.toFixed(1) || "N/A"
        }km`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Incidents",
            onPress: () => setScreen("nearbyIncidents"),
          },
        ]
      );
    });

    socket.off("sosNotification");
    socket.on("sosNotification", (data) => {
      if (!user) return;
      if (Number(data.userId) !== Number(user.id)) return;

      Alert.alert(
        data.title || "🚔 Police Response",
        data.message || "Police have noted your SOS alert."
      );
    });

    socket.off("sosAlertShared");
    socket.on("sosAlertShared", (data) => {
      if (!user || data.driverId !== user.id) return;

      Alert.alert(
        "🚨 Shared SOS Alert",
        `${data.hospitalName} shared an emergency alert with you!\n\nFrom: ${data.senderName}\n📱 Call: ${data.senderPhone}`,
        [
          { text: "Open", onPress: () => setScreen("sharedSOS") },
          { text: "OK" },
        ]
      );

      setSharedSOSAlerts((prev) => [
        {
          ...data.sosAlert,
          sharedBy: data.hospitalName,
          senderPhone: data.senderPhone,
        },
        ...prev,
      ]);
    });

    socket.off("officerNotification");
    socket.on("officerNotification", (data) => {
      if (!user) return;
      if (Number(data.officerId) !== Number(user.id)) return;

      Alert.alert(
        data.type || "👮 Police Alert",
        data.message || "New alert shared with you."
      );

      if (data.sosId) {
        setOfficerSOSAlerts((prev) => {
          const exists = prev.some(
            (item) => Number(item.id) === Number(data.sosId)
          );
          if (exists) return prev;

          const updated = [
            {
              id: data.sosId,
              senderName: data.senderName || "Unknown",
              latitude: data.latitude,
              longitude: data.longitude,
              message: data.message,
              senderPhone: data.senderPhone,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ];

          AsyncStorage.setItem(
            `officerSOSAlerts_${user.id}`,
            JSON.stringify(updated)
          );

          return updated;
        });
      }

      if (data.incidentId) {
        setOfficerIncidentAlerts((prev) => {
          const exists = prev.some(
            (item) => Number(item.id) === Number(data.incidentId)
          );
          if (exists) return prev;

          const updated = [
            {
              id: data.incidentId,
              type: data.incidentType || "Road Incident",
              location: data.location || "Location not available",
              latitude: data.latitude,
              longitude: data.longitude,
              message: data.message,
              senderPhone: data.senderPhone,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ];

          AsyncStorage.setItem(
            `officerIncidentAlerts_${user.id}`,
            JSON.stringify(updated)
          );

          return updated;
        });
      }
    });

    socket.off("roadIncidentSharedWithDriver");
    socket.on("roadIncidentSharedWithDriver", (data) => {
      if (!user) return;
      if (user.role !== "ambulance_driver") return;
      if (Number(data.driverId) !== Number(user.id)) return;

      const sharedIncident = {
        id: data.incidentId || data.incident?.id,
        type: data.type || data.incident?.type || "Road Incident",
        description:
          data.description || data.incident?.description || "No description",
        locationName:
          data.location ||
          data.incident?.locationName ||
          "Location not available",
        latitude: data.latitude || data.incident?.latitude,
        longitude: data.longitude || data.incident?.longitude,
        imageUrl: data.imageUrl || data.incident?.imageUrl,
        hospitalName: data.hospitalName || "Hospital",
        hospitalPhone: data.hospitalPhone || "Not provided",
        message: data.message || "Road incident shared with you",
      };

      setSharedRoadIncidents((prev) => {
        const exists = prev.some(
          (item) => Number(item.id) === Number(sharedIncident.id)
        );

        if (exists) return prev;

        return [sharedIncident, ...prev];
      });

      Alert.alert(
        "🚨 Shared Road Incident",
        `${sharedIncident.hospitalName} shared a road incident with you.`,
        [
          { text: "Open", onPress: () => setScreen("sharedRoadIncidents") },
          { text: "OK" },
        ]
      );
    });

    socket.off("incidentResponse");
    socket.on("incidentResponse", (data) => {
      setNearbyIncidents((prev) =>
        prev.map((incident) =>
          incident.id === data.incidentId
            ? {
                ...incident,
                respondingDriverId: data.driverId,
                respondingDriverName: data.driverName,
                status: data.status || "Responding",
              }
            : incident
        )
      );
    });

    socket.off("incidentResolved");
    socket.on("incidentResolved", (data) => {
      setNearbyIncidents((prev) =>
        prev.map((incident) =>
          incident.id === data.incidentId
            ? { ...incident, status: "Resolved" }
            : incident
        )
      );

      setIncidentNotifications((prev) =>
        prev.map((incident) =>
          incident.id === data.incidentId
            ? { ...incident, status: "Resolved" }
            : incident
        )
      );
    });

    return () => {
      socket.off("incidentNotification");
      socket.off("nearbyEmergencyAlert");
      socket.off("incidentHospitalResponse");
      socket.off("nearbyDriverWarning");
      socket.off("gpsUpdate");
      socket.off("clearAmbulanceWarning");
      socket.off("clearAmbulanceWarningAll");
      socket.off("newSOSAlertAdmin");
      socket.off("nearbyHospitalSOSAlert");
      socket.off("nearbyPoliceSOSAlert");
      socket.off("newRoadIncidentHospitalAlert");
      socket.off("nearbyPoliceRoadIncidentAlert");
      socket.off("roadIncidentNearbyWarning");
      socket.off("roadIncidentNearby");
      socket.off("sosNotification");
      socket.off("sosAlertShared");
      socket.off("officerNotification");
      socket.off("roadIncidentSharedWithDriver");
      socket.off("incidentResponse");
      socket.off("incidentResolved");
    };
  }, [user, warningPopupShown]);

  // Firebase Listeners for Road Incidents, Ambulance GPS, and Police Notifications
  useEffect(() => {
    if (!user || firebaseListenersInitialized) return;

    const unsubscribers = [];

    // === ROAD INCIDENTS LISTENER ===
    try {
      const liveRoadIncidentsQuery = query(
        collection(firestore, "liveRoadIncidents"),
        orderBy("createdAtServer", "desc")
      );

      const unsubRoadIncidents = onSnapshot(liveRoadIncidentsQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const incident = { id: change.doc.id, ...change.doc.data() };

          // Skip initial load to avoid alerting on pre-existing incidents
          if (!liveRoadIncidentsInitialLoadDone) return;

          // === Hospital Admins: newRoadIncidentHospitalAlert ===
          if (user.role === "hospital_admin" || user.role === "admin") {
            if (change.type === "added") {
              Alert.alert(
                "🚨 Road Incident Alert",
                `${incident.type}\n\n${incident.description}\n\nLocation: ${
                  incident.locationName || "Location not available"
                }`
              );
            }
          }

          // === Police Admins: nearbyPoliceRoadIncidentAlert ===
          if (user.role === "police_admin") {
            if (
              change.type === "added" &&
              incident.nearbyPoliceDepartments?.some(
                (pd) => Number(pd.policeDepartmentId) === Number(user.policeDepartmentId)
              )
            ) {
              const nearbyPD = incident.nearbyPoliceDepartments.find(
                (pd) => Number(pd.policeDepartmentId) === Number(user.policeDepartmentId)
              );

              Alert.alert(
                "🚨 Nearby Road Incident",
                `${incident.type || "Road incident"} reported nearby.\n\n${
                  incident.description || ""
                }\n\nDistance: ${nearbyPD?.distance || "N/A"} km`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Open Incidents",
                    onPress: () => setScreen("policeNearbyIncidents"),
                  },
                ]
              );
            }
          }

          // === Ambulance Drivers: roadIncidentNearbyWarning ===
          if (user.role === "ambulance_driver") {
            if (change.type === "added" && incident.nearbyHospitals) {
              Alert.alert(
                "🚨 Road Incident Nearby",
                `${incident.type}\n${incident.description}\n\nLocation: ${
                  incident.locationName || "Nearby area"
                }`
              );
              setScreen("gpsTracking");
            }
          }

          // === All Users: incidentResponse (status change to Responding) ===
          if (change.type === "modified" && change.doc.get("lastResponder")) {
            setNearbyIncidents((prev) =>
              prev.map((inc) =>
                inc.id === incident.id
                  ? {
                      ...incident,
                      respondingDriverId: change.doc.get("lastResponder")?.driverId,
                      respondingDriverName: change.doc.get("lastResponder")?.driverName,
                      status: "Responding",
                    }
                  : inc
              )
            );
          }

          // === All Users: incidentResolved ===
          if (change.type === "modified" && incident.status === "Resolved") {
            setNearbyIncidents((prev) =>
              prev.map((inc) =>
                inc.id === incident.id ? { ...incident, status: "Resolved" } : inc
              )
            );

            setIncidentNotifications((prev) =>
              prev.map((inc) =>
                inc.id === incident.id ? { ...incident, status: "Resolved" } : inc
              )
            );
          }
        });

        // Mark initial load as done after first snapshot
        if (!liveRoadIncidentsInitialLoadDone) {
          setLiveRoadIncidentsInitialLoadDone(true);
        }
      });

      unsubscribers.push(unsubRoadIncidents);
    } catch (error) {
      console.log("Firebase road incidents listener error:", error);
    }

    // === AMBULANCE GPS LOCATIONS LISTENER (Realtime Database) ===
    try {
      const gpsRef = ref(rtdb, "liveLocations");

      const unsubGPS = onValue(gpsRef, (snapshot) => {
        if (!snapshot.exists()) return;

        const locations = snapshot.val();

        // Check if this is an ambulance and user is tracking it
        Object.keys(locations).forEach((vehicleId) => {
          const location = locations[vehicleId];

          if (vehicleId === user.assignedVehicleId) {
            setGpsLocation(location);
          }
        });
      });

      unsubscribers.push(unsubGPS);
    } catch (error) {
      console.log("Firebase GPS listener error:", error);
    }

    // === SHARED ROAD INCIDENTS LISTENER ===
    try {
      if (user.role === "ambulance_driver") {
        const sharedIncidentsQuery = query(
          collection(firestore, "liveRoadIncidents"),
          where("sharedWith", "array-contains", user.id)
        );

        const unsubSharedIncidents = onSnapshot(
          sharedIncidentsQuery,
          (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === "added") {
                const incident = { id: change.doc.id, ...change.doc.data() };

                const sharedIncident = {
                  id: incident.id,
                  type: incident.type || "Road Incident",
                  description: incident.description || "No description",
                  locationName:
                    incident.locationName || "Location not available",
                  latitude: incident.latitude,
                  longitude: incident.longitude,
                  imageUrl: incident.imageUrl,
                  hospitalName: incident.lastSharedBy?.hospitalName || "Hospital",
                  hospitalPhone: incident.lastSharedBy?.phone || "Not provided",
                  message: "Road incident shared with you",
                };

                setSharedRoadIncidents((prev) => {
                  const exists = prev.some(
                    (item) => Number(item.id) === Number(sharedIncident.id)
                  );
                  return exists ? prev : [sharedIncident, ...prev];
                });

                Alert.alert(
                  "🚨 Shared Road Incident",
                  `${sharedIncident.hospitalName} shared a road incident with you.`,
                  [
                    {
                      text: "Open",
                      onPress: () => setScreen("sharedRoadIncidents"),
                    },
                    { text: "OK" },
                  ]
                );
              }
            });
          }
        );

        unsubscribers.push(unsubSharedIncidents);
      }
    } catch (error) {
      console.log("Firebase shared road incidents listener error:", error);
    }

    // === AMBULANCE TRIPS LISTENER (Firestore) ===
    try {
      const tripsQuery = query(
        collection(firestore, "liveAmbulanceTrips"),
        orderBy("createdAtServer", "desc")
      );

      const unsubTrips = onSnapshot(tripsQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const trip = { id: change.doc.id, ...change.doc.data() };

          // === ambulanceTripStarted ===
          if (change.type === "added") {
            if (user.role === "ambulance_driver" && user.assignedVehicleId === trip.ambulanceId) {
              Alert.alert(
                "🚑 Trip Started",
                `Trip ID: ${trip.id}\nFrom: ${trip.startLatitude}, ${trip.startLongitude}\nTo: ${trip.endLatitude}, ${trip.endLongitude}`,
                [
                  { text: "OK", onPress: () => setScreen("gpsTracking") }
                ]
              );
            }
          }

          // === ambulanceTripEnded / clearAmbulanceWarningAll ===
          if (change.type === "modified" && trip.status === "Completed") {
            if (user.role === "ambulance_driver" && user.assignedVehicleId === trip.ambulanceId) {
              Alert.alert(
                "🚑 Trip Completed",
                `Trip ID: ${trip.id} has been completed.`
              );
            }

            // Clear ambulance warning for all nearby drivers
            setAmbulanceWarning(null);
            setWarningPopupShown(false);
          }
        });
      });

      unsubscribers.push(unsubTrips);
    } catch (error) {
      console.log("Firebase ambulance trips listener error:", error);
    }

    // === ENHANCED GPS LISTENER FOR AMBULANCE WARNINGS ===
    // (Update the existing GPS listener or replace it with this enhanced version)
    try {
      const gpsRefEnhanced = ref(rtdb, "liveLocations");

      const unsubGPSEnhanced = onValue(gpsRefEnhanced, (snapshot) => {
        if (!snapshot.exists()) return;

        const locations = snapshot.val();

        // For the current user's vehicle
        if (user.assignedVehicleId && locations[user.assignedVehicleId]) {
          const userLocation = locations[user.assignedVehicleId];
          setGpsLocation(userLocation);

          // === nearbyEmergencyAlert / nearbyDriverWarning ===
          // Check for nearby ambulances
          if (user.role === "ambulance_driver" || user.role === "driver") {
            Object.keys(locations).forEach((vehicleId) => {
              if (vehicleId.startsWith("AMB") && vehicleId !== user.assignedVehicleId) {
                const ambulanceLocation = locations[vehicleId];

                // Calculate distance using Haversine
                const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
                  const R = 6371;
                  const dLat = ((lat2 - lat1) * Math.PI) / 180;
                  const dLon = ((lon2 - lon1) * Math.PI) / 180;
                  const a =
                    Math.sin(dLat / 2) ** 2 +
                    Math.cos((lat1 * Math.PI) / 180) *
                      Math.cos((lat2 * Math.PI) / 180) *
                      Math.sin(dLon / 2) ** 2;
                  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
                };

                const distance = calculateDistanceKm(
                  userLocation.latitude,
                  userLocation.longitude,
                  ambulanceLocation.latitude,
                  ambulanceLocation.longitude
                );

                // === clearAmbulanceWarning ===
                if (distance > 1) {
                  setAmbulanceWarning(null);
                  return;
                }

                // === nearbyDriverWarning ===
                if (distance <= 1) {
                  let status = "approaching";
                  let label = "Approaching";

                  if (distance > 1.2) {
                    status = "still_far";
                    label = "Still far";
                  } else if (distance > 0.5) {
                    status = "approaching";
                    label = "Approaching";
                  } else if (distance > 0.18) {
                    status = "near_driver";
                    label = "Near driver";
                  } else if (distance > 0.05) {
                    status = "at_driver_location";
                    label = "At driver location";
                  } else {
                    status = "passing_driver";
                    label = "Passing driver";
                  }

                  const warningMessage =
                    status === "still_far"
                      ? "Ambulance is still far away. Keep driving normally."
                      : status === "approaching"
                        ? "Ambulance is approaching. Stay alert and keep a safe distance."
                        : status === "near_driver"
                          ? "Ambulance is very near. Please give way carefully."
                          : status === "at_driver_location"
                            ? "Ambulance is at your exact location. Stop and give way."
                            : "Ambulance is passing your vehicle. Give way now.";

                  setAmbulanceWarning({
                    vehicleId: user.assignedVehicleId,
                    ambulanceId: vehicleId,
                    ambulanceLatitude: ambulanceLocation.latitude,
                    ambulanceLongitude: ambulanceLocation.longitude,
                    distance: distance.toFixed(2),
                    status,
                    label,
                    message: warningMessage,
                  });

                  if (!warningPopupShown) {
                    Alert.alert(
                      `🚑 ${label}`,
                      `${warningMessage}\n\nDistance: ${distance.toFixed(2)} km`
                    );
                    setWarningPopupShown(true);
                  }
                }
              }
            });
          }
        }
      });

      unsubscribers.push(unsubGPSEnhanced);
    } catch (error) {
      console.log("Firebase enhanced GPS listener error:", error);
    }

    // === POLICE OFFICER NOTIFICATIONS LISTENER (Firestore) ===
    try {
      if (user.role === "police_officer" || user.role === "police_admin") {
        const notificationsQuery = query(
          collection(firestore, "policeOfficerNotifications"),
          where("officerId", "==", user.id),
          orderBy("createdAtServer", "desc")
        );

        const unsubOfficerNotifications = onSnapshot(
          notificationsQuery,
          (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              const notification = {
                id: change.doc.id,
                ...change.doc.data(),
              };

              // === officerNotification (new incident or SOS alert) ===
              if (change.type === "added" && liveOfficerNotificationsInitialLoadDone) {
                if (notification.incidentId) {
                  Alert.alert(
                    "📍 New Incident Alert",
                    `${notification.message}\n\nLocation: ${notification.location || "Nearby"}`,
                    [
                      {
                        text: "View",
                        onPress: () => setScreen("policeNearbyIncidents"),
                      },
                      { text: "OK" },
                    ]
                  );

                  setOfficerIncidentAlerts((prev) => {
                    const exists = prev.some(
                      (item) => Number(item.id) === Number(notification.incidentId)
                    );
                    if (exists) return prev;

                    const updated = [
                      {
                        id: notification.incidentId,
                        type: notification.incidentType || "Incident",
                        message: notification.message,
                        latitude: notification.latitude,
                        longitude: notification.longitude,
                        location: notification.location,
                        createdAt: new Date().toISOString(),
                      },
                      ...prev,
                    ];

                    AsyncStorage.setItem(
                      `officerIncidentAlerts_${user.id}`,
                      JSON.stringify(updated)
                    );

                    return updated;
                  });
                }

                if (notification.sosId) {
                  Alert.alert(
                    "🆘 SOS Alert",
                    `${notification.message}`,
                    [
                      {
                        text: "View",
                        onPress: () => setScreen("sosAlerts"),
                      },
                      { text: "OK" },
                    ]
                  );

                  setOfficerSOSAlerts((prev) => {
                    const exists = prev.some(
                      (item) => Number(item.id) === Number(notification.sosId)
                    );
                    if (exists) return prev;

                    const updated = [
                      {
                        id: notification.sosId,
                        senderName: notification.senderName || "Unknown",
                        message: notification.message,
                        latitude: notification.latitude,
                        longitude: notification.longitude,
                        createdAt: new Date().toISOString(),
                      },
                      ...prev,
                    ];

                    AsyncStorage.setItem(
                      `officerSOSAlerts_${user.id}`,
                      JSON.stringify(updated)
                    );

                    return updated;
                  });
                }
              }
            });

            // Mark officer notifications loaded after first snapshot
            if (!liveOfficerNotificationsInitialLoadDone) {
              setLiveOfficerNotificationsInitialLoadDone(true);
            }
          }
        );

        unsubscribers.push(unsubOfficerNotifications);
      }
    } catch (error) {
      console.log("Firebase police officer notifications listener error:", error);
    }

    // === USER NOTIFICATIONS LISTENER (Firestore) ===
    try {
      userNotificationListenerStartedAt.current = Date.now();
      const notificationsQuery = query(
        collection(firestore, "userNotifications"),
        where("userId", "==", user.id),
        orderBy("createdAtServer", "desc")
      );

      const unsubUserNotifications = onSnapshot(
        notificationsQuery,
        (snapshot) => {
          const notifications = snapshot.docs.map((notificationDoc) => ({
            id: notificationDoc.id,
            ...notificationDoc.data(),
          }));
          setUserNotifications(notifications);

          snapshot.docChanges().forEach((change) => {
            const notification = { id: change.doc.id, ...change.doc.data() };
            const createdAt = notification.createdAt
              ? new Date(notification.createdAt).getTime()
              : null;
            const isRecentNotification =
              createdAt &&
              createdAt >= userNotificationListenerStartedAt.current - 10000;

            if (!liveUserNotificationsInitialLoadDone && !isRecentNotification) {
              return;
            }

            if (change.type === "added") {
              const buttons = [{ text: "OK" }];
              if (notification.title === "Rate your ride" && notification.rideRequestId) {
                buttons.unshift({
                  text: "Rate now",
                  onPress: () => {
                    setCurrentRideRequest(notification.rideRequestId);
                    setScreen("rideTracking");
                  },
                });
              }

              Alert.alert(
                notification.title || "Notification",
                notification.message || "You have a new update.",
                buttons
              );
            }
          });

          if (!liveUserNotificationsInitialLoadDone) {
            setLiveUserNotificationsInitialLoadDone(true);
          }
        }
      );

      unsubscribers.push(unsubUserNotifications);
    } catch (error) {
      console.log("Firebase user notifications listener error:", error);
    }

    // === SOS ALERTS LISTENER (Firestore) ===
    try {
      let sosQuery;

      if (user.role === "ambulance_driver") {
        sosQuery = query(
          collection(firestore, "liveSOSAlerts"),
          where("sharedWith", "array-contains", user.id),
          orderBy("createdAtServer", "desc")
        );
      } else if (
        ["admin", "hospital_admin", "police_admin", "police_officer"].includes(
          user.role
        )
      ) {
        sosQuery = query(
          collection(firestore, "liveSOSAlerts"),
          orderBy("createdAtServer", "desc")
        );
      }

      if (sosQuery) {
        const unsubSOS = onSnapshot(sosQuery, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            const sosAlert = { id: change.doc.id, ...change.doc.data() };

            if (!liveSOSAlertsInitialLoadDone) return;

            if (change.type === "added") {
              if (user.role === "admin") {
                playEmergencyAlarm();
                Alert.alert(
                  "🚨 EMERGENCY SOS ALERT",
                  `${sosAlert.senderName} needs help!\n\nRole: ${sosAlert.senderRole}\nVehicle: ${sosAlert.vehicleId || "N/A"}\nLocation: ${sosAlert.latitude}, ${sosAlert.longitude}`
                );
                setScreen("sosDashboard");
              }

              if (
                user.role === "hospital_admin" &&
                sosAlert.nearbyHospitals?.some(
                  (hospital) =>
                    Number(hospital.hospitalId) === Number(user.hospitalId)
                )
              ) {
                Alert.alert(
                  "🚨 Nearby Emergency SOS",
                  `${sosAlert.senderName} needs help nearby!\n\nDistance: ${sosAlert.nearbyHospitals.find(
                    (hospital) =>
                      Number(hospital.hospitalId) === Number(user.hospitalId)
                  )?.distance || "N/A"} km`,
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Open SOS Alerts", onPress: () => setScreen("sosDashboard") },
                  ]
                );
              }

              if (
                user.role === "police_admin" &&
                sosAlert.nearbyPoliceDepartments?.some(
                  (pd) =>
                    Number(pd.policeDepartmentId) ===
                    Number(user.policeDepartmentId)
                )
              ) {
                Alert.alert(
                  "🆘 Nearby SOS Emergency",
                  `${sosAlert.senderName || "A user"} needs help nearby.\n\nDistance: ${sosAlert.nearbyPoliceDepartments.find(
                    (pd) =>
                      Number(pd.policeDepartmentId) ===
                      Number(user.policeDepartmentId)
                  )?.distance || "N/A"} km`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Open SOS Alerts",
                      onPress: () => setScreen("policeSosAlerts"),
                    },
                  ]
                );
              }

              if (user.role === "ambulance_driver") {
                setSharedSOSAlerts((prev) => {
                  const exists = prev.some(
                    (item) => Number(item.id) === Number(sosAlert.id)
                  );
                  if (exists) return prev;

                  return [
                    {
                      id: sosAlert.id,
                      senderName: sosAlert.senderName || "Unknown",
                      latitude: sosAlert.latitude,
                      longitude: sosAlert.longitude,
                      message: sosAlert.message || "Emergency SOS alert shared with you",
                      senderPhone: sosAlert.senderPhone || "Not provided",
                      createdAt: sosAlert.createdAt || new Date().toISOString(),
                    },
                    ...prev,
                  ];
                });

                Alert.alert(
                  "🚨 Shared SOS Alert",
                  `${sosAlert.senderName || "A user"} needs help nearby.`,
                  [
                    { text: "Open", onPress: () => setScreen("sharedSOS") },
                    { text: "OK" },
                  ]
                );
              }
            }

            if (change.type === "modified") {
              if (
                ["police_officer", "police_admin"].includes(user.role) &&
                sosAlert.policeResponding
              ) {
                Alert.alert(
                  "🚔 Police Response",
                  `📍 Police from ${sosAlert.policeResponding.policeDepartmentName} is responding to an SOS alert.`
                );
              }

              if (user.id && sosAlert.userId === user.id && sosAlert.status === "Resolved") {
                Alert.alert(
                  "✅ SOS Resolved",
                  "Your SOS alert has been marked resolved."
                );
              }
            }
          });

          if (!liveSOSAlertsInitialLoadDone) {
            setLiveSOSAlertsInitialLoadDone(true);
          }
        });

        unsubscribers.push(unsubSOS);
      }
    } catch (error) {
      console.log("Firebase SOS alerts listener error:", error);
    }

    setFirebaseListenersInitialized(true);

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [user, firebaseListenersInitialized, liveRoadIncidentsInitialLoadDone, liveUserNotificationsInitialLoadDone]);

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setScreen("dashboard");
    setAmbulanceWarning(null);
    setGpsLocation(null);
    setWarningPopupShown(false);
    setSelectedIncident(null);
    setSelectedSosAlert(null);
    setCitizenTab("home");
    setUserNotifications([]);
  };

  const usesCitizenShell = Boolean(user);

  const handleCitizenTabChange = (tab) => {
    setCitizenTab(tab);
    setScreen("citizenTab");
  };

  useEffect(() => {
    const isRideDriver = Boolean(user?.isRideDriver || user?.rideDriverProfile?.id);
    if (!isRideDriver) return undefined;

    rideRequestNotificationsReady.current = false;
    const rideRequestsQuery = query(
      collection(firestore, "liveRideRequests"),
      orderBy("createdAtServer", "desc")
    );

    const unsubscribe = onSnapshot(rideRequestsQuery, (snapshot) => {
      if (!rideRequestNotificationsReady.current) {
        rideRequestNotificationsReady.current = true;
        return;
      }

      if (screen === "driverRideDashboard") return;

      snapshot.docChanges().forEach((change) => {
        if (change.type !== "added") return;
        const ride = change.doc.data();
        Alert.alert(
          "🚕 New Ride Request",
          `${ride.riderName || "A rider"} needs a ${ride.vehicleType || "ride"} from ${ride.pickupAddress || "pickup"}.`
        );
      });
    });

    return () => unsubscribe();
  }, [user, screen]);

  if (!user) {
    if (screen === "register") {
      return (
        <RegisterScreen
          setUser={setUser}
          setToken={setToken}
          setScreen={setScreen}
        />
      );
    }

    return (
      <LoginScreen
        setUser={setUser}
        setToken={setToken}
        setScreen={setScreen}
      />
    );
  }

  const renderScreen = () => {
    switch (screen) {
      case "dashboard":
        if (usesCitizenShell) {
          return (
            <CitizenHomeScreen
              user={user}
              setScreen={setScreen}
              nearbyIncidents={nearbyIncidents}
              sharedSOSAlerts={sharedSOSAlerts}
              onTabChange={handleCitizenTabChange}
            />
          );
        }
        return (
          <DashboardScreen
            user={user}
            ambulanceWarning={ambulanceWarning}
            setScreen={setScreen}
            handleLogout={handleLogout}
            sharedSOSAlerts={sharedSOSAlerts}
            nearbyIncidents={nearbyIncidents}
          />
        );

      case "citizenTab":
        if (citizenTab === "activities") {
          return <CitizenActivitiesScreen token={token} />;
        }
        if (citizenTab === "notifications") {
          return <CitizenNotificationsScreen notifications={userNotifications} />;
        }
        if (citizenTab === "account") {
          return <CitizenAccountScreen user={user} handleLogout={handleLogout} setScreen={setScreen} />;
        }
        return (
          <CitizenHomeScreen
            user={user}
            setScreen={setScreen}
            nearbyIncidents={nearbyIncidents}
            sharedSOSAlerts={sharedSOSAlerts}
            onTabChange={handleCitizenTabChange}
          />
        );

      case "helpSupport":
        return <HelpSupportScreen setScreen={setScreen} />;

      case "savedAddresses":
        return <SavedAddressesScreen token={token} setScreen={setScreen} />;

      case "payments":
        return <PaymentsScreen token={token} setScreen={setScreen} />;

      case "wallet":
        return (
          <WalletScreen
            token={token}
            role={user?.role}
            setScreen={setScreen}
            setCitizenTab={setCitizenTab}
          />
        );

      case "saveCard":
      case "addCard":
        return <AddCardScreen token={token} setScreen={setScreen} />;

      case "aboutUs":
        return <AboutUsScreen setScreen={setScreen} />;

      case "rideRequestDestination":
        return (
          <RideRequestScreen
            token={token}
            user={user}
            setScreen={setScreen}
            setCurrentRideRequest={setCurrentRideRequest}
            initialDestinationSearch
          />
        );

      case "policeOfficerDashboard":
        return (
          <PoliceOfficerDashboardScreen
            user={user}
            setScreen={setScreen}
            officerSOSAlerts={officerSOSAlerts}
            officerIncidentAlerts={officerIncidentAlerts}
          />
        );

      case "officerSOSAlerts":
        return (
          <OfficerSOSAlertsScreen
            alerts={officerSOSAlerts}
            setScreen={setScreen}
            setSelectedOfficerSOS={setSelectedOfficerSOS}
          />
        );

      case "officerIncidentAlerts":
        return (
          <OfficerIncidentAlertsScreen
            alerts={officerIncidentAlerts}
            setScreen={setScreen}
            setSelectedOfficerIncident={setSelectedOfficerIncident}
          />
        );

      case "officerSOSMap":
        return (
          <OfficerSOSMapScreen
            alert={selectedOfficerSOS}
            setScreen={setScreen}
            setOfficerTripDestination={setOfficerTripDestination}
          />
        );

      case "officerIncidentMap":
        return (
          <OfficerIncidentMapScreen
            incident={selectedOfficerIncident}
            setScreen={setScreen}
            setOfficerTripDestination={setOfficerTripDestination}
          />
        );

      case "officerTripTracking":
        return (
          <OfficerTripTrackingScreen
            destination={officerTripDestination}
            setScreen={setScreen}
          />
        );

      case "hospitalDashboard":
        return (
          <HospitalDashboardScreen
            token={token}
            user={user}
            setScreen={setScreen}
            nearbyIncidents={nearbyIncidents}
            setSelectedIncident={setSelectedIncident}
            setIncidentCallback={setIncidentCallbacks}
          />
        );

      case "hospitalCharts":
        return (
          <HospitalChartsScreen
            token={token}
            user={user}
            setScreen={setScreen}
          />
        );

      case "adminRegisterHospital":
        return (
          <AdminRegisterHospitalScreen
            token={token}
            setScreen={setScreen}
          />
        );

      case "adminRegisterPolice":
        return (
          <AdminRegisterPoliceScreen
            token={token}
            setScreen={setScreen}
          />
        );

      case "adminSystemOverview":
        return (
          <AdminSystemOverviewScreen
            token={token}
            user={user}
            setScreen={setScreen}
          />
        );

      case "adminDashboard":
        return (
          <AdminDashboardScreen
            token={token}
            user={user}
            setScreen={setScreen}
          />
        );

      case "rideRequest":
        return (
          <RideRequestScreen
            token={token}
            user={user}
            setScreen={setScreen}
            setCurrentRideRequest={setCurrentRideRequest}
          />
        );

      case "addCard":
        return <AddCardScreen setScreen={setScreen} />;

      case "rideSearching":
        return (
          <RideSearchingScreen
            token={token}
            user={user}
            setScreen={setScreen}
            currentRideRequest={currentRideRequest}
          />
        );

      case "rideTracking":
        return (
          <RideTrackingScreen
            token={token}
            user={user}
            setScreen={setScreen}
            currentRideRequest={currentRideRequest}
          />
        );

      case "driverRideDashboard":
        return (
          <DriverRideDashboardScreen
            token={token}
            user={user}
            setScreen={setScreen}
            activeScreen={screen}
            setSelectedRideRequest={setSelectedRideRequest}
          />
        );

      case "driverRideTracking":
        return (
          <DriverRideTrackingScreen
            token={token}
            user={user}
            rideRequest={selectedRideRequest}
            setScreen={setScreen}
          />
        );

      case "rideDriverRegistration":
        return (
          <RideDriverRegistrationScreen
            token={token}
            user={user}
            setScreen={setScreen}
          />
        );

      case "policeAdminDashboard":
        return (
          <PoliceAdminDashboardScreen
            user={user}
            token={token}
            setScreen={setScreen}
          />
        );

      case "policeDashboard":
        return (
          <PoliceDashboardScreen
            user={user}
            token={token}
            setScreen={setScreen}
          />
        );

      case "gpsTracking":
        return (
          <GPSTrackingScreen
            user={user}
            token={token}
            gpsLocation={gpsLocation}
            setGpsLocation={setGpsLocation}
            ambulanceWarning={ambulanceWarning}
            officerTripDestination={officerTripDestination}
          />
        );

      case "roadIncidents":
        return <RoadIncidentsScreen token={token} callbacks={incidentCallbacks} />;

      case "ambulanceWarnings":
        return <AmbulanceWarningsScreen ambulanceWarning={ambulanceWarning} />;

      case "ambulanceTrips":
        return <AmbulanceTripsScreen token={token} user={user} />;

      case "hospitalAmbulanceTrips":
        return (
          <HospitalAmbulanceTripsScreen
            token={token}
            user={user}
            setScreen={setScreen}
            setSelectedAmbulanceTrip={setSelectedAmbulanceTrip}
          />
        );

      case "hospitalAmbulanceTripMap":
        return (
          <HospitalAmbulanceTripMapScreen
            trip={selectedAmbulanceTrip}
            token={token}
            setScreen={setScreen}
          />
        );

      case "registerAmbulanceDriver":
        return <RegisterAmbulanceDriverScreen token={token} user={user} />;

      case "emergencySOS":
        return <EmergencySOSScreen token={token} user={user} />;

      case "sosDashboard":
        return (
          <SOSDashboardScreen
            token={token}
            user={user}
            setScreen={setScreen}
            setSelectedSosAlert={setSelectedSosAlert}
          />
        );

      case "sosMap":
      case "policeSosMap":
        return (
          <SOSMapScreen
            sosAlert={selectedSosAlert}
            setScreen={setScreen}
            token={token}
            user={user}
          />
        );

      case "sharedSOS":
        return (
          <SharedSOSAlertScreen
            sharedSOSAlerts={sharedSOSAlerts}
            setScreen={setScreen}
            token={token}
            user={user}
            setSharedSOSAlerts={setSharedSOSAlerts}
          />
        );

      case "sharedRoadIncidents":
        return (
          <SharedRoadIncidentsScreen
            incidents={sharedRoadIncidents}
            setScreen={setScreen}
            setSelectedSharedRoadIncident={setSelectedSharedRoadIncident}
            setOfficerTripDestination={setOfficerTripDestination}
          />
        );

      case "nearbyIncidents":
        return (
          <NearbyIncidentsScreen
            token={token}
            user={user}
            setScreen={setScreen}
            setSelectedIncident={setSelectedIncident}
            setIncidentCallback={setIncidentCallbacks}
          />
        );

      case "roadIncidentMap":
        return (
          <RoadIncidentMapScreen
            token={token}
            user={user}
            incident={selectedIncident}
            setScreen={setScreen}
          />
        );

      case "roadIncidentDetails":
        return (
          <RoadIncidentDetailsScreen
            token={token}
            user={user}
            setScreen={setScreen}
            selectedIncident={selectedIncident}
            setRespondingIncident={setRespondingIncident}
          />
        );

      case "respondingToIncident":
        return (
          <RespondingToIncidentScreen
            token={token}
            user={user}
            setScreen={setScreen}
            respondingIncident={respondingIncident}
            setNearbyIncidents={setNearbyIncidents}
          />
        );

      case "policeNearbyIncidents":
        return (
          <PoliceNearbyIncidentsScreen
            token={token}
            user={user}
            setScreen={setScreen}
            setSelectedIncident={setSelectedIncident}
            policeRespondedIncidents={policeRespondedIncidents}
            setPoliceRespondedIncidents={setPoliceRespondedIncidents}
          />
        );

      case "policeSosAlerts":
        return (
          <PoliceSosAlertsScreen
            token={token}
            user={user}
            setSelectedSosAlert={setSelectedSosAlert}
            setScreen={setScreen}
          />
        );

      case "registerPoliceOfficer":
        return (
          <RegisterPoliceOfficerScreen
            token={token}
            user={user}
            setScreen={setScreen}
          />
        );

      default:
        return (
          <DashboardScreen
            user={user}
            ambulanceWarning={ambulanceWarning}
            setScreen={setScreen}
            handleLogout={handleLogout}
            sharedSOSAlerts={sharedSOSAlerts}
            nearbyIncidents={nearbyIncidents}
          />
        );
    }
  };

  const isCitizenHomeSurface = usesCitizenShell && (screen === "dashboard" || screen === "citizenTab");

  if (isCitizenHomeSurface) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0F172A" }}>
        {renderScreen()}
        <CitizenTabBar activeTab={citizenTab} onChange={handleCitizenTabChange} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: 50, paddingBottom: 150 }}
    >
      <Image
        source={require("./assets/logo.png")}
        style={{
          width: 120,
          height: 120,
          alignSelf: "center",
          resizeMode: "contain",
        }}
      />

      {screen !== "dashboard" && (
        <TouchableOpacity
          style={{
            backgroundColor: "#374151",
            padding: 14,
            borderRadius: 12,
            alignItems: "center",
            marginTop: 20,
            marginBottom: 25,
            borderWidth: 2,
            borderColor: "#000000",
          }}
          onPress={() => setScreen("dashboard")}
        >
          <Text style={styles.buttonText}>← Back to Dashboard</Text>
        </TouchableOpacity>
      )}

      {renderScreen()}
    </ScrollView>
  );
}
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import styles from "../styles/styles";

function DashboardScreen({
  user,
  ambulanceWarning,
  setScreen,
  handleLogout,
  sharedSOSAlerts,
  nearbyIncidents,
}) {
  const isRiderAccount = Boolean(
    user?.role === "rider" ||
      user?.isRider ||
      user?.rideProfile?.id
  );

  return (
    <View style={{ paddingBottom: 120 }}>
      <View style={styles.card}>
        <Text style={styles.welcome}>Welcome {user.name}</Text>
        <Text style={styles.info}>Role: {user.role}</Text>
        <Text style={styles.info}>Email: {user.email}</Text>
        <Text style={styles.info}>
          Vehicle: {user.assignedVehicleId || "Not Assigned"}
        </Text>
      </View>

      {ambulanceWarning && (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>
            🚑 {ambulanceWarning.label || "Ambulance Approaching"}
          </Text>
          <Text style={styles.warningText}>
            Ambulance: {ambulanceWarning.ambulanceId}
          </Text>
          <Text style={styles.warningText}>
            Distance: {ambulanceWarning.distance} km
          </Text>
          <Text style={styles.warningText}>
            {ambulanceWarning.message || "Please give way safely."}
          </Text>
        </View>
      )}

      {user?.role !== "admin" && user?.role !== "driver" && user?.role !== "ambulance_driver" && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ride Booking</Text>
          {isRiderAccount && (
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setScreen("rideRequest")}
            >
              <Text style={styles.menuText}>🚕 Book a Ride</Text>
            </TouchableOpacity>
          )}

          {isRiderAccount && (
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setScreen("driverRideDashboard")}
            >
              <Text style={styles.menuText}>🚖 Ride Requests</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {user.role === "driver" && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Driver Dashboard</Text>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setScreen("gpsTracking")}
          >
            <Text style={styles.menuText}>🗺️ SafeZone Map</Text>
          </TouchableOpacity>
           <TouchableOpacity
  style={[
    styles.menuButton,
    { backgroundColor: "#DC2626" },
  ]}
  onPress={() => setScreen("emergencySOS")}
>
  <Text style={styles.menuText}>🚨 Emergency SOS</Text>
</TouchableOpacity>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setScreen("roadIncidents")}
          >
            <Text style={styles.menuText}>🚨 Road Incidents</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setScreen("ambulanceWarnings")}
          >
            <Text style={styles.menuText}>🚑 Ambulance Warnings</Text>
          </TouchableOpacity>
        </View>
      )}

      {user.role === "ambulance_driver" && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ambulance Driver Dashboard</Text>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setScreen("ambulanceTrips")}
          >
            <Text style={styles.menuText}>🚑 Ambulance Trips</Text>
          </TouchableOpacity>
          <TouchableOpacity
  style={[
    styles.menuButton,
    { backgroundColor: "#DC2626" },
  ]}
  onPress={() => setScreen("emergencySOS")}
>
  <Text style={styles.menuText}>🚨 Emergency SOS</Text>
</TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.menuButton,
              nearbyIncidents?.length > 0 && { backgroundColor: "#ff9800" },
            ]}
            onPress={() => setScreen("nearbyIncidents")}
          >
            <Text style={styles.menuText}>
              🚨 Nearby Incidents{" "}
              {nearbyIncidents?.length > 0 && `(${nearbyIncidents.length})`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
  style={styles.menuButton}
  onPress={() => setScreen("sharedRoadIncidents")}
>
  <Text style={styles.menuText}>
    🚨 Shared Road Incidents
  </Text>
</TouchableOpacity>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setScreen("roadIncidents")}
          >
            <Text style={styles.menuText}>🚨 Road Incidents</Text>
          </TouchableOpacity>
        </View>
      )}

      {user.role === "hospital_admin" && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Hospital Admin Dashboard</Text>
               <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setScreen("registerAmbulanceDriver")}
        >
          <Text style={styles.menuText}>
            🚑 Register Ambulance & Driver
          </Text>
        </TouchableOpacity>
          <TouchableOpacity
  style={[
    styles.menuButton,
    { backgroundColor: "#DC2626" },
  ]}
  onPress={() => setScreen("sosDashboard")}
>
  <Text style={styles.menuText}>🚨 Nearby SOS Alerts</Text>
</TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.menuButton,
              nearbyIncidents?.length > 0 && { backgroundColor: "#ff9800" },
            ]}
            onPress={() => setScreen("nearbyIncidents")}
          >
            <Text style={styles.menuText}>
              🚨 Nearby Incidents{" "}
              {nearbyIncidents?.length > 0 && `(${nearbyIncidents.length})`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setScreen("hospitalAmbulanceTrips")}
          >
            <Text style={styles.menuText}>🚑 Ambulance Trips</Text>
          </TouchableOpacity>
        </View>
      )}
      {user.role === "police_officer" && (
  <>
    <TouchableOpacity
      style={styles.menuButton}
      onPress={() => setScreen("officerSOSAlerts")}
    >
      <Text style={styles.menuText}>🆘 Shared SOS Alerts</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.menuButton}
      onPress={() => setScreen("officerIncidentAlerts")}
    >
      <Text style={styles.menuText}>⚠️ Shared Road Incidents</Text>
    </TouchableOpacity>
  </>
)}
      {user.role === "police" && (
  <View style={styles.card}>
    <Text style={styles.sectionTitle}>Police Dashboard</Text>

    <TouchableOpacity
      style={styles.menuButton}
      onPress={() => setScreen("roadIncidents")}
    >
      <Text style={styles.menuText}>🚨 Road Incidents</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.menuButton}
      onPress={() => setScreen("nearbyIncidents")}
    >
      <Text style={styles.menuText}>📍 Nearby Incidents</Text>
    </TouchableOpacity>
  </View>
)}
{user.role === "police_admin" && (
  <View style={styles.card}>
    <Text style={styles.sectionTitle}>Police Admin</Text>

    <TouchableOpacity
      style={styles.menuButton}
      onPress={() => setScreen("policeAdminDashboard")}
    >
      <Text style={styles.menuText}>👮 Police Admin Dashboard</Text>
    </TouchableOpacity>
  </View>
)}
      {user.role === "admin" && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Main Admin Dashboard</Text>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setScreen("adminRegisterHospital")}
          >
            <Text style={styles.menuText}>🏥 Register Hospital</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setScreen("adminRegisterPolice")}
          >
            <Text style={styles.menuText}>👮 Register Police Department</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setScreen("adminDashboard")}
          >
            <Text style={styles.menuText}>📊 Admin Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setScreen("adminSystemOverview")}
          >
            <Text style={styles.menuText}>📜 System Overview</Text>
          </TouchableOpacity>
        </View>
      )}

      {sharedSOSAlerts && sharedSOSAlerts.length > 0 && user.role === "ambulance_driver" && (
        <View style={[styles.card, { borderColor: "#DC2626", borderWidth: 2 }]}>
          <Text style={[styles.sectionTitle, { color: "#DC2626" }]}>
            🚨 Shared SOS Alerts
          </Text>
          <Text style={styles.info}>
            You have {sharedSOSAlerts.length} shared alert(s)
          </Text>
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: "#DC2626", marginTop: 10 }
            ]}
            onPress={() => setScreen("sharedSOS")}
          >
            <Text style={styles.buttonText}>View Alerts</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.logoutButton,
          {
            marginBottom: 80,
          },
        ]}
        onPress={handleLogout}
      >
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

export default DashboardScreen;
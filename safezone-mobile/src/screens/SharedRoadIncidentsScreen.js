import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import MapView, { Marker } from "react-native-maps";
import styles from "../styles/styles";

function SharedRoadIncidentsScreen({
  incidents = [],
  setScreen,
  setSelectedSharedRoadIncident,
  setOfficerTripDestination,
}) {
  // Sort incidents by newest first
  const sortedIncidents = (incidents || []).sort((a, b) => Number(b.id) - Number(a.id));
  
  const [selectedIncidentId, setSelectedIncidentId] = React.useState(
    sortedIncidents?.[0]?.id || null
  );

  React.useEffect(() => {
    if (sortedIncidents?.length > 0) {
      const firstIncident = sortedIncidents[0];
      setSelectedIncidentId(firstIncident.id);
      setOfficerTripDestination?.(firstIncident);
      setSelectedSharedRoadIncident?.(firstIncident);
    }
  }, [sortedIncidents, setOfficerTripDestination, setSelectedSharedRoadIncident]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚨 Shared Road Incidents</Text>
      <Text style={styles.info}>Count: {sortedIncidents.length}</Text>

      <ScrollView>
        {sortedIncidents.length === 0 ? (
          <Text style={styles.subtitle}>No shared road incidents</Text>
        ) : (
          sortedIncidents.map((incident) => {
            const lat = Number(incident.latitude);
            const lng = Number(incident.longitude);

            return (
              <View
                key={incident.id}
                style={[
                  styles.card,
                  {
                    backgroundColor:
                      selectedIncidentId === incident.id
                        ? "#111827"
                        : "#0f172a",
                    borderColor:
                      selectedIncidentId === incident.id
                        ? "#00bcd4"
                        : "#334155",
                    borderWidth: 1,
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() => {
                    setSelectedIncidentId(incident.id);
                    setOfficerTripDestination?.(incident);
                    setSelectedSharedRoadIncident?.(incident);
                  }}
                  style={{ marginBottom: 8 }}
                >
                  <Text style={styles.cardTitle}>
                    ⚠️ {incident.type || "Road Incident"}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.info}>
                  {incident.description || "No description"}
                </Text>

                <Text style={styles.info}>
                  📍 {incident.locationName || "Location not available"}
                </Text>

                <Text style={styles.info}>
                  🏥 Shared by: {incident.hospitalName || "Hospital"}
                </Text>

                <Text style={styles.info}>
                  📞 {incident.hospitalPhone || "Not provided"}
                </Text>

                {lat && lng ? (
                  <MapView
                    style={{ width: "100%", height: 250, marginTop: 10 }}
                    initialRegion={{
                      latitude: lat,
                      longitude: lng,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                  >
                    <Marker
                      coordinate={{ latitude: lat, longitude: lng }}
                      title={incident.type || "Road Incident"}
                      description={incident.locationName || "Incident Location"}
                    />
                  </MapView>
                ) : (
                  <Text style={styles.warningText}>
                    Location coordinates not available
                  </Text>
                )}

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: "#16a34a" }]}
                  onPress={() => {
                    setSelectedSharedRoadIncident?.(incident);
                    setOfficerTripDestination(incident);
                    setScreen("gpsTracking");
                  }}
                >
                  <Text style={styles.buttonText}>
                    🚑 Start Trip to Location
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

export default SharedRoadIncidentsScreen;
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import API from "../services/api";

const activityIcons = { ride: "🚕", incident: "⚠️", sos: "🚨" };

function CitizenActivitiesScreen({ token }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    API.get("/activities/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (active) setActivities(response.data.activities || []);
      })
      .catch((error) => console.log("Activity history error:", error.response?.data || error.message))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0F172A" }} contentContainerStyle={{ paddingTop: 68, paddingHorizontal: 18, paddingBottom: 110 }}>
      <Text style={{ color: "#F8FAFC", fontSize: 25, fontWeight: "800", marginBottom: 18 }}>Activities</Text>
      {loading && <ActivityIndicator color="#34D399" />}
      {!loading && activities.length === 0 && (
        <View style={{ backgroundColor: "#1E293B", borderRadius: 14, padding: 18, borderWidth: 1, borderColor: "#334155" }}>
          <Text style={{ color: "#CBD5E1" }}>Your ride, incident, and SOS activity will appear here.</Text>
        </View>
      )}
      {activities.map((activity) => (
        <View key={`${activity.kind}-${activity.id}`} style={{ backgroundColor: "#1E293B", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#334155" }}>
          <Text style={{ color: "#F8FAFC", fontSize: 15, fontWeight: "800" }}>{activityIcons[activity.kind] || "•"} {activity.title}</Text>
          <Text style={{ color: "#CBD5E1", marginTop: 7 }}>{activity.detail}</Text>
          <Text style={{ color: "#94A3B8", marginTop: 6 }}>Status: {activity.status || "Recorded"}</Text>
          {activity.occurredAt && <Text style={{ color: "#64748B", fontSize: 11, marginTop: 8 }}>{new Date(activity.occurredAt).toLocaleString()}</Text>}
        </View>
      ))}
    </ScrollView>
  );
}

export default CitizenActivitiesScreen;

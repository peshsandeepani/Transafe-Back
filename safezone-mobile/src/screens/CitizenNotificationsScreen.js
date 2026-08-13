import React, { useEffect, useRef } from "react";
import { Alert, ScrollView, Text, View } from "react-native";

function CitizenNotificationsScreen({ notifications = [] }) {
  const hasShownInitialNotificationAlert = useRef(false);

  useEffect(() => {
    if (hasShownInitialNotificationAlert.current) {
      return;
    }

    if (!notifications || notifications.length === 0) {
      return;
    }

    const latestNotification = notifications[0];
    if (!latestNotification) {
      return;
    }

    hasShownInitialNotificationAlert.current = true;

    Alert.alert(
      latestNotification.title || "Notification",
      latestNotification.message || "You have a new update.",
      [{ text: "OK" }]
    );
  }, [notifications]);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0F172A" }} contentContainerStyle={{ paddingTop: 68, paddingHorizontal: 18, paddingBottom: 110 }}>
      <Text style={{ color: "#F8FAFC", fontSize: 25, fontWeight: "800", marginBottom: 18 }}>Notifications</Text>
      {notifications.length === 0 ? (
        <View style={{ backgroundColor: "#1E293B", borderRadius: 14, padding: 18, borderWidth: 1, borderColor: "#334155" }}>
          <Text style={{ color: "#CBD5E1" }}>No notifications yet.</Text>
        </View>
      ) : notifications.map((notification) => (
        <View key={notification.id} style={{ backgroundColor: "#1E293B", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#334155" }}>
          <Text style={{ color: "#F8FAFC", fontSize: 15, fontWeight: "800" }}>{notification.title || "Notification"}</Text>
          <Text style={{ color: "#CBD5E1", marginTop: 7 }}>{notification.message || "You have a new update."}</Text>
          {notification.createdAt && <Text style={{ color: "#64748B", fontSize: 11, marginTop: 9 }}>{new Date(notification.createdAt?.toDate ? notification.createdAt.toDate() : notification.createdAt).toLocaleString()}</Text>}
        </View>
      ))}
    </ScrollView>
  );
}

export default CitizenNotificationsScreen;

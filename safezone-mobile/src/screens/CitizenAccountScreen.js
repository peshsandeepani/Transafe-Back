import React, { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import styles from "../styles/styles";

function CitizenAccountScreen({ user, handleLogout, setScreen }) {
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const isRideDriver = Boolean(user?.isRideDriver || user?.rideDriverProfile?.id);
  const isAdminUser = ["admin", "hospital_admin", "police_admin"].includes(
    user?.role
  );
  const isRiderAccount = Boolean(
    user?.role === "rider" ||
      user?.isRider ||
      user?.rideProfile?.id ||
      user?.hasRideHistory
  );
  const riderRating = Number(
    user?.rating ?? user?.averageRating ?? user?.riderRating ?? 4.8
  );

  useEffect(() => {
    if (!user || isAdminUser || isRideDriver || !isRiderAccount) return;
    setShowRatingPopup(true);
  }, [user, isAdminUser, isRideDriver, isRiderAccount]);

  const accountMenuItems = [
    { icon: "?", label: "Help and Support", screen: "helpSupport" },
    { icon: "ⓘ", label: "About Us", screen: "aboutUs" },
  ];

  const riderMenuItems = isAdminUser
    ? accountMenuItems
    : [
        { icon: "🎫", label: "Payment Methods", screen: "saveCard" },
        { icon: "⌖", label: "Saved Addresses", screen: "savedAddresses" },
        ...accountMenuItems,
      ];

  // Only rider accounts should see wallet and earnings + rider payment flows
  const menuItems = isRiderAccount
    ? [
        { icon: "👛", label: "Wallet & Earnings", screen: "wallet" },
        ...riderMenuItems,
      ]
    : isAdminUser
    ? [...accountMenuItems]
    : [
        { icon: "💳", label: "Payments", screen: "payments" },
        ...riderMenuItems,
      ];

  return (
    <>
      <Modal
        visible={showRatingPopup && !isAdminUser && !isRideDriver && isRiderAccount}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRatingPopup(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              width: "100%",
              backgroundColor: "#111827",
              borderRadius: 18,
              padding: 20,
              borderWidth: 1,
              borderColor: "#334155",
            }}
          >
            <Text style={{ color: "#F8FAFC", fontSize: 20, fontWeight: "800" }}>
              Your rider rating
            </Text>
            <Text style={{ color: "#A7F3D0", fontSize: 30, fontWeight: "800", marginTop: 12 }}>
              {riderRating.toFixed(1)} ⭐
            </Text>
            <Text style={{ color: "#CBD5E1", marginTop: 8 }}>
              Your SafeZone rider rating is updated and ready to view on your account.
            </Text>
            <TouchableOpacity
              style={{
                marginTop: 18,
                backgroundColor: "#2563EB",
                borderRadius: 10,
                paddingVertical: 12,
              }}
              onPress={() => setShowRatingPopup(false)}
            >
              <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView style={{ flex: 1, backgroundColor: "#0F172A" }} contentContainerStyle={{ paddingTop: 68, paddingHorizontal: 18, paddingBottom: 110 }}>
        <Text style={{ color: "#F8FAFC", fontSize: 25, fontWeight: "800", marginBottom: 18 }}>Account</Text>
        <View style={{ backgroundColor: "#1E293B", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#334155" }}>
          <Text style={{ color: "#F8FAFC", fontSize: 20, fontWeight: "800" }}>{user?.name}</Text>
          <Text style={{ color: "#CBD5E1", marginTop: 9 }}>{user?.email}</Text>
          <Text style={{ color: "#94A3B8", marginTop: 7 }}>Role: {user?.role}</Text>
          {user?.phone && <Text style={{ color: "#94A3B8", marginTop: 7 }}>Phone: {user.phone}</Text>}
          {!isAdminUser && !isRideDriver && isRiderAccount && (
            <View
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 12,
                backgroundColor: "#0B1220",
                borderWidth: 1,
                borderColor: "#334155",
              }}
            >
              <Text style={{ color: "#F8FAFC", fontWeight: "700" }}>Rider rating</Text>
              <Text style={{ color: "#FBBF24", fontSize: 20, fontWeight: "800", marginTop: 6 }}>
                ⭐ {riderRating.toFixed(1)} / 5
              </Text>
            </View>
          )}
        </View>
        <View style={{ marginTop: 18 }}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => setScreen(item.screen)}
              style={{ backgroundColor: "#1E293B", borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#334155" }}
            >
              <Text style={{ color: "#A7F3D0", fontSize: 22, width: 34, textAlign: "center" }}>{item.icon}</Text>
              <Text style={{ color: "#F8FAFC", fontSize: 15, fontWeight: "700", flex: 1 }}>{item.label}</Text>
              <Text style={{ color: "#94A3B8", fontSize: 24 }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={[styles.logoutButton, { marginTop: 24 }]} onPress={handleLogout}>
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

export default CitizenAccountScreen;

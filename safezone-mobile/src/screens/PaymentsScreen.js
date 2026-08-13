import React, { useEffect, useState } from "react";
import { Alert, ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import API from "../services/api";

function PaymentsScreen({ token, setScreen }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/payments/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => setPayments(response.data.payments || []))
      .catch((error) => Alert.alert("Unable to load payments", error.response?.data?.message || error.message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0F172A" }} contentContainerStyle={{ padding: 18, paddingBottom: 110 }}>
      <TouchableOpacity onPress={() => setScreen("citizenTab")} style={{ marginBottom: 18 }}>
        <Text style={{ color: "#60A5FA", fontWeight: "700" }}>‹ Back to Account</Text>
      </TouchableOpacity>
      <Text style={{ color: "#F8FAFC", fontSize: 25, fontWeight: "800", marginBottom: 8 }}>Payments</Text>
      {loading && <ActivityIndicator color="#34D399" />}
      {!loading && payments.length === 0 && <Text style={{ color: "#CBD5E1" }}>No ride payment history yet.</Text>}
      {payments.map((payment) => (
        <View key={payment.id} style={{ backgroundColor: "#1E293B", borderRadius: 14, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: "#334155" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: "#F8FAFC", fontWeight: "800" }}>Ride #{payment.id}</Text>
            <Text style={{ color: payment.paymentStatus === "completed" ? "#34D399" : "#FBBF24", fontWeight: "700" }}>{payment.paymentStatus || "pending"}</Text>
          </View>
          <Text style={{ color: "#CBD5E1", marginTop: 7 }}>{payment.pickupAddress || "Pickup"} → {payment.destinationAddress || "Destination"}</Text>
          <Text style={{ color: "#A7F3D0", marginTop: 7 }}>LKR {payment.finalFare || payment.fareEstimate || 0} · {payment.paymentMethod || "cash"}</Text>
          {payment.paymentProviderRef && <Text style={{ color: "#64748B", fontSize: 11, marginTop: 7 }}>PayHere reference: {payment.paymentProviderRef}</Text>}
        </View>
      ))}
    </ScrollView>
  );
}

export default PaymentsScreen;

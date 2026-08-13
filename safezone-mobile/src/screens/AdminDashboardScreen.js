import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { PieChart, BarChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import { collection, onSnapshot } from "firebase/firestore";

import API from "../services/api";
import { firestore } from "../services/firebase";
import styles from "../styles/styles";

function AdminDashboardScreen({ token, user, setScreen }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const sosSnapshotRef = useRef(null);
  const incidentSnapshotRef = useRef(null);

  const countSnapshot = (snapshot) => {
    const documents = snapshot.docs || [];

    const total = documents.length;
    const resolved = documents.reduce((acc, item) => {
      const data = typeof item.data === "function" ? item.data() : item.data;
      const status = String(data?.status || "").toLowerCase();

      return acc + (status === "resolved" ? 1 : 0);
    }, 0);

    return {
      total,
      resolved,
    };
  };

  const fetchStats = async () => {
    try {
      setLoading(true);

      const response = await API.get("/admin/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setStats(response.data);
    } catch (error) {
      console.log(error.response?.data || error.message);
      Alert.alert("Error", "Failed to load admin statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;

    fetchStats();

    const unsubscribeSOS = onSnapshot(
      collection(firestore, "liveSOSAlerts"),
      (snapshot) => {
        const nextCounts = countSnapshot(snapshot);

        if (!sosSnapshotRef.current) {
          sosSnapshotRef.current = nextCounts;
          return;
        }

        const previous = sosSnapshotRef.current;
        const deltaTotal = nextCounts.total - previous.total;
        const deltaResolved = nextCounts.resolved - previous.resolved;

        setStats((current) => {
          if (!current) return current;

          return {
            ...current,
            sos: {
              total: current.sos.total + deltaTotal,
              resolved: current.sos.resolved + deltaResolved,
            },
          };
        });

        sosSnapshotRef.current = nextCounts;
      },
      (error) => {
        console.log("liveSOSAlerts listener error:", error);
      }
    );

    const unsubscribeIncidents = onSnapshot(
      collection(firestore, "liveRoadIncidents"),
      (snapshot) => {
        const nextCounts = countSnapshot(snapshot);

        if (!incidentSnapshotRef.current) {
          incidentSnapshotRef.current = nextCounts;
          return;
        }

        const previous = incidentSnapshotRef.current;
        const deltaTotal = nextCounts.total - previous.total;
        const deltaResolved = nextCounts.resolved - previous.resolved;

        setStats((current) => {
          if (!current) return current;

          return {
            ...current,
            incidents: {
              total: current.incidents.total + deltaTotal,
              resolved: current.incidents.resolved + deltaResolved,
            },
          };
        });

        incidentSnapshotRef.current = nextCounts;
      },
      (error) => {
        console.log("liveRoadIncidents listener error:", error);
      }
    );

    return () => {
      unsubscribeSOS();
      unsubscribeIncidents();
    };
  }, [token]);

  if (loading || !stats) {
    return (
      <View style={{ flex: 1, paddingTop: 40, backgroundColor: "#111827" }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  const incidentResolved = stats.incidents.total
    ? Math.round((stats.incidents.resolved / stats.incidents.total) * 100)
    : 0;

  const sosResolved = stats.sos.total
    ? Math.round((stats.sos.resolved / stats.sos.total) * 100)
    : 0;

  const chartWidth = Dimensions.get("window").width - 46;

  const roadIncidentData = [
    {
      name: "Resolved",
      count: stats.incidents.resolved,
      color: "#10B981",
    },
    {
      name: "Active",
      count: Math.max(stats.incidents.total - stats.incidents.resolved, 0),
      color: "#FBBF24",
    },
  ];

  const sosData = [
    {
      name: "Resolved",
      count: stats.sos.resolved,
      color: "#10B981",
    },
    {
      name: "Active",
      count: Math.max(stats.sos.total - stats.sos.resolved, 0),
      color: "#DC2626",
    },
  ];

  return (
    <ScrollView style={{ paddingBottom: 90 }}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Admin Dashboard</Text>
        <Text style={styles.info}>Role: {user?.role}</Text>

        <View style={{ marginTop: 16, gap: 8 }}>
          <TouchableOpacity
            style={{
              backgroundColor: "#0F766E",
              padding: 12,
              borderRadius: 8,
              alignItems: "center",
            }}
            onPress={() => setScreen("adminRegisterHospital")}
          >
            <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "600" }}>
              🏥 Register Hospital
            </Text>
          </TouchableOpacity>
 
          <TouchableOpacity
            style={{
              backgroundColor: "#1E40AF",
              padding: 12,
              borderRadius: 8,
              alignItems: "center",
            }}
            onPress={() => setScreen("adminRegisterPolice")}
          >
            <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "600" }}>
              👮 Register Police Department
            </Text>
          </TouchableOpacity>
        </View>
 
        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>Ride Revenue Overview</Text>
          <Text style={styles.info}>
            Analyze the full rider income, driver earnings, and TranSafe platform fees from completed rides.
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 14 }}>
            <View style={{ backgroundColor: "#1E293B", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#334155", width: "48%", marginBottom: 10 }}>
              <Text style={{ color: "#94A3B8", fontSize: 12, fontWeight: "600" }}>
                Riders' full income
              </Text>
              <Text style={{ color: "#34D399", fontSize: 28, fontWeight: "800", marginTop: 10 }}>
                LKR {stats.totalRiderIncome || "0.00"}
              </Text>
            </View>

            <View style={{ backgroundColor: "#1E293B", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#334155", width: "48%", marginBottom: 10 }}>
              <Text style={{ color: "#94A3B8", fontSize: 12, fontWeight: "600" }}>
                Driver earnings
              </Text>
              <Text style={{ color: "#60A5FA", fontSize: 28, fontWeight: "800", marginTop: 10 }}>
                LKR {stats.totalDriverEarnings || "0.00"}
              </Text>
              <Text style={{ color: "#94A3B8", fontSize: 10, marginTop: 6 }}>
                Vehicle earnings for drivers from completed trips.
              </Text>
            </View>

            <View style={{ backgroundColor: "#1E293B", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#334155", width: "48%" }}>
              <Text style={{ color: "#94A3B8", fontSize: 12, fontWeight: "600" }}>
                TranSafe app earnings
              </Text>
              <Text style={{ color: "#34D399", fontSize: 28, fontWeight: "800", marginTop: 10 }}>
                LKR {stats.transafeFeeIncome || "0.00"}
              </Text>
            </View>
          </View>

          <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 12 }}>
            Chart analysis shows the split between riders' gross payments, driver earnings, and app fees.
          </Text>

          <BarChart
            data={{
              labels: ["Riders", "Drivers", "App"],
              datasets: [
                {
                  data: [
                    Number(stats.totalRiderIncome || 0),
                    Number(stats.totalDriverEarnings || 0),
                    Number(stats.transafeFeeIncome || 0),
                  ],
                },
              ],
            }}
            width={chartWidth}
            height={220}
            yAxisLabel="LKR "
            chartConfig={{
              backgroundColor: "#111827",
              backgroundGradientFrom: "#111827",
              backgroundGradientTo: "#111827",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255,255,255,${opacity})`,
              style: {
                borderRadius: 16,
              },
            }}
            style={{
              marginTop: 18,
              borderRadius: 16,
            }}
            fromZero
            showValuesOnTopOfBars
          />

          <View style={{ marginTop: 24 }}>
            <Text style={styles.sectionTitle}>Vehicle Earnings Breakdown</Text>
            <Text style={styles.info}>
              Compare completed ride income across Car, Bike, and Tuk Tuk vehicles.
            </Text>

            <View style={{ flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", marginTop: 14 }}>
              {[
                { label: "Car", type: "car" },
                { label: "Bike", type: "bike" },
                { label: "Tuk Tuk", type: "tuk_tuk" },
              ].map((vehicle) => (
                <View
                  key={vehicle.type}
                  style={{
                    backgroundColor: "#1E293B",
                    borderRadius: 16,
                    padding: 18,
                    borderWidth: 1,
                    borderColor: "#334155",
                    width: "30%",
                    marginBottom: 10,
                  }}
                >
                  <Text style={{ color: "#94A3B8", fontSize: 12, fontWeight: "600" }}>
                    {vehicle.label}
                  </Text>
                  <Text style={{ color: "#34D399", fontSize: 22, fontWeight: "800", marginTop: 10 }}>
                    LKR {stats.vehicleEarnings?.[vehicle.type]?.riderIncome || "0.00"}
                  </Text>
                  <Text style={{ color: "#94A3B8", fontSize: 10, marginTop: 6 }}>
                    Driver: LKR {stats.vehicleEarnings?.[vehicle.type]?.driverEarnings || "0.00"}
                  </Text>
                  <Text style={{ color: "#94A3B8", fontSize: 10 }}>
                    App: LKR {stats.vehicleEarnings?.[vehicle.type]?.appFee || "0.00"}
                  </Text>
                </View>
              ))}
            </View>

            <BarChart
              data={{
                labels: ["Car", "Bike", "Tuk Tuk"],
                datasets: [
                  {
                    data: [
                      Number(stats.vehicleEarnings?.car?.riderIncome || 0),
                      Number(stats.vehicleEarnings?.bike?.riderIncome || 0),
                      Number(stats.vehicleEarnings?.tuk_tuk?.riderIncome || 0),
                    ],
                  },
                ],
              }}
              width={chartWidth}
              height={220}
              yAxisLabel="LKR "
              chartConfig={{
                backgroundColor: "#111827",
                backgroundGradientFrom: "#111827",
                backgroundGradientTo: "#111827",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255,255,255,${opacity})`,
                style: {
                  borderRadius: 16,
                },
              }}
              style={{
                marginTop: 18,
                borderRadius: 16,
              }}
              fromZero
              showValuesOnTopOfBars
            />
          </View>
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>Road Incidents</Text>
          <Text style={styles.info}>
            Total: {stats.incidents.total} | Resolved: {stats.incidents.resolved} | {incidentResolved}% resolved
          </Text>

          <PieChart
            data={roadIncidentData}
            width={chartWidth}
            height={180}
            chartConfig={{
              backgroundColor: "#111827",
              backgroundGradientFrom: "#111827",
              backgroundGradientTo: "#111827",
              color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
              labelColor: (opacity = 1) => `rgba(255,255,255,${opacity})`,
            }}
            accessor="count"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>SOS Alerts</Text>
          <Text style={styles.info}>
            Total: {stats.sos.total} | Resolved: {stats.sos.resolved} | {sosResolved}% resolved
          </Text>

          <PieChart
            data={sosData}
            width={chartWidth}
            height={180}
            chartConfig={{
              backgroundColor: "#111827",
              backgroundGradientFrom: "#111827",
              backgroundGradientTo: "#111827",
              color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
              labelColor: (opacity = 1) => `rgba(255,255,255,${opacity})`,
            }}
            accessor="count"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>System Counts</Text>
          <Text style={styles.info}>Hospitals: {stats.hospitals}</Text>
          <Text style={styles.info}>Police Departments: {stats.policeDepartments}</Text>
          <Text style={styles.info}>Ambulance Drivers: {stats.drivers || 0}</Text>
          <Text style={styles.info}>Police Officers: {stats.officers || 0}</Text>
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>Resolution Summary</Text>
          <BarChart
            data={{
              labels: ["Incidents", "SOS"],
              datasets: [{
                data: [stats.incidents.resolved, stats.sos.resolved],
              }],
            }}
            width={chartWidth}
            height={250}
            yAxisLabel=""
            chartConfig={{
              backgroundColor: "#111827",
              backgroundGradientFrom: "#111827",
              backgroundGradientTo: "#111827",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
              labelColor: (opacity = 1) => `rgba(255,255,255,${opacity})`,
              propsForLabels: {
                fontSize: 12,
              },
              barPercentage: 0.8,
            }}
            verticalLabelRotation={0}
            fromZero
            showValuesOnTopOfBars
          />
        </View>
      </View>
    </ScrollView>
  );
}

export default AdminDashboardScreen;

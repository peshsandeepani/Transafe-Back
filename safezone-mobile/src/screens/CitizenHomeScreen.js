import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, Image, ImageBackground, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { getBaseUrl } from "../config/network";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

function CitizenHomeScreen({ user, setScreen, nearbyIncidents = [], sharedSOSAlerts = [], onTabChange }) {
  const isRiderAccount = Boolean(
    user?.role === "rider" ||
      user?.isRider ||
      user?.rideProfile?.id
  );
  const greeting = useMemo(() => getGreeting(), []);
  const commonFeatures = [
    { icon: "🚨", label: "SOS", screen: "emergencySOS" },
    { icon: "⚠️", label: "Report Incident", screen: "roadIncidents" },
    { icon: "📍", label: "Nearby Incidents", screen: "nearbyIncidents" },
    { icon: "🔔", label: "Notifications", tab: "notifications" },
    ...(user?.role !== "admin" && user?.role !== "police_admin" && user?.role !== "hospital_admin"
      ? [
          { icon: "🚕", label: "Rides", screen: "rideRequest" },
          { icon: "🗺️", label: "SafeZone Map", screen: "gpsTracking" },
        ]
      : []),
  ];
  const roleFeatures = {
    admin: [
      { icon: "🏥", label: "Register Hospital", screen: "adminRegisterHospital" },
      { icon: "👮", label: "Register Police Dept", screen: "adminRegisterPolice" },
      { icon: "📊", label: "Admin Dashboard", screen: "adminDashboard" },
      { icon: "📜", label: "System Overview", screen: "adminSystemOverview" },
    ],
    hospital_admin: [
      { icon: "📊", label: "Hospital Charts", screen: "hospitalCharts" },
      { icon: "🚨", label: "Nearby SOS Alerts", screen: "sosDashboard" },
      { icon: "🚑", label: "Ambulance Trips", screen: "hospitalAmbulanceTrips" },
      { icon: "🚑", label: "Register Driver", screen: "registerAmbulanceDriver" },
    ],
    police_admin: [
      { icon: "👮", label: "Police Dashboard", screen: "policeAdminDashboard" },
      { icon: "📊", label: "Police Charts", screen: "policeDashboard" },
      { icon: "👮‍♂️", label: "Register Officer", screen: "registerPoliceOfficer" },
      { icon: "🆘", label: "SOS Alerts", screen: "policeSosAlerts" },
    ],
    ambulance_driver: [
      { icon: "🆘", label: "Shared SOS", screen: "sharedSOS" },
      { icon: "⚠️", label: "Shared Incidents", screen: "sharedRoadIncidents" },
    ],
    police_officer: [
      { icon: "🆘", label: "Shared SOS", screen: "officerSOSAlerts" },
      { icon: "⚠️", label: "Shared Incidents", screen: "officerIncidentAlerts" },
    ],
  };
  const features = [
    ...commonFeatures,
    ...(roleFeatures[user?.role] || []),
    ...(isRiderAccount ? [{ icon: "🚖", label: "Ride Requests", screen: "rideRequest" }] : []),
    ...(sharedSOSAlerts.length > 0 ? [{ icon: "🆘", label: "Shared SOS", screen: "sharedSOS" }] : []),
  ].slice(0, 8);

  const BANNER_BASE_URL = `${getBaseUrl()}/uploads/incidents`;
  const carouselItemWidth = Dimensions.get("window").width - 28;
  const carouselItems = [
    {
      id: "ridebooking",
      uri: `${BANNER_BASE_URL}/ridebooking.jpeg`,
      screen: "rideRequest",
    },
    {
      id: "sosonboard",
      uri: `${BANNER_BASE_URL}/sosonboard.jpeg`,
      screen: "helpSupport",
    },
    {
      id: "discount",
      uri: `${BANNER_BASE_URL}/discount.jpeg`,
      screen: "rideRequest",
    },
  ];

  const safetyTipBanners = [
    {
      id: "safezone_map",
      uri: `${BANNER_BASE_URL}/safezone_map.jpeg`,
      title: "Check SafeZone Map before entering unfamiliar areas",
      subtitle: "Plan safer routes before you go.",
      screen: "gpsTracking",
    },
    {
      id: "incident_reporting",
      uri: `${BANNER_BASE_URL}/incident_reporting.jpeg`,
      title: "Report incidents — help keep the community safer",
      subtitle: "Your report alerts others nearby.",
      screen: "roadIncidents",
    },
    {
      id: "driver_rest",
      uri: `${BANNER_BASE_URL}/driver_rest.jpeg`,
      title: "Take a break every 2 hours — fatigue is a real risk",
      subtitle: "Stay sharp, stay safe on the road.",
      screen: "rideRequest",
    },
  ];

  const scrollViewRef = useRef(null);
  const safetyScrollViewRef = useRef(null);
  const mainScrollRef = useRef(null);
  const scrollOffsetRef = useRef(0);
  const safetyScrollOffsetRef = useRef(0);
  const safetySectionPositionRef = useRef(0);
  const autoScrollTimerRef = useRef(null);
  const bannerIndexRef = useRef(0);
  const safetyIndexRef = useRef(0);
  const bannerDirectionRef = useRef(1);
  const safetyDirectionRef = useRef(1);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [activeSafetyIndex, setActiveSafetyIndex] = useState(0);
  const [isSafetyVisible, setIsSafetyVisible] = useState(false);
  const [scrollPositionY, setScrollPositionY] = useState(0);

  const handleBannerScroll = (event) => {
    const offset = event.nativeEvent.contentOffset.x;
    scrollOffsetRef.current = offset;
    const index = Math.round(offset / carouselItemWidth);
    bannerIndexRef.current = index;
    setActiveBannerIndex(index);
  };

  const handleSafetyScroll = (event) => {
    const offset = event.nativeEvent.contentOffset.x;
    safetyScrollOffsetRef.current = offset;
    const index = Math.round(offset / carouselItemWidth);
    safetyIndexRef.current = index;
    setActiveSafetyIndex(index);
  };

  const handleBannerPress = (screen) => {
    setScreen(screen);
  };

  useEffect(() => {
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
    }

    autoScrollTimerRef.current = setInterval(() => {
      let nextBanner = bannerIndexRef.current + bannerDirectionRef.current;
      if (nextBanner >= carouselItems.length) {
        bannerDirectionRef.current = -1;
        nextBanner = carouselItems.length - 2;
      } else if (nextBanner < 0) {
        bannerDirectionRef.current = 1;
        nextBanner = 1;
      }
      bannerIndexRef.current = nextBanner;
      setActiveBannerIndex(nextBanner);
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: nextBanner * carouselItemWidth, animated: true });
      }

      if (isSafetyVisible) {
        let nextSafety = safetyIndexRef.current + safetyDirectionRef.current;
        if (nextSafety >= safetyTipBanners.length) {
          safetyDirectionRef.current = -1;
          nextSafety = safetyTipBanners.length - 2;
        } else if (nextSafety < 0) {
          safetyDirectionRef.current = 1;
          nextSafety = 1;
        }
        safetyIndexRef.current = nextSafety;
        setActiveSafetyIndex(nextSafety);
        if (safetyScrollViewRef.current) {
          safetyScrollViewRef.current.scrollTo({ x: nextSafety * carouselItemWidth, animated: true });
        }
      }
    }, 4200);

    return () => {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
        autoScrollTimerRef.current = null;
      }
    };
  }, [carouselItemWidth, carouselItems.length, safetyTipBanners.length, isSafetyVisible]);

  return (
    <ScrollView
      ref={mainScrollRef}
      style={{ flex: 1, backgroundColor: "#0F172A" }}
      contentContainerStyle={{ paddingTop: 68, paddingHorizontal: 14, paddingBottom: 82 }}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      scrollEventThrottle={16}
      onScroll={(event) => {
        const scrollY = event.nativeEvent.contentOffset.y;
        const windowHeight = Dimensions.get("window").height;
        if (
          !isSafetyVisible &&
          safetySectionPositionRef.current > 0 &&
          scrollY + windowHeight >= safetySectionPositionRef.current + 80
        ) {
          setIsSafetyVisible(true);
        }
      }}

    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
            <Image
              source={require("../../assets/logo.png")}
              style={{ width: 38, height: 38, resizeMode: "contain", marginRight: 8 }}
            />
            <Text style={{ color: "#F8FAFC", fontSize: 19, fontWeight: "800" }}>TranSafe</Text>
          </View>
          <Text style={{ color: "#F8FAFC", fontSize: 22, fontWeight: "800", marginTop: 3 }}>
            Hi {user?.name || "there"},
          </Text>
          <Text style={{ color: "#34D399", fontSize: 16, fontWeight: "700", marginTop: 1 }}>{greeting}!</Text>
        </View>
        <View style={{ backgroundColor: "#064E3B", borderRadius: 22, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: "#10B981" }}>
          <Text style={{ color: "#A7F3D0", fontWeight: "800", fontSize: 12 }}>{user?.role || "USER"}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={{ backgroundColor: "#1E293B", borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#334155", marginBottom: 14 }}
        onPress={() => setScreen("rideRequestDestination")}
      >
        <Text style={{ fontSize: 20, marginRight: 10 }}>⌕</Text>
        <Text style={{ color: "#94A3B8", fontSize: 15 }}>Search destination</Text>
      </TouchableOpacity>

      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
        {features.map((feature) => (
          <TouchableOpacity
            key={feature.label}
            style={{ width: "23.5%", height: 86, alignItems: "center", justifyContent: "center", backgroundColor: "#1E293B", borderRadius: 12, marginBottom: 8, padding: 5, borderWidth: 1, borderColor: "#334155" }}
            onPress={() => feature.tab ? onTabChange(feature.tab) : setScreen(feature.screen)}
          >
            <Text style={{ fontSize: 23 }}>{feature.icon}</Text>
            <Text style={{ color: "#E2E8F0", fontSize: 10, fontWeight: "700", textAlign: "center", marginTop: 5 }}>{feature.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ marginTop: 12, marginBottom: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={{ color: "#E2E8F0", fontSize: 14, fontWeight: "900", letterSpacing: 0.4 }}>Featured promotions</Text>
          <View style={{ backgroundColor: "rgba(56, 189, 248, 0.2)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 }}>
            <Text style={{ color: "#38BDF8", fontSize: 12, fontWeight: "800" }}>Swipe</Text>
          </View>
        </View>
        <View style={{ backgroundColor: "#0F1729", borderRadius: 18, height: 150, overflow: "hidden" }}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            scrollEventThrottle={16}
            onScroll={handleBannerScroll}
            contentContainerStyle={{ alignItems: "center" }}
          >
            {carouselItems.map((item, idx) => (
              <TouchableOpacity
                key={`${item.id}-${idx}`}
                activeOpacity={0.9}
                onPress={() => handleBannerPress(item.screen)}
                style={{ width: carouselItemWidth, height: 150, paddingHorizontal: 0 }}
              >
                <ImageBackground
                  source={{ uri: item.uri }}
                  style={{ width: carouselItemWidth, height: 150 }}
                  imageStyle={{ resizeMode: "cover" }}
                  onError={() => console.warn("Featured banner failed to load:", item.uri)}
                >
                  <View style={{
                    position: "absolute",
                    left: 12,
                    top: 12,
                    backgroundColor: "rgba(15, 23, 41, 0.85)",
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    borderRadius: 12,
                  }}>
                    <Text style={{ color: "#F8FAFC", fontSize: 11, fontWeight: "700" }}>
                      {item.id === "ridebooking" ? "New Feature" : item.id === "sosonboard" ? "SOS Tip" : "Limited Offer"}
                    </Text>
                  </View>
                  <View style={{
                    position: "absolute",
                    left: 12,
                    right: 12,
                    bottom: 12,
                    backgroundColor: "rgba(15, 23, 41, 0.82)",
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    borderRadius: 16,
                  }}>
                    <Text numberOfLines={2} style={{ color: "#F8FAFC", fontSize: 17, fontWeight: "900", lineHeight: 22 }}>
                      {item.id === "ridebooking"
                        ? "Ride booking is now live!"
                        : item.id === "sosonboard"
                        ? "Know the SOS button — here's how it works"
                        : "Get 20% OFF your next ride!"}
                    </Text>
                    <Text style={{ color: "#7DD3FC", fontSize: 12, fontWeight: "800", marginTop: 6 }}>
                      Tap to explore
                    </Text>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 8 }}>
          {carouselItems.map((item, idx) => (
            <View
              key={item.id}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: activeBannerIndex === idx ? "#38BDF8" : "rgba(255,255,255,0.25)",
                marginHorizontal: 4,
              }}
            />
          ))}
        </View>
      </View>

      <View
        onLayout={(event) => {
          safetySectionPositionRef.current = event.nativeEvent.layout.y;
        }}
        style={{ marginTop: 12, marginBottom: 18 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={{ color: "#E2E8F0", fontSize: 14, fontWeight: "900", letterSpacing: 0.4 }}>Safety reminders</Text>
          <View style={{ backgroundColor: "rgba(34, 197, 94, 0.18)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 }}>
            <Text style={{ color: "#22C55E", fontSize: 12, fontWeight: "800" }}>Stay alert</Text>
          </View>
        </View>
        <View style={{ backgroundColor: "#0F1729", borderRadius: 18, height: 150, overflow: "hidden" }}>
          <ScrollView
            ref={safetyScrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            scrollEventThrottle={16}
            onScroll={handleSafetyScroll}
            contentContainerStyle={{ alignItems: "center" }}
          >
            {safetyTipBanners.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.9}
                onPress={() => handleBannerPress(item.screen)}
                style={{ width: carouselItemWidth, height: 150, paddingHorizontal: 0 }}
              >
                <ImageBackground
                  source={{ uri: item.uri }}
                  style={{ width: carouselItemWidth, height: 150 }}
                  imageStyle={{ resizeMode: "cover" }}
                  onError={() => console.warn("Safety banner failed to load:", item.uri)}
                >
                  <View style={{
                    position: "absolute",
                    left: 12,
                    right: 12,
                    bottom: 12,
                    backgroundColor: "rgba(15, 23, 41, 0.85)",
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    borderRadius: 16,
                  }}>
                    <Text numberOfLines={2} style={{ color: "#F8FAFC", fontSize: 16, fontWeight: "800", lineHeight: 22 }}>
                      {item.title}
                    </Text>
                    <Text numberOfLines={1} style={{ color: "#A5F3FC", fontSize: 12, fontWeight: "700", marginTop: 6 }}>
                      {item.subtitle}
                    </Text>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 8 }}>
          {safetyTipBanners.map((item, idx) => (
            <View
              key={item.id}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: activeSafetyIndex === idx ? "#22C55E" : "rgba(255,255,255,0.25)",
                marginHorizontal: 4,
              }}
            />
          ))}
        </View>
      </View>

      {(nearbyIncidents.length > 0 || sharedSOSAlerts.length > 0) && (
        <View style={{ backgroundColor: "#172554", borderRadius: 12, padding: 11, marginTop: 14, borderWidth: 1, borderColor: "#2563EB" }}>
          <Text style={{ color: "#DBEAFE", fontSize: 14, fontWeight: "800" }}>Live safety update</Text>
          <Text style={{ color: "#BFDBFE", marginTop: 4, fontSize: 12 }}>
            {nearbyIncidents.length > 0
              ? `${nearbyIncidents.length} nearby incident${nearbyIncidents.length === 1 ? "" : "s"} available.`
              : `${sharedSOSAlerts.length} shared SOS alert${sharedSOSAlerts.length === 1 ? "" : "s"} need attention.`}
          </Text>
        </View>
      )}

    </ScrollView>
  );
}

export default CitizenHomeScreen;

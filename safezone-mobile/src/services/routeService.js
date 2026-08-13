import { ref, set, remove } from "firebase/database";
import { rtdb } from "./firebase";

export const getVehicleId = (user) => {
  if (!user) return null;
  return user.assignedVehicleId || `mobile_user_${user.id}`;
};

export const normalizeSpeed = (rawSpeed) => {
  if (rawSpeed == null || rawSpeed < 0) return null;
  return Math.round(rawSpeed * 3.6);
};

const getLiveLocationKeys = (user) => {
  if (!user) return [];

  const keys = new Set();
  if (user.assignedVehicleId) {
    keys.add(user.assignedVehicleId);
    keys.add(`vehicle_${user.assignedVehicleId}`);
  }
  if (user.id != null) {
    keys.add(`mobile_user_${user.id}`);
    keys.add(`${user.id}`);
    keys.add(`driver_${user.id}`);
    keys.add(`vehicle_${user.id}`);
  }

  return [...keys];
};

export const writeLiveLocation = async (user, location) => {
  try {
    const keys = getLiveLocationKeys(user);
    if (keys.length === 0 || !location) return;

    const payload = {
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      speed:
        location.speed != null && location.speed >= 0
          ? Math.max(0, Number(location.speed))
          : null,
      heading:
        location.heading != null && Number(location.heading) >= 0
          ? Number(location.heading)
          : null,
      updatedAt: new Date().toISOString(),
    };

    await Promise.all(
      keys.map((vehicleId) =>
        set(ref(rtdb, `liveLocations/${vehicleId}`), {
          vehicleId,
          ...payload,
        })
      )
    );
  } catch (error) {
    console.log("Firebase live location write failed:", error.message || error);
  }
};

export const clearLiveLocation = async (user) => {
  try {
    const keys = getLiveLocationKeys(user);
    if (keys.length === 0) return;

    await Promise.all(keys.map((vehicleId) => remove(ref(rtdb, `liveLocations/${vehicleId}`))));
  } catch (error) {
    console.log("Firebase live location clear failed:", error.message || error);
  }
};

export const fetchOSMRoutes = async (start, end) => {
  if (!start || !end) {
    throw new Error("Both start and end locations are required to fetch routes.");
  }

  const startLng = Number(start.longitude);
  const startLat = Number(start.latitude);
  const endLng = Number(end.longitude);
  const endLat = Number(end.latitude);

  const res = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?alternatives=3&geometries=geojson&overview=full`
  );

  const data = await res.json();
  const sortedRoutes = (data.routes || []).sort((a, b) => a.distance - b.distance);

  return sortedRoutes;
};

export const formatDistance = (meters) => {
  if (meters == null) return "N/A";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

export const formatDuration = (seconds) => {
  if (seconds == null || Number.isNaN(seconds)) return "N/A";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

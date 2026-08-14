import { io } from "socket.io-client";
import * as Device from "expo-device";
import { Platform } from "react-native";

// ─── TOGGLE THIS TO SWITCH ENVIRONMENTS ───
const USE_PRODUCTION = false; // true = Railway (production), false = local backend
// ────────────────────────────────────────

const LAN_IP = "172.20.10.9";
const ANDROID_EMULATOR_HOST = "10.0.2.2";
const PRODUCTION_URL = "https://transafe-back-production.up.railway.app";

const getBaseHost = () => {
  if (Platform.OS === "android" && !Device.isDevice) {
    return ANDROID_EMULATOR_HOST;
  }
  return LAN_IP;
};

const SOCKET_URL = USE_PRODUCTION
  ? PRODUCTION_URL
  : `http://${getBaseHost()}:5000`;

const socket = io(SOCKET_URL);

export default socket;
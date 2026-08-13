import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

const DEFAULT_HOSTS = [
  "172.20.10.1",
  "172.20.10.9",
  "192.168.137.1",
  "192.168.43.1",
  "192.168.8.1",
  "192.168.1.1",
  "192.168.0.1",
  "192.168.51.54",
  "10.0.2.2",
  "localhost",
];

const normalizeHost = (value) => {
  if (!value) return null;
  return String(value)
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .split(":")[0];
};

export const getConfiguredHost = () => {
  const envHost =
    process.env.EXPO_PUBLIC_API_HOST ||
    process.env.EXPO_PUBLIC_SERVER_HOST ||
    process.env.EXPO_PUBLIC_LAN_IP;

  const envValue = normalizeHost(envHost);
  if (envValue) {
    return envValue;
  }

  const expoHost = normalizeHost(Constants.expoConfig?.hostUri);
  if (expoHost && expoHost !== "localhost" && expoHost !== "127.0.0.1") {
    return expoHost;
  }

  if (Platform.OS === "android" && !Device.isDevice) {
    return "10.0.2.2";
  }

  if (Platform.OS === "ios" && !Device.isDevice) {
    return "localhost";
  }

  return DEFAULT_HOSTS.find((host) => host !== "localhost") || "localhost";
};

export const getBaseUrl = (suffix = "") => {
  const host = getConfiguredHost();
  return `http://${host}:5000${suffix}`;
};

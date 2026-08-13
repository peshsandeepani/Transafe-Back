import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyD3HopX-bB_5ni8EzTQ3GE1HmkvAPlOXig",
  authDomain: "transafe-1549f.firebaseapp.com",
  projectId: "transafe-1549f",
  storageBucket: "transafe-1549f.firebasestorage.app",
  messagingSenderId: "5326434186",
  appId: "1:5326434186:web:78c010031083408b75a273",
  measurementId: "G-9HZRGT9RCT",
  databaseURL: "https://transafe-1549f-default-rtdb.asia-southeast1.firebasedatabase.app",
};

// Prevent re-initializing the app on Fast Refresh / hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firestore -> used for SOS alerts & road incidents
export const firestore = getFirestore(app);

// Realtime Database -> used for live ambulance/driver GPS location
export const rtdb = getDatabase(app);

// Auth -> used for Google/Facebook social login
// Uses AsyncStorage so login state survives app restarts.
// Wrapped in try/catch because Fast Refresh can re-run this file,
// and Firebase Auth can only be initialized once per app instance.
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  auth = getAuth(app);
}
export { auth };

export default app;
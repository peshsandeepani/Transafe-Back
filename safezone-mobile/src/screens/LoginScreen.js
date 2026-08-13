import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
// TEMPORARILY DISABLED FOR EXPO GO / iOS DEV — google-signin
// TODO: Restore Google native module imports and Firebase credential exchange when the Google Sign-In dev-client path is ready again.
// import {
//   GoogleSignin,
//   statusCodes,
// } from "@react-native-google-signin/google-signin";
// import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";

import API from "../services/api";
// TEMPORARILY DISABLED FOR EXPO GO / iOS DEV — google-signin
// TODO: Restore Firebase Auth credential exchange only after the Google native module is back in the active runtime.
// import { auth } from "../services/firebase";
import styles from "../styles/styles";

function LoginScreen({ setUser, setToken, setScreen }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Validation Error", "Please enter email and password");
      return;
    }

    setLoading(true);

    try {
      const res = await API.post("/auth/login", {
        email,
        password,
      });

      setUser(res.data.user);
      setToken(res.data.token);
      setScreen("dashboard");
    } catch (error) {
      Alert.alert(
        "Login Failed",
        error.response?.data?.message || "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  // TEMPORARILY DISABLED FOR EXPO GO / iOS DEV — google-signin
  // TODO: Restore the complete Google native driver login handler when the Google Sign-In native module is re-enabled.
  // const handleGoogleSignIn = async () => {
  //   try {
  //     setLoading(true);
  //
  //     await GoogleSignin.hasPlayServices();
  //     const userInfo = await GoogleSignin.signIn();
  //
  //     const idToken =
  //       userInfo?.data?.idToken ||
  //       userInfo?.idToken ||
  //       userInfo?.user?.idToken;
  //
  //     if (!idToken) {
  //       Alert.alert("Google Sign-In Failed", "No Google ID token returned");
  //       return;
  //     }
  //
  //     const googleCredential = GoogleAuthProvider.credential(idToken);
  //     const firebaseUserCredential = await signInWithCredential(
  //       auth,
  //       googleCredential
  //     );
  //
  //     if (!firebaseUserCredential?.user?.email) {
  //       Alert.alert(
  //         "Google Sign-In Failed",
  //         "No verified Google email available"
  //       );
  //       return;
  //     }
  //
  //     const firebaseIdToken = await firebaseUserCredential.user.getIdToken();
  //
  //     const res = await API.post("/auth/google", {
  //       idToken: firebaseIdToken,
  //     });
  //
  //     setUser(res.data.user);
  //     setToken(res.data.token);
  //     setScreen("dashboard");
  //   } catch (error) {
  //     const errorMessage =
  //       error?.code === statusCodes.SIGN_IN_CANCELLED
  //         ? "Google sign-in was cancelled"
  //         : error?.response?.data?.message ||
  //           error?.message ||
  //           "Google Sign-In failed";
  //
  //     Alert.alert("Google Sign-In Failed", errorMessage);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#111827",
        justifyContent: "center",
        padding: 25,
      }}
    >
     <Image
  source={require("../../assets/logo.png")}
  style={{
    width: 230,
    height: 230,
    resizeMode: "contain",
    alignSelf: "center",
    marginBottom:-40,
    backgroundColor: "transparent",
  }}
/>
      <Text style={styles.title}>SafeZone Guardians</Text>
      <Text style={[styles.info, { marginBottom: 20, textAlign: "center" }]}>
        Safety on the Road
      </Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor="#9CA3AF"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!loading}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#9CA3AF"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.button, { opacity: loading ? 0.6 : 1 }]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Logging in..." : "Login"}
        </Text>
      </TouchableOpacity>

      {/* TEMPORARILY DISABLED FOR EXPO GO / iOS DEV — google-signin
          TODO: Restore the Google Sign-In button once the native module is compatible again.
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            <View style={{ flex: 1, height: 1, backgroundColor: "#475569" }} />
            <Text style={[styles.info, { marginHorizontal: 12, marginBottom: 0 }]}>or</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: "#475569" }} />
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: "#EA4335", opacity: loading ? 0.6 : 1 },
            ]}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Signing in..." : "Sign in with Google"}
            </Text>
          </TouchableOpacity>
      */}

      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 16 }}>
        <Text style={styles.info}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => setScreen("register")}> 
          <Text style={[styles.info, { color: "#3B82F6", fontWeight: "bold" }]}> 
            Register
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default LoginScreen;
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import API from "../services/api";
import styles from "../styles/styles";

function AddCardScreen({ token, setScreen, setRidePaymentSelection }) {
  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [loading, setLoading] = useState(false);

  const formatCardNumber = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 19);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiryDate = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  };

  const validateCard = () => {
    const cardDigits = cardNumber.replace(/\s/g, "");
    const [monthText, yearText] = expiryDate.split("/");
    const month = Number(monthText);
    const year = Number(yearText);
    const now = new Date();
    const currentYear = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;

    if (cardDigits.length < 13 || cardDigits.length > 19) {
      return "Enter a valid card number.";
    }

    if (!/^\d{2}\/\d{2}$/.test(expiryDate) || month < 1 || month > 12) {
      return "Enter expiry as MM/YY.";
    }

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return "The card expiry date has passed.";
    }

    if (!/^\d{3,4}$/.test(cvv)) {
      return "Enter a valid CVV.";
    }

    if (!cardholderName.trim()) {
      return "Enter the cardholder name.";
    }

    return null;
  };

  const handleSaveCard = async () => {
    const validationMessage = validateCard();

    if (validationMessage) {
      Alert.alert("Check card details", validationMessage);
      return;
    }

    setLoading(true);

    try {
      const response = await API.post(
        "/payments/methods",
        {
          cardNumber,
          expiryDate,
          cvv,
          cardholderName,
          setAsDefault: true,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        if (setRidePaymentSelection) {
          setRidePaymentSelection("card");
        }
        Alert.alert("Saved", "Your card has been saved for automatic ride payments.", [
          { text: "OK", onPress: () => setScreen("saveCard") },
        ]);
      } else {
        Alert.alert("Save failed", response.data.message || "Unable to save card.");
      }
    } catch (error) {
      console.error("Save card error:", error);
      Alert.alert(
        "Save failed",
        error.response?.data?.message || error.message || "Unable to save card."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
<TouchableOpacity style={styles.backButton} onPress={() => setScreen("saveCard")}> 
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Add Card</Text>
        <Text style={styles.subtitle}>
          Save your card securely for automatic ride payments. We store only a masked token and card summary.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Card number"
          placeholderTextColor="#94A3B8"
          value={cardNumber}
          onChangeText={(value) => setCardNumber(formatCardNumber(value))}
          keyboardType="number-pad"
          maxLength={23}
        />

        <TextInput
          style={styles.input}
          placeholder="Cardholder name"
          placeholderTextColor="#94A3B8"
          value={cardholderName}
          onChangeText={setCardholderName}
          autoCapitalize="words"
        />

        <View style={{ flexDirection: "row", gap: 12 }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="MM/YY"
            placeholderTextColor="#94A3B8"
            value={expiryDate}
            onChangeText={(value) => setExpiryDate(formatExpiryDate(value))}
            keyboardType="number-pad"
            maxLength={5}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="CVV"
            placeholderTextColor="#94A3B8"
            value={cvv}
            onChangeText={(value) => setCvv(value.replace(/\D/g, "").slice(0, 4))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, loading && { opacity: 0.6 }]}
          onPress={handleSaveCard}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? "Saving..." : "Save Card"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default AddCardScreen;

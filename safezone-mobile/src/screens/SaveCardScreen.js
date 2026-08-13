import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import API from "../services/api";

/**
 * SaveCardScreen - Add a credit/debit card for automatic ride payments
 * 
 * CRITICAL SECURITY IMPLEMENTATION:
 * - Raw card data (PAN, CVV, expiry) is NEVER entered in this app
 * - Instead, we use PayHere's tokenization service
 * - The PayHere SDK/widget handles raw card data securely
 * - We only receive and store the payhereToken returned by PayHere
 * - Our backend never touches raw card details
 * 
 * Flow:
 * 1. User taps "Add Card"
 * 2. Opens PayHere's tokenization UI (Android/iOS SDK or web component)
 * 3. PayHere handles card data securely, returns token
 * 4. We send token + masked details (last4, brand) to our backend
 * 5. Backend stores token, never raw card data
 * 6. Future charges use the token via PayHere API
 */
function SaveCardScreen({ token, setScreen, setCitizenTab }) {
  const [cardholderName, setCardholderName] = useState("");
  const [showPayHereUI, setShowPayHereUI] = useState(false);
  const [payhereToken, setPayhereToken] = useState(null);
  const [cardLast4, setCardLast4] = useState("");
  const [cardBrand, setCardBrand] = useState("");
  const [loading, setLoading] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingMethods, setLoadingMethods] = useState(true);

  const fetchPaymentMethods = async () => {
    try {
      setLoadingMethods(true);
      const response = await API.get("/payments/methods", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setPaymentMethods(response.data.methods || []);
      }
    } catch (error) {
      console.error("Load payment methods error:", error);
      Alert.alert("Error", "Unable to load saved cards.");
    } finally {
      setLoadingMethods(false);
    }
  };

  const navigateToAddCard = () => {
    setScreen("addCard");
  };

  const handleDeleteMethod = async (methodId) => {
    Alert.alert("Remove card", "Are you sure you want to remove this card?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await API.delete(`/payments/methods/${methodId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            fetchPaymentMethods();
          } catch (error) {
            console.error("Delete card error:", error);
            Alert.alert("Error", "Unable to remove card.");
          }
        },
      },
    ]);
  };

  const handleSetDefaultMethod = async (methodId) => {
    try {
      setLoading(true);
      await API.patch(`/payments/methods/${methodId}/set-default`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPaymentMethods();
    } catch (error) {
      console.error("Set default card error:", error);
      Alert.alert("Error", "Unable to update default card.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  /**
   * Simulate opening PayHere tokenization service
   * In production, this would integrate with PayHere's mobile SDK:
   * - Android: via native module or WebView
   * - iOS: via native bridge
   * 
   * The SDK would:
   * 1. Show secure card entry form
   * 2. Encrypt card data
   * 3. Send to PayHere tokenization endpoint
   * 4. Return a payhereToken (not card data)
   * 5. Return masked card info (last 4 digits, brand)
   */
  const openPayHereTokenizer = async () => {
    try {
      setShowPayHereUI(true);
      
      // STUB: Simulate PayHere tokenization response
      // In production, this would be the actual PayHere SDK response
      const simulatedTokenResponse = {
        // PayHere would return a real token like "cust_token_abc123xyz"
        token: `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        // PayHere provides masked card details
        last_four_digits: "4242",
        card_type: "Visa", // Visa, Mastercard, American Express, etc.
        recurring: true,
      };

      setPayhereToken(simulatedTokenResponse.token);
      setCardLast4(simulatedTokenResponse.last_four_digits);
      setCardBrand(simulatedTokenResponse.card_type);
      setShowPayHereUI(false);

      Alert.alert(
        "Card Tokenized",
        `Secured card ending in ${simulatedTokenResponse.last_four_digits}.\nTap "Save Card" to complete.`
      );
    } catch (error) {
      Alert.alert(
        "Tokenization Failed",
        error.message || "Unable to tokenize card. Please try again."
      );
      setShowPayHereUI(false);
    }
  };

  /**
   * Save tokenized card to backend
   * Only the token is sent, never raw card data
   */
  const handleSaveCard = async () => {
    // Validate
    if (!payhereToken) {
      Alert.alert("Error", "Please tokenize a card first");
      return;
    }

    if (!cardholderName.trim()) {
      Alert.alert("Error", "Cardholder name is required");
      return;
    }

    if (!cardLast4 || !cardBrand) {
      Alert.alert("Error", "Card details are incomplete");
      return;
    }

    setLoading(true);

    try {
      // Send only the token and masked card info to backend
      // Never send raw card data
      const response = await API.post(
        "/payments/methods",
        {
          payhereToken,
          cardLast4,
          cardBrand,
          setAsDefault,
          // Cardholder name is for display only, not required by PayHere
          cardholderName, // Optional, for our own records if needed
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        Alert.alert(
          "Success",
          `Card ending in ${cardLast4} has been saved securely.`
        );
        // Reset form
        setCardholderName("");
        setPayhereToken(null);
        setCardLast4("");
        setCardBrand("");
        // Return to account screen via citizenTab
        if (setCitizenTab) {
          setCitizenTab("account");
        }
        setScreen("citizenTab");
      } else {
        Alert.alert("Error", response.data.message || "Failed to save card");
      }
    } catch (error) {
      console.error("Save card error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || error.message || "Unable to save card"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0F172A" }}
      contentContainerStyle={{ padding: 18, paddingBottom: 110 }}
    >
      {/* Back Button */}
      <TouchableOpacity
        onPress={() => {
          if (setCitizenTab) {
            setCitizenTab("account");
          }
          setScreen("citizenTab");
        }}
        style={{ marginBottom: 18 }}
      >
        <Text style={{ color: "#60A5FA", fontWeight: "700" }}>
          ‹ Back to Account
        </Text>
      </TouchableOpacity>

      {/* Title */}
      <Text
        style={{
          color: "#F8FAFC",
          fontSize: 25,
          fontWeight: "800",
          marginBottom: 8,
        }}
      >
        Payment Methods
      </Text>

      {/* Saved Cards */}
      <View
        style={{
          backgroundColor: "#1E293B",
          borderRadius: 14,
          padding: 15,
          borderWidth: 1,
          borderColor: "#334155",
          marginBottom: 24,
        }}
      >
        <Text style={{ color: "#F8FAFC", fontWeight: "800", fontSize: 16, marginBottom: 12 }}>
          Saved Payment Methods
        </Text>
        {loadingMethods ? (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <ActivityIndicator color="#60A5FA" />
          </View>
        ) : paymentMethods.length === 0 ? (
          <Text style={{ color: "#94A3B8", lineHeight: 20 }}>
            No saved cards yet. Add a card below to charge rides automatically.
          </Text>
        ) : (
          paymentMethods.map((method) => (
            <View
              key={method.id}
              style={{
                backgroundColor: "#0F172A",
                borderRadius: 12,
                padding: 12,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: "#334155",
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ color: "#F8FAFC", fontWeight: "700" }}>
                  {method.cardBrand} ****{method.cardLast4}
                </Text>
                {method.isDefault && (
                  <Text style={{ color: "#34D399", fontWeight: "700" }}>Default</Text>
                )}
              </View>
              <Text style={{ color: "#94A3B8", fontSize: 12, marginBottom: 10 }}>
                Added {new Date(method.createdAt).toLocaleDateString()}
              </Text>
              <View style={{ flexDirection: "row" }}>
                {!method.isDefault && (
                  <TouchableOpacity
                    onPress={() => handleSetDefaultMethod(method.id)}
                    style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: "#2563EB", marginRight: 10 }}
                  >
                    <Text style={{ color: "#F8FAFC", fontWeight: "700", fontSize: 12 }}>
                      Set Default
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => handleDeleteMethod(method.id)}
                  style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: "#991B1B" }}
                >
                  <Text style={{ color: "#F8FAFC", fontWeight: "700", fontSize: 12 }}>
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity
          onPress={navigateToAddCard}
          style={{ marginTop: 10, alignSelf: "flex-start" }}
        >
          <Text style={{ color: "#60A5FA", fontWeight: "700" }}>
            + {paymentMethods.length > 0 ? "Add another card" : "Add your first card"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Security Info Box */}
      <View
        style={{
          backgroundColor: "#172554",
          borderRadius: 14,
          padding: 15,
          borderWidth: 1,
          borderColor: "#2563EB",
          marginBottom: 24,
        }}
      >
        <Text style={{ color: "#DBEAFE", fontWeight: "800" }}>
          🔒 Secure Payment
        </Text>
        <Text style={{ color: "#BFDBFE", lineHeight: 20, marginTop: 6 }}>
          Your card details are encrypted and tokenized by PayHere. We never
          store your card number, CVV, or expiry date.
        </Text>
      </View>

      {/* Cardholder Name Input */}
      <Text style={{ color: "#CBD5E1", fontWeight: "600", marginBottom: 6 }}>
        Cardholder Name
      </Text>
      <TextInput
        placeholder="John Doe"
        placeholderTextColor="#64748B"
        value={cardholderName}
        onChangeText={setCardholderName}
        editable={!loading}
        style={{
          backgroundColor: "#1E293B",
          color: "#F8FAFC",
          borderWidth: 1,
          borderColor: "#334155",
          borderRadius: 10,
          paddingHorizontal: 15,
          paddingVertical: 12,
          marginBottom: 20,
          fontWeight: "500",
        }}
      />

      {/* PayHere Tokenization Section */}
      <Text
        style={{
          color: "#CBD5E1",
          fontWeight: "600",
          marginBottom: 10,
          marginTop: 10,
        }}
      >
        Card Details
      </Text>

      {!payhereToken ? (
        <>
          <Text style={{ color: "#94A3B8", marginBottom: 12, lineHeight: 18 }}>
            Tap below to securely enter your card details. PayHere will
            tokenize your card information.
          </Text>

          <TouchableOpacity
            onPress={openPayHereTokenizer}
            disabled={loading || showPayHereUI}
            style={{
              backgroundColor: showPayHereUI ? "#334155" : "#2563EB",
              paddingVertical: 14,
              paddingHorizontal: 18,
              borderRadius: 10,
              alignItems: "center",
              marginBottom: 20,
              opacity: loading || showPayHereUI ? 0.6 : 1,
            }}
          >
            {showPayHereUI ? (
              <ActivityIndicator color="#60A5FA" />
            ) : (
              <Text
                style={{
                  color: "#F8FAFC",
                  fontWeight: "700",
                  fontSize: 15,
                }}
              >
                Open Card Entry (PayHere)
              </Text>
            )}
          </TouchableOpacity>

          <Text
            style={{
              color: "#64748B",
              fontSize: 12,
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            PayHere secures your card data. We receive only a token.
          </Text>
        </>
      ) : (
        <>
          {/* Card Info Display (Masked) */}
          <View
            style={{
              backgroundColor: "#1E293B",
              borderRadius: 10,
              padding: 15,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: "#334155",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <Text style={{ color: "#64748B", fontWeight: "500" }}>
                Card Brand
              </Text>
              <Text style={{ color: "#F8FAFC", fontWeight: "700" }}>
                {cardBrand}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <Text style={{ color: "#64748B", fontWeight: "500" }}>
                Card Number
              </Text>
              <Text style={{ color: "#F8FAFC", fontWeight: "700" }}>
                •••• •••• •••• {cardLast4}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <Text style={{ color: "#64748B", fontWeight: "500" }}>
                Token Status
              </Text>
              <Text style={{ color: "#34D399", fontWeight: "700" }}>
                ✓ Secured
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                setPayhereToken(null);
                setCardLast4("");
                setCardBrand("");
              }}
              style={{ marginTop: 10 }}
            >
              <Text style={{ color: "#60A5FA", fontWeight: "600" }}>
                Change Card
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Set as Default Toggle */}
      {payhereToken && (
        <TouchableOpacity
          onPress={() => setSetAsDefault(!setAsDefault)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 20,
            paddingHorizontal: 10,
            paddingVertical: 8,
          }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              borderWidth: 2,
              borderColor: "#2563EB",
              backgroundColor: setAsDefault ? "#2563EB" : "transparent",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            {setAsDefault && (
              <Text style={{ color: "#F8FAFC", fontWeight: "800" }}>✓</Text>
            )}
          </View>
          <Text style={{ color: "#CBD5E1", fontWeight: "500" }}>
            Set as default payment method
          </Text>
        </TouchableOpacity>
      )}

      {/* Save Button */}
      {payhereToken && (
        <TouchableOpacity
          onPress={handleSaveCard}
          disabled={loading}
          style={{
            backgroundColor: loading ? "#334155" : "#10B981",
            paddingVertical: 14,
            paddingHorizontal: 18,
            borderRadius: 10,
            alignItems: "center",
            marginBottom: 20,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#F8FAFC" />
          ) : (
            <Text
              style={{
                color: "#F8FAFC",
                fontWeight: "700",
                fontSize: 15,
              }}
            >
              Save Card Securely
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* Info Section */}
      <View style={{ marginTop: 20, marginBottom: 40 }}>
        <Text
          style={{
            color: "#CBD5E1",
            fontWeight: "600",
            marginBottom: 10,
            fontSize: 13,
          }}
        >
          💳 How It Works
        </Text>
        <Text
          style={{
            color: "#94A3B8",
            lineHeight: 18,
            fontSize: 13,
            marginBottom: 8,
          }}
        >
          1. PayHere encrypts your card securely
        </Text>
        <Text
          style={{
            color: "#94A3B8",
            lineHeight: 18,
            fontSize: 13,
            marginBottom: 8,
          }}
        >
          2. Your token is generated and returned
        </Text>
        <Text
          style={{
            color: "#94A3B8",
            lineHeight: 18,
            fontSize: 13,
            marginBottom: 8,
          }}
        >
          3. SafeZone stores only the token
        </Text>
        <Text
          style={{
            color: "#94A3B8",
            lineHeight: 18,
            fontSize: 13,
            marginBottom: 8,
          }}
        >
          4. Charges use your token, not your card number
        </Text>
        <Text
          style={{
            color: "#94A3B8",
            lineHeight: 18,
            fontSize: 13,
          }}
        >
          5. Your card details stay between you and PayHere
        </Text>
      </View>
    </ScrollView>
  );
}

export default SaveCardScreen;

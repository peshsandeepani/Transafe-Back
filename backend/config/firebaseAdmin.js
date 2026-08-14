const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getDatabase } = require("firebase-admin/database");
const { getAuth } = require("firebase-admin/auth");

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
} else {
  serviceAccount = require("../firebaseServiceAccountKey.json");
}

const app = initializeApp({
  credential: cert(serviceAccount),
  databaseURL:
    "https://transafe-1549f-default-rtdb.asia-southeast1.firebasedatabase.app",
});

const firestore = getFirestore(app);
const rtdb = getDatabase(app);
const auth = getAuth(app);

module.exports = { firestore, rtdb, FieldValue, auth };
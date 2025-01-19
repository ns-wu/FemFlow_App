// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getDatabase, ref, set, get } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDW5ARJrZPYLzL7Dvp4_HPPTKU2X6zTrmI",
  authDomain: "femflow-backend.firebaseapp.com",
  databaseURL: "https://femflow-backend-default-rtdb.firebaseio.com",
  projectId: "femflow-backend",
  storageBucket: "femflow-backend.firebasestorage.app",
  messagingSenderId: "1075337010614",
  appId: "1:1075337010614:web:17748e5a2c5ce59e19b517"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const database = getDatabase();

// Initialize anonymous auth when the app starts
signInAnonymously(auth).catch((error) => {
  console.error("Anonymous auth error:", error);
  alert("Failed to authenticate. Please refresh the page or try again.");
});

export function writeSensorData(data) {
  // Only proceed if we have an anonymous user
  if (auth.currentUser) {
    const sensorDataRef = ref(database, 'sensors/' + auth.currentUser.uid);
    return set(sensorDataRef, {
      timestamp: Date.now(),
      sensorValue: data
    });
  }
}

export function getSensorData() {
  if (auth.currentUser) {
    const sensorDataRef = ref(database, 'sensors/' + auth.currentUser.uid);
    return get(sensorDataRef);
  }
}

export { auth, database };
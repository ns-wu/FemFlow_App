import { signInWithGoogle, writeSensorData, getSensorData, auth } from './firebase.js';
import { connect, disconnect, setOnDataReceived } from './bluetooth.js';

// Get references to UI elements
const connectButton = document.getElementById('connect');
const disconnectButton = document.getElementById('disconnect');
const loginButton = document.getElementById('login');

// Set up event listeners
connectButton.addEventListener('click', connect);
disconnectButton.addEventListener('click', disconnect);
loginButton.addEventListener('click', handleLogin);

// Handle login
async function handleLogin() {
  try {
    const result = await signInWithGoogle();
    console.log('Logged in user:', result.user);
  } catch (error) {
    console.error('Login error:', error);
  }
}

// Handle received sensor data
setOnDataReceived(async (sensorReading) => {
  if (auth.currentUser) {
    try {
      await writeSensorData(auth.currentUser.uid, sensorReading);
      console.log('Sensor data saved to Firebase');
    } catch (error) {
      console.error('Error saving sensor data:', error);
    }
  }
});
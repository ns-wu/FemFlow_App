// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDW5ARJrZPYLzL7Dvp4_HPPTKU2X6zTrmI",
  authDomain: "femflow-backend.firebaseapp.com",
  databaseURL: "https://femflow-backend-default-rtdb.firebaseio.com",
  projectId: "femflow-backend",
  storageBucket: "femflow-backend.firebasestorage.app",
  messagingSenderId: "1075337010614",
  appId: "1:1075337010614:web:17748e5a2c5ce59e19b517"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

import { getAuth, signInWithPopup, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

const auth = getAuth();

// Sign in with Google
function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .then((result) => {
      const user = result.user;
      console.log('User signed in:', user);
    })
    .catch((error) => {
      console.error(error);
    });
}

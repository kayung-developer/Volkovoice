// frontend/src/api/firebase.js
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  setPersistence,
  browserLocalPersistence, // Persists session in browser's local storage
} from 'firebase/auth';

/**
 * -----------------------------------------------------------------------------
 * Production-Grade Firebase SDK Initialization
 * -----------------------------------------------------------------------------
 * This module centralizes Firebase configuration and services.
 */

// 1. Load Firebase configuration securely from environment variables.
// NEVER hardcode these values in your source code.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// 2. Validate that all required Firebase environment variables are present.
// This prevents runtime errors due to misconfiguration.
for (const key in firebaseConfig) {
  if (!firebaseConfig[key]) {
    throw new Error(`Missing Firebase config key in .env: VITE_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`);
  }
}

// 3. Initialize the Firebase app and export its services.
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 4. Set authentication persistence.
// `browserLocalPersistence` ensures the user stays signed in even after closing the tab/browser.
// This is the expected behavior for most modern web applications.
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Error setting auth persistence:", error);
  });

// 5. Export pre-configured authentication providers and functions for easy use across the app.
const googleProvider = new GoogleAuthProvider();

// A wrapper for Google sign-in to keep component logic clean.
const signInWithGoogle = () => {
  return signInWithPopup(auth, googleProvider);
};

// A wrapper for signing out.
const handleSignOut = () => {
  return signOut(auth);
};

// Export a function to listen for auth state changes, which is useful for top-level app components.
const onAuth = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export {
  auth,
  signInWithGoogle,
  handleSignOut,
  onAuth,
};
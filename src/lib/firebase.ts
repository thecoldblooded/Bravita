import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
let authInstance: ReturnType<typeof getAuth> | null = null;
const FIREBASE_AUTH_LANGUAGE_CODE = "tr";

export const getFirebaseAuth = (): ReturnType<typeof getAuth> => {
  if (!authInstance) {
    authInstance = getAuth(app);
  }

  // Re-apply before every caller creates reCAPTCHA or sends an OTP. Firebase
  // can otherwise keep the locale from an earlier auth consumer.
  authInstance.languageCode = FIREBASE_AUTH_LANGUAGE_CODE;
  return authInstance;
};

export { app };

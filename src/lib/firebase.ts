import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check"; // 1. App Check modüllerini ekleyin

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

// 2. App Check'i sadece tarayıcı ortamında (client-side) başlatın
if (typeof window !== "undefined") {
  // Geliştirme (development) ortamında test edebilmeniz için debug token desteği
  if (import.meta.env.DEV) {
    (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(
      import.meta.env.VITE_RECAPTCHA_SITE_KEY || "YOUR_RECAPTCHA_SITE_KEY"
    ),
    isTokenAutoRefreshEnabled: true, // Belirtecin otomatik yenilenmesini sağlar
  });
}

let authInstance: ReturnType<typeof getAuth> | null = null;
const FIREBASE_AUTH_LANGUAGE_CODE = "tr";

export const getFirebaseAuth = (): ReturnType<typeof getAuth> => {
  if (!authInstance) {
    authInstance = getAuth(app);
  }

  authInstance.languageCode = FIREBASE_AUTH_LANGUAGE_CODE;
  return authInstance;
};

export { app };

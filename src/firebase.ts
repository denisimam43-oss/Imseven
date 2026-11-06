// Koneksi Firebase (penyimpanan online + login per orang).
// Isi variabel VITE_FIREBASE_* di Vercel / file .env. Jika kosong, aplikasi berjalan
// dalam MODE LOKAL (data hanya di browser perangkat ini) -- lihat FIREBASE-SETUP.md.
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { initializeFirestore, type Firestore } from "firebase/firestore";

const env = import.meta.env;

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
};

export const firebaseEnabled = !!(config.apiKey && config.projectId && config.appId);

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

if (firebaseEnabled) {
  app = initializeApp(config);
  authInstance = getAuth(app);
  dbInstance = initializeFirestore(app, { ignoreUndefinedProperties: true });
}

export const auth = authInstance as Auth;
export const db = dbInstance as Firestore;

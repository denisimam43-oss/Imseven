// Koneksi Firebase (database online + login).
// Bila konfigurasi kosong, aplikasi tetap berjalan seperti dulu (data di browser saja).
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import {
  Firestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

// Isi dari Firebase Console -> Project settings -> Your apps -> SDK setup and configuration.
// Nilai ini bukan rahasia; keamanan data dijaga oleh Firestore Security Rules (firestore.rules).
export const firebaseConfig = {
  apiKey: "AIzaSyBTN80sBWsrOQV8lXYj-zAtbzYT-nTCb5o",
  authDomain: "gen-lang-client-0533211737.firebaseapp.com",
  projectId: "gen-lang-client-0533211737",
  storageBucket: "gen-lang-client-0533211737.firebasestorage.app",
  messagingSenderId: "838628917016",
  appId: "1:838628917016:web:f39e3fad7d2ce79cbf286d",
};

// Database khusus keuangan (terpisah dari database aplikasi lain di proyek yang sama)
export const FIRESTORE_DATABASE_ID = "seven-finance";

export const cloudEnabled = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

if (cloudEnabled) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  // Cache lokal: tetap bisa dibuka & mencatat saat sinyal putus, lalu tersinkron otomatis.
  db = initializeFirestore(
    app,
    { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) },
    FIRESTORE_DATABASE_ID,
  );
}

export { app, auth, db };

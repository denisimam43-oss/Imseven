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
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

export const cloudEnabled = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

if (cloudEnabled) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  // Cache lokal: tetap bisa dibuka & mencatat saat sinyal putus, lalu tersinkron otomatis.
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
}

export { app, auth, db };

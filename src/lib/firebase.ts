// Firebase configuration
import { initializeApp } from 'firebase/app';
import {
    initializeAuth,
    browserLocalPersistence,
    browserPopupRedirectResolver,
    GoogleAuthProvider
} from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCtMvL8jM87kvtmZafYhSju39xMFm9M_ZM",
    authDomain: "jadwal-pelajaran-idn.firebaseapp.com",
    projectId: "jadwal-pelajaran-idn",
    storageBucket: "jadwal-pelajaran-idn.appspot.com",
    messagingSenderId: "1037878545915",
    appId: "1:1037878545915:web:528924f8967d2fa886cf5e",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Explicit local persistence + popup resolver. Relying on getAuth() auto-detection
// can cause onAuthStateChanged to hydrate null in a freshly opened tab (window.open)
// before the IndexedDB/localStorage session is restored — a known Firebase bug on
// Safari/iPad — which made the admin-guarded /cetak/statistik redirect home.
export const auth = initializeAuth(app, {
    persistence: browserLocalPersistence,
    popupRedirectResolver: browserPopupRedirectResolver,
});

// Initialize Firestore with offline persistence
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});
export const googleProvider = new GoogleAuthProvider();

// App ID for database paths - preserved from original app
export const APP_ID = "default-app-id";

// Database path helper
export const getDbPath = (collection: string) =>
    `artifacts/${APP_ID}/public/data/${collection}`;

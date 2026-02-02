// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// App ID for database paths - preserved from original app
export const APP_ID = "default-app-id";

// Database path helper
export const getDbPath = (collection: string) =>
    `artifacts/${APP_ID}/public/data/${collection}`;

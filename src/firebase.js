/* =========================================================
   RAJASTHAN PYQ MASTER
   Firebase Configuration and Initialization
   ========================================================= */

import { initializeApp } from "firebase/app";

import {
    getAuth,
    GoogleAuthProvider,
    setPersistence,
    browserLocalPersistence
} from "firebase/auth";

import {
    getFirestore,
    enableIndexedDbPersistence
} from "firebase/firestore";

import {
    getStorage
} from "firebase/storage";

import {
    getAnalytics,
    isSupported
} from "firebase/analytics";

/* ---------- 1. FIREBASE CONFIGURATION ---------- */

// Firebase की जानकारी .env फाइल से आएगी।

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

/* ---------- 2. CONFIGURATION VALIDATION ---------- */

const requiredConfig = [
    "apiKey",
    "authDomain",
    "projectId",
    "appId"
];

const missingConfig = requiredConfig.filter(
    key => !firebaseConfig[key]
);

if (missingConfig.length > 0) {
    throw new Error(
        `Firebase configuration missing: ${missingConfig.join(", ")}`
    );
}

/* ---------- 3. INITIALIZE FIREBASE ---------- */

const app = initializeApp(firebaseConfig);

/* ---------- 4. FIREBASE AUTHENTICATION ---------- */

const auth = getAuth(app);

// Google Login Provider
const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
    prompt: "select_account"
});

// Login session browser में persist करने की कोशिश।
const authPersistenceReady = setPersistence(
    auth,
    browserLocalPersistence
);

/* ---------- 5. FIRESTORE DATABASE ---------- */

const db = getFirestore(app);

// Offline persistence.
// यदि किसी दूसरे tab में पहले से persistence enabled है,
// तो उस स्थिति को सुरक्षित रूप से संभालेंगे।

let offlinePersistenceEnabled = false;

const offlinePersistenceReady = enableIndexedDbPersistence(db)
    .then(() => {
        offlinePersistenceEnabled = true;
        return true;
    })
    .catch(error => {
        if (
            error.code === "failed-precondition" ||
            error.code === "unimplemented"
        ) {
            console.warn(
                "Firestore offline persistence unavailable:",
                error.code
            );

            return false;
        }

        console.error(
            "Firestore persistence error:",
            error
        );

        return false;
    });

/* ---------- 6. FIREBASE STORAGE ---------- */

const storage = getStorage(app);

/* ---------- 7. FIREBASE ANALYTICS ---------- */

// Analytics केवल supported browser environment में initialize होगा।

let analytics = null;

const analyticsReady = isSupported()
    .then(supported => {
        if (supported) {
            analytics = getAnalytics(app);
        }

        return analytics;
    })
    .catch(error => {
        console.warn(
            "Firebase Analytics unavailable:",
            error
        );

        return null;
    });

/* ---------- 8. EXPORT FIREBASE SERVICES ---------- */

export {
    app,
    auth,
    db,
    storage,

    googleProvider,

    authPersistenceReady,
    offlinePersistenceReady,
    analyticsReady,

    getAnalyticsInstance: () => analytics,

    isOfflinePersistenceEnabled: () => offlinePersistenceEnabled
};

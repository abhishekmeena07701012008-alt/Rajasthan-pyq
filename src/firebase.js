/* =========================================================
   RAJASTHAN PYQ MASTER
   Firebase Configuration
   File: src/firebase.js
   ========================================================= */

import { initializeApp } from "firebase/app";

import {
    getAuth,
    GoogleAuthProvider,
    setPersistence,
    browserLocalPersistence
} from "firebase/auth";

import {
    getFirestore
} from "firebase/firestore";

import {
    getStorage
} from "firebase/storage";

import {
    getFunctions
} from "firebase/functions";

import {
    getAnalytics,
    isSupported
} from "firebase/analytics";


/* =========================================================
   1. FIREBASE CONFIGURATION
   ========================================================= */

const firebaseConfig = {

    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,

    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,

    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,

    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,

    messagingSenderId:
        import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,

    appId: import.meta.env.VITE_FIREBASE_APP_ID,

    measurementId:
        import.meta.env.VITE_FIREBASE_MEASUREMENT_ID

};


/* =========================================================
   2. CONFIGURATION VALIDATION
   ========================================================= */

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


/* =========================================================
   3. INITIALIZE FIREBASE
   ========================================================= */

const app = initializeApp(firebaseConfig);


/* =========================================================
   4. FIREBASE AUTHENTICATION
   ========================================================= */

const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
    prompt: "select_account"
});

const authPersistenceReady = setPersistence(
    auth,
    browserLocalPersistence
).catch(error => {

    console.error(
        "Firebase Auth Persistence Error:",
        error
    );

    throw error;

});


/* =========================================================
   5. FIRESTORE DATABASE
   ========================================================= */

// Firestore Offline Persistence जानबूझकर Enable नहीं है।

const db = getFirestore(app);


/* =========================================================
   6. FIREBASE STORAGE
   ========================================================= */

const storage = getStorage(app);


/* =========================================================
   7. FIREBASE CLOUD FUNCTIONS
   ========================================================= */

// सभी Cloud Functions का Region

const functions = getFunctions(
    app,
    "asia-south1"
);


/* =========================================================
   8. FIREBASE ANALYTICS
   ========================================================= */

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


/* =========================================================
   9. ANALYTICS HELPER
   ========================================================= */

const getAnalyticsInstance = () => analytics;


/* =========================================================
   10. OFFLINE PERSISTENCE STATUS
   ========================================================= */

const offlinePersistenceReady = Promise.resolve(false);

const isOfflinePersistenceEnabled = () => false;


/* =========================================================
   11. EXPORT FIREBASE SERVICES
   ========================================================= */

export {

    app,

    auth,

    db,

    storage,

    functions,

    googleProvider,

    authPersistenceReady,

    offlinePersistenceReady,

    analyticsReady,

    getAnalyticsInstance,

    isOfflinePersistenceEnabled

};

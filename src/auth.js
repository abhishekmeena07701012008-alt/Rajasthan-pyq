// ============================================
// RAJASTHAN PYQ MASTER
// Authentication System
// File: src/auth.js
// ============================================

import {
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider
} from "firebase/auth";

import {
    auth,
    googleProvider,
    authPersistenceReady
} from "./firebase.js";

// ============================================
// AUTH ERROR HANDLER
// ============================================

function getAuthErrorMessage(error) {
    const messages = {
        "auth/popup-closed-by-user":
            "आपने Google Login विंडो बंद कर दी।",

        "auth/popup-blocked":
            "ब्राउज़र ने Login Popup ब्लॉक कर दिया।",

        "auth/cancelled-popup-request":
            "Login प्रक्रिया रद्द कर दी गई।",

        "auth/unauthorized-domain":
            "यह डोमेन Firebase Authentication में अधिकृत नहीं है।",

        "auth/network-request-failed":
            "इंटरनेट कनेक्शन चेक करें।",

        "auth/too-many-requests":
            "बहुत अधिक प्रयास हुए हैं। थोड़ी देर बाद कोशिश करें।",

        "auth/account-exists-with-different-credential":
            "इस ईमेल से पहले किसी दूसरे Login तरीके का उपयोग हुआ है।"
    };

    return messages[error?.code] ||
        error?.message ||
        "Login करते समय कोई समस्या आई।";
}

// ============================================
// GOOGLE LOGIN
// ============================================

export async function loginWithGoogle() {
    try {
        await authPersistenceReady;

        googleProvider.setCustomParameters({
            prompt: "select_account"
        });

        const result = await signInWithPopup(
            auth,
            googleProvider
        );

        const user = result.user;

        return {
            success: true,
            user: {
                uid: user.uid,
                name: user.displayName || "Student",
                email: user.email,
                photoURL: user.photoURL || "",
                emailVerified: user.emailVerified
            }
        };

    } catch (error) {
        console.error("Google Login Error:", error);

        return {
            success: false,
            message: getAuthErrorMessage(error),
            code: error.code || "unknown"
        };
    }
}

// ============================================
// LOGOUT
// ============================================

export async function logoutUser() {
    try {
        await signOut(auth);

        return {
            success: true,
            message: "आप सफलतापूर्वक Logout हो गए हैं।"
        };

    } catch (error) {
        console.error("Logout Error:", error);

        return {
            success: false,
            message: getAuthErrorMessage(error)
        };
    }
}

// ============================================
// AUTH STATE LISTENER
// ============================================

export function observeAuthState(callback) {
    if (typeof callback !== "function") {
        throw new Error(
            "observeAuthState में callback function देना जरूरी है।"
        );
    }

    return onAuthStateChanged(
        auth,
        (user) => {
            if (user) {
                callback({
                    loggedIn: true,
                    user: {
                        uid: user.uid,
                        name: user.displayName || "Student",
                        email: user.email,
                        photoURL: user.photoURL || "",
                        emailVerified: user.emailVerified
                    }
                });
            } else {
                callback({
                    loggedIn: false,
                    user: null
                });
            }
        },
        (error) => {
            console.error("Auth State Error:", error);

            callback({
                loggedIn: false,
                user: null,
                error: getAuthErrorMessage(error)
            });
        }
    );
}

// ============================================
// CURRENT USER
// ============================================

export function getCurrentUser() {
    const user = auth.currentUser;

    if (!user) {
        return null;
    }

    return {
        uid: user.uid,
        name: user.displayName || "Student",
        email: user.email,
        photoURL: user.photoURL || "",
        emailVerified: user.emailVerified
    };
}

// ============================================
// CHECK LOGIN STATUS
// ============================================

export function isUserLoggedIn() {
    return Boolean(auth.currentUser);
}

// ============================================
// AUTH READY
// ============================================

export async function waitForAuthReady() {
    try {
        await authPersistenceReady;
        return true;
    } catch (error) {
        console.error("Auth Persistence Error:", error);
        return false;
    }
}

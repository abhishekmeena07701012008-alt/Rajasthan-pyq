// src/notifications.js

import {
    getMessaging,
    getToken,
    onMessage,
    isSupported
} from "firebase/messaging";

import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    doc,
    updateDoc,
    serverTimestamp,
    setDoc,
    arrayUnion
} from "firebase/firestore";

import { app, db } from "./firebase.js";

const NOTIFICATIONS_COLLECTION = "notifications";
const USERS_COLLECTION = "users";

let messagingInstance = null;
let foregroundListener = null;

/* =========================================
   HELPERS
========================================= */

function validateUserId(userId) {
    if (!userId || typeof userId !== "string") {
        throw new Error("Valid user ID is required.");
    }
}

function getNotificationMessage(notification, language = "hi") {
    const value = notification?.message;

    if (typeof value === "string") {
        return value;
    }

    return value?.[language] || value?.hi || value?.en || "";
}

function normalizeNotification(snapshot) {
    const data = snapshot.data();

    return {
        id: snapshot.id,
        ...data,
        isRead: Boolean(data.isRead),

        createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate()
            : data.createdAt || null
    };
}

/* =========================================
   FIREBASE MESSAGING SUPPORT
========================================= */

export async function isPushNotificationSupported() {
    try {
        return await isSupported();
    } catch (error) {
        console.error("Messaging support check failed:", error);
        return false;
    }
}

export async function initializeMessaging() {
    const supported = await isPushNotificationSupported();

    if (!supported) {
        return {
            success: false,
            reason: "Push notifications are not supported."
        };
    }

    if (!messagingInstance) {
        messagingInstance = getMessaging(app);
    }

    return {
        success: true,
        messaging: messagingInstance
    };
}

/* =========================================
   REQUEST NOTIFICATION PERMISSION
========================================= */

/**
 * Call this function only after the user clicks
 * an Enable Notifications button.
 */

export async function requestNotificationPermission() {
    if (!("Notification" in window)) {
        return {
            success: false,
            reason: "Notifications are not supported by this browser."
        };
    }

    try {
        const permission = await Notification.requestPermission();

        return {
            success: permission === "granted",
            permission
        };

    } catch (error) {
        console.error("Notification permission error:", error);

        return {
            success: false,
            error: error.message
        };
    }
}

/* =========================================
   GET FCM TOKEN
========================================= */

/**
 * Requires:
 * - Notification permission
 * - Firebase Cloud Messaging configured
 * - Valid Web Push VAPID key
 * - Firebase messaging service worker
 */

export async function getFCMToken(vapidKey) {
    if (!vapidKey) {
        return {
            success: false,
            error: "Firebase Web Push VAPID key is required."
        };
    }

    if (!("Notification" in window)) {
        return {
            success: false,
            error: "Notifications are not supported."
        };
    }

    if (Notification.permission !== "granted") {
        return {
            success: false,
            error: "Notification permission has not been granted."
        };
    }

    try {
        const result = await initializeMessaging();

        if (!result.success) {
            return result;
        }

        const registration = await navigator.serviceWorker.register(
            "/firebase-messaging-sw.js"
        );

        const token = await getToken(result.messaging, {
            vapidKey,
            serviceWorkerRegistration: registration
        });

        if (!token) {
            return {
                success: false,
                error: "Unable to generate FCM token."
            };
        }

        return {
            success: true,
            token
        };

    } catch (error) {
        console.error("FCM token error:", error);

        return {
            success: false,
            error: error.message
        };
    }
}

/* =========================================
   SAVE FCM TOKEN
========================================= */

/**
 * Saves the current device token to the user's profile.
 * Security Rules must restrict this operation to the
 * authenticated user.
 */

export async function saveFCMToken(userId, token) {
    validateUserId(userId);

    if (!token) {
        throw new Error("FCM token is required.");
    }

    try {
        const userRef = doc(
            db,
            USERS_COLLECTION,
            userId
        );

        await setDoc(
            userRef,
            {
                fcmTokens: arrayUnion(token),
                notificationSettings: {
                    enabled: true
                },
                updatedAt: serverTimestamp()
            },
            {
                merge: true
            }
        );

        return {
            success: true
        };

    } catch (error) {
        console.error("Save FCM token error:", error);

        return {
            success: false,
            error: error.message
        };
    }
}

/* =========================================
   ENABLE NOTIFICATIONS
========================================= */

/**
 * Run after an explicit user action.
 */

export async function enableNotifications(userId, vapidKey) {
    validateUserId(userId);

    const permission = await requestNotificationPermission();

    if (!permission.success) {
        return permission;
    }

    const tokenResult = await getFCMToken(vapidKey);

    if (!tokenResult.success) {
        return tokenResult;
    }

    const saveResult = await saveFCMToken(
        userId,
        tokenResult.token
    );

    if (!saveResult.success) {
        return saveResult;
    }

    return {
        success: true,
        token: tokenResult.token,
        message: "Notifications enabled successfully."
    };
}

/* =========================================
   FOREGROUND NOTIFICATIONS
========================================= */

/**
 * Handles messages while the app is open.
 */

export async function listenToForegroundNotifications(callback) {
    if (typeof callback !== "function") {
        throw new Error("A notification callback is required.");
    }

    const result = await initializeMessaging();

    if (!result.success) {
        return result;
    }

    if (foregroundListener) {
        foregroundListener();
        foregroundListener = null;
    }

    foregroundListener = onMessage(
        result.messaging,
        payload => {
            const notification = {
                title: payload.notification?.title || "Rajasthan PYQ Master",

                body: payload.notification?.body || "",

                data: payload.data || {},

                receivedAt: new Date()
            };

            callback(notification);
        }
    );

    return {
        success: true
    };
}

export function stopForegroundNotifications() {
    if (foregroundListener) {
        foregroundListener();
        foregroundListener = null;
    }
}

/* =========================================
   GET USER NOTIFICATIONS
========================================= */

export async function getUserNotifications(
    userId,
    options = {}
) {
    validateUserId(userId);

    const pageSize = Math.min(
        Math.max(Number(options.pageSize) || 20, 1),
        100
    );

    try {
        const notificationQuery = query(
            collection(db, NOTIFICATIONS_COLLECTION),
            where("userId", "==", userId),
            orderBy("createdAt", "desc"),
            limit(pageSize)
        );

        const snapshot = await getDocs(notificationQuery);

        return {
            success: true,

            notifications: snapshot.docs.map(
                normalizeNotification
            ),

            count: snapshot.size
        };

    } catch (error) {
        console.error("Get notifications error:", error);

        return {
            success: false,
            notifications: [],
            error: error.message
        };
    }
}

/* =========================================
   GET UNREAD COUNT
========================================= */

export async function getUnreadNotificationCount(userId) {
    validateUserId(userId);

    try {
        const unreadQuery = query(
            collection(db, NOTIFICATIONS_COLLECTION),
            where("userId", "==", userId),
            where("isRead", "==", false)
        );

        const snapshot = await getDocs(unreadQuery);

        return {
            success: true,
            count: snapshot.size
        };

    } catch (error) {
        console.error("Unread notification count error:", error);

        return {
            success: false,
            count: 0,
            error: error.message
        };
    }
}

/* =========================================
   MARK NOTIFICATION AS READ
========================================= */

export async function markNotificationAsRead(
    userId,
    notificationId
) {
    validateUserId(userId);

    if (!notificationId) {
        throw new Error("Notification ID is required.");
    }

    try {
        const notificationRef = doc(
            db,
            NOTIFICATIONS_COLLECTION,
            notificationId
        );

        await updateDoc(notificationRef, {
            isRead: true,
            readAt: serverTimestamp()
        });

        return {
            success: true
        };

    } catch (error) {
        console.error("Mark notification read error:", error);

        return {
            success: false,
            error: error.message
        };
    }
}

/* =========================================
   MARK ALL NOTIFICATIONS AS READ
========================================= */

export async function markAllNotificationsAsRead(userId) {
    validateUserId(userId);

    try {
        const result = await getUserNotifications(userId, {
            pageSize: 100
        });

        if (!result.success) {
            return result;
        }

        const unread = result.notifications.filter(
            item => !item.isRead
        );

        const updates = await Promise.all(
            unread.map(item =>
                markNotificationAsRead(userId, item.id)
            )
        );

        return {
            success: updates.every(item => item.success),
            updatedCount: updates.filter(item => item.success).length
        };

    } catch (error) {
        console.error("Mark all read error:", error);

        return {
            success: false,
            error: error.message
        };
    }
}

/* =========================================
   NOTIFICATION PREFERENCES
========================================= */

export const DEFAULT_NOTIFICATION_SETTINGS = {
    enabled: true,
    dailyQuiz: true,
    testReminder: true,
    newPYQ: true,
    currentAffairs: true,
    announcements: true
};

/* =========================================
   LOCAL IN-APP NOTIFICATION
========================================= */

/**
 * Shows a browser notification while permission
 * has already been granted.
 */

export function showLocalNotification(title, body) {
    if (!("Notification" in window)) {
        return false;
    }

    if (Notification.permission !== "granted") {
        return false;
    }

    try {
        new Notification(title, {
            body,
            icon: "/logo.png"
        });

        return true;

    } catch (error) {
        console.error("Local notification error:", error);
        return false;
    }
}

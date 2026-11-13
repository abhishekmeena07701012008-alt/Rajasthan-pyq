/**
 * RAJASTHAN PYQ MASTER
 * Firebase Cloud Messaging Service Worker
 *
 * File: public/firebase-messaging-sw.js
 */

// Firebase Compatibility SDK
importScripts(
  "https://www.gstatic.com/firebasejs/12.5.0/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/12.5.0/firebase-messaging-compat.js"
);

// Firebase Configuration
firebase.initializeApp({
  apiKey: "AIzaSyAJB_cQzx7eFEELiVoWi-4DcKEgkRSbTUU",
  authDomain: "rajasthan-pyq-e1803.firebaseapp.com",
  projectId: "rajasthan-pyq-e1803",
  storageBucket: "rajasthan-pyq-e1803.firebasestorage.app",
  messagingSenderId: "830903536498",
  appId: "1:830903536498:web:9c0da3c1ce9f7e82ff2beb"
});

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// --------------------------------------------------
// BACKGROUND NOTIFICATIONS
// --------------------------------------------------

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[FCM] Background message received:",
    payload
  );

  const notification = payload.notification || {};
  const data = payload.data || {};

  const title = notification.title ||
    data.title ||
    "Rajasthan PYQ Master";

  const options = {
    body: notification.body ||
      data.body ||
      "आपके लिए एक नया अपडेट उपलब्ध है।",

    icon: "/logo.png",

    badge: "/logo.png",

    tag: data.notificationId || "rajasthan-pyq-notification",

    data: {
      url: data.url || "/",
      notificationId: data.notificationId || null
    },

    vibrate: [200, 100, 200],

    renotify: false
  };

  return self.registration.showNotification(
    title,
    options
  );
});

// --------------------------------------------------
// NOTIFICATION CLICK
// --------------------------------------------------

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl =
    event.notification.data?.url || "/";

  const safeUrl = new URL(targetUrl, self.location.origin);

  // Only allow navigation within this app's origin.
  if (safeUrl.origin !== self.location.origin) {
    return;
  }

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then((windowClients) => {

      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin)) {
          return client.focus().then(() => {
            if ("navigate" in client) {
              return client.navigate(safeUrl.href);
            }
          });
        }
      }

      return clients.openWindow(safeUrl.href);
    })
  );
});

// --------------------------------------------------
// SERVICE WORKER INSTALL
// --------------------------------------------------

self.addEventListener("install", (event) => {
  console.log("[FCM] Service Worker installed.");

  self.skipWaiting();
});

// --------------------------------------------------
// SERVICE WORKER ACTIVATE
// --------------------------------------------------

self.addEventListener("activate", (event) => {
  console.log("[FCM] Service Worker activated.");

  event.waitUntil(
    self.clients.claim()
  );
});

// Offline Mode Support
async function registerOfflineServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Worker इस Browser में उपलब्ध नहीं है।");
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/"
    });

    console.log("Offline Service Worker Registered:", registration.scope);
    return true;
  } catch (error) {
    console.error("Service Worker Registration Failed:", error);
    return false;
  }
}

// Internet Status
function initializeNetworkStatus() {
  const updateStatus = () => {
    const isOnline = navigator.onLine;

    document.documentElement.classList.toggle("offline-mode", !isOnline);

    window.dispatchEvent(
      new CustomEvent("app-network-status", {
        detail: { online: isOnline }
      })
    );

    console.log(isOnline ? "Internet Connected" : "Offline Mode");
  };

  window.addEventListener("online", updateStatus);
  window.addEventListener("offline", updateStatus);

  updateStatus();
}

const CHECK_URL = "https://www.gstatic.com/generate_204";
const CHECK_TIMEOUT = 5000;

let isConnected = navigator.onLine;
let checkInProgress = false;

const listeners = new Set();

function notifyListeners(status) {
  isConnected = status;

  listeners.forEach((callback) => {
    try {
      callback(status);
    } catch (error) {
      console.error("Network listener error:", error);
    }
  });
}

export async function checkInternetConnection() {
  if (checkInProgress) return isConnected;

  checkInProgress = true;

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    CHECK_TIMEOUT
  );

  try {
    const response = await fetch(CHECK_URL, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal
    });

    notifyListeners(true);
    return true;

  } catch (error) {
    notifyListeners(false);
    return false;

  } finally {
    clearTimeout(timeout);
    checkInProgress = false;
  }
}

export function getNetworkStatus() {
  return isConnected;
}

export function onNetworkChange(callback) {
  if (typeof callback !== "function") {
    throw new TypeError("Callback must be a function.");
  }

  listeners.add(callback);

  return () => listeners.delete(callback);
}

window.addEventListener("online", () => {
  checkInternetConnection();
});

window.addEventListener("offline", () => {
  notifyListeners(false);
});

import { initializeOfflineGuard } from "./offline-guard.js";

import {
  checkInternetConnection,
  onNetworkChange
} from "./network-monitor.js";

import {
  openAdBanner,
  closeAdBanner,
  setCurrentScreen
} from "./admob-gate.js";

import {
  setAdConsent,
  setMockTestAdLock
} from "./admob-policy.js";

let initialized = false;

export async function initializeAppIntegrations() {
  if (initialized) return;

  initialized = true;

  // Internet connection protection
  initializeOfflineGuard();

  // Check actual internet connectivity
  await checkInternetConnection();

  // Handle network changes
  onNetworkChange((connected) => {
    if (!connected) {
      closeAdBanner();
    }
  });

  console.log("App integrations initialized.");
}

export async function updateAppScreen(screen) {
  setCurrentScreen(screen);

  if (screen === "mock-test") {
    setMockTestAdLock(true);
    await closeAdBanner();
    return;
  }

  setMockTestAdLock(false);
  await openAdBanner();
}

export function updateAdvertisementConsent(granted) {
  setAdConsent(granted);
}

export async function stopAppAdvertisements() {
  await closeAdBanner();
  setMockTestAdLock(true);
}

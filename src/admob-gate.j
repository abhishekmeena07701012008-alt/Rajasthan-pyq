import {
  showBannerAd,
  hideBannerAd,
  showInterstitialAd,
  showRewardedAd
} from "./admob.js";

import {
  canShowInterstitial,
  recordInterstitialShown,
  getAdPolicyStatus
} from "./admob-policy.js";

let currentScreen = "home";

export async function openAdBanner() {
  const policy = getAdPolicyStatus();

  if (currentScreen === "mock-test") {
    await hideBannerAd();
    return false;
  }

  return showBannerAd({
    consentGranted: policy.consentGranted,
    mockTestActive: policy.mockTestActive
  });
}

export async function closeAdBanner() {
  return hideBannerAd();
}

export function setCurrentScreen(screen) {
  currentScreen = screen;

  if (screen === "mock-test") {
    hideBannerAd();
  }
}

export async function showPageTransitionAd() {
  if (currentScreen === "mock-test") {
    return false;
  }

  if (!canShowInterstitial()) {
    return false;
  }

  const policy = getAdPolicyStatus();

  const shown = await showInterstitialAd({
    consentGranted: policy.consentGranted,
    mockTestActive: policy.mockTestActive
  });

  if (shown) {
    recordInterstitialShown();
  }

  return shown;
}

export async function showRewardAd() {
  if (currentScreen === "mock-test") {
    return false;
  }

  const policy = getAdPolicyStatus();

  return showRewardedAd({
    consentGranted: policy.consentGranted,
    mockTestActive: policy.mockTestActive
  });
}

import { Capacitor } from "@capacitor/core";
import {
  AdMob,
  BannerAdSize,
  BannerAdPosition
} from "@capacitor-community/admob";

const ADMOB_CONFIG = {
  androidAppId: "ca-app-pub-3294666124278706~9316085290",

  units: {
    banner: "ca-app-pub-3294666124278706/1021682361",
    interstitial: "ca-app-pub-3294666124278706/9446967298",
    rewarded: "ca-app-pub-3294666124278706/1321065262"
  }
};

let initialized = false;
let bannerVisible = false;

function canShowAds({
  consentGranted = false,
  mockTestActive = false
} = {}) {
  return (
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "android" &&
    consentGranted === true &&
    mockTestActive === false
  );
}

export async function initializeAdMob() {
  if (!Capacitor.isNativePlatform() || initialized) {
    return false;
  }

  try {
    await AdMob.initialize({
      initializeForTesting: false
    });

    initialized = true;
    return true;
  } catch (error) {
    console.error("AdMob initialization failed:", error);
    return false;
  }
}

export async function showBannerAd({
  consentGranted = false,
  mockTestActive = false
} = {}) {
  if (!canShowAds({ consentGranted, mockTestActive })) {
    return false;
  }

  try {
    await initializeAdMob();

    if (!initialized) return false;

    await AdMob.showBanner({
      adId: ADMOB_CONFIG.units.banner,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: false
    });

    bannerVisible = true;
    return true;
  } catch (error) {
    console.error("Banner Ad failed:", error);
    return false;
  }
}

export async function hideBannerAd() {
  if (!initialized || !bannerVisible) return false;

  try {
    await AdMob.hideBanner();
    bannerVisible = false;
    return true;
  } catch (error) {
    console.error("Banner hide failed:", error);
    return false;
  }
}

export async function removeBannerAd() {
  if (!initialized || !bannerVisible) return false;

  try {
    await AdMob.removeBanner();
    bannerVisible = false;
    return true;
  } catch (error) {
    console.error("Banner removal failed:", error);
    return false;
  }
}

export async function showInterstitialAd({
  consentGranted = false,
  mockTestActive = false
} = {}) {
  if (!canShowAds({ consentGranted, mockTestActive })) {
    return false;
  }

  try {
    await initializeAdMob();

    if (!initialized) return false;

    await AdMob.prepareInterstitial({
      adId: ADMOB_CONFIG.units.interstitial,
      isTesting: false
    });

    await AdMob.showInterstitial();

    return true;
  } catch (error) {
    console.error("Interstitial Ad failed:", error);
    return false;
  }
}

export async function showRewardedAd({
  consentGranted = false,
  mockTestActive = false
} = {}) {
  if (!canShowAds({ consentGranted, mockTestActive })) {
    return false;
  }

  try {
    await initializeAdMob();

    if (!initialized) return false;

    await AdMob.prepareRewardVideoAd({
      adId: ADMOB_CONFIG.units.rewarded,
      isTesting: false
    });

    const result = await AdMob.showRewardVideoAd();

    return result || false;
  } catch (error) {
    console.error("Rewarded Ad failed:", error);
    return false;
  }
}

export function getAdMobConfig() {
  return {
    androidAppId: ADMOB_CONFIG.androidAppId,
    units: { ...ADMOB_CONFIG.units }
  };
}

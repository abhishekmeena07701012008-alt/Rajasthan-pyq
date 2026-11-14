import {
  getAdConsentStatus,
  saveConsent,
  revokeAdvertisementConsent
} from "./admob-consent.js";

import {
  getAdPolicyStatus,
  resetAdSession
} from "./admob-policy.js";

import {
  hideBannerAd
} from "./admob.js";

export function getAdMobSettings() {
  return {
    consent: getAdConsentStatus(),
    policy: getAdPolicyStatus()
  };
}

export async function disableAdvertisements() {
  revokeAdvertisementConsent();

  await hideBannerAd();

  return {
    success: true,
    message: "विज्ञापन प्राथमिकता अपडेट कर दी गई है।"
  };
}

export function enableAdvertisements() {
  saveConsent(true);

  return {
    success: true,
    message: "विज्ञापन प्राथमिकता अपडेट कर दी गई है।"
  };
}

export function resetAdvertisementSession() {
  resetAdSession();

  return {
    success: true,
    message: "विज्ञापन सेशन रीसेट हो गया है।"
  };
}

import {
  setAdConsent,
  getAdPolicyStatus
} from "./admob-policy.js";

const CONSENT_KEY = "rajasthan_pyq_ad_consent";

export function getConsentStatus() {
  try {
    const saved = localStorage.getItem(CONSENT_KEY);

    if (!saved) return "unknown";

    return saved === "granted"
      ? "granted"
      : "denied";
  } catch (error) {
    console.error("Consent read error:", error);
    return "unknown";
  }
}

export function saveConsent(granted) {
  const value = granted === true
    ? "granted"
    : "denied";

  try {
    localStorage.setItem(CONSENT_KEY, value);
    setAdConsent(granted === true);

    return true;
  } catch (error) {
    console.error("Consent save error:", error);
    return false;
  }
}

export function isAdvertisementAllowed() {
  return getConsentStatus() === "granted";
}

export function initializeAdConsent() {
  const status = getConsentStatus();

  setAdConsent(status === "granted");

  return {
    status,
    allowed: status === "granted"
  };
}

export function revokeAdvertisementConsent() {
  return saveConsent(false);
}

export function getAdConsentDetails() {
  return {
    status: getConsentStatus(),
    policy: getAdPolicyStatus()
  };
}

const STORAGE_KEY = "rajasthan_pyq_ad_policy";

const DEFAULT_POLICY = {
  lastInterstitialAt: 0,
  interstitialCount: 0,
  sessionStartedAt: Date.now(),
  mockTestActive: false,
  consentGranted: false
};

const MIN_INTERSTITIAL_INTERVAL = 180000; // 3 minutes
const MAX_INTERSTITIAL_PER_SESSION = 5;

function readPolicy() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return { ...DEFAULT_POLICY };

    return {
      ...DEFAULT_POLICY,
      ...JSON.parse(saved)
    };
  } catch {
    return { ...DEFAULT_POLICY };
  }
}

function savePolicy(policy) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(policy)
    );
  } catch (error) {
    console.error("Ad policy storage failed:", error);
  }
}

export function setAdConsent(granted) {
  const policy = readPolicy();

  policy.consentGranted = granted === true;

  savePolicy(policy);
}

export function setMockTestAdLock(active) {
  const policy = readPolicy();

  policy.mockTestActive = active === true;

  savePolicy(policy);
}

export function canShowInterstitial() {
  const policy = readPolicy();
  const now = Date.now();

  if (!policy.consentGranted) return false;

  if (policy.mockTestActive) return false;

  if (
    policy.interstitialCount >=
    MAX_INTERSTITIAL_PER_SESSION
  ) {
    return false;
  }

  if (
    now - policy.lastInterstitialAt <
    MIN_INTERSTITIAL_INTERVAL
  ) {
    return false;
  }

  return true;
}

export function recordInterstitialShown() {
  const policy = readPolicy();

  policy.lastInterstitialAt = Date.now();
  policy.interstitialCount += 1;

  savePolicy(policy);
}

export function resetAdSession() {
  const policy = readPolicy();

  policy.interstitialCount = 0;
  policy.lastInterstitialAt = 0;
  policy.sessionStartedAt = Date.now();
  policy.mockTestActive = false;

  savePolicy(policy);
}

export function getAdPolicyStatus() {
  return readPolicy();
}

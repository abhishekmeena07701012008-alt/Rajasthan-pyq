// src/consent-manager.js
// Rajasthan PYQ Master - Privacy & Consent Manager

const STORAGE_KEY = "rajasthan_pyq_consent_v1";

const DEFAULT_CONSENT = {
  necessary: true,
  analytics: false,
  ads: false,
  personalization: false,
  updatedAt: null
};

let consent = { ...DEFAULT_CONSENT };
let onConsentChange = null;

function loadConsent() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed = JSON.parse(saved);

      consent = {
        ...DEFAULT_CONSENT,
        ...parsed,
        necessary: true
      };
    }
  } catch (error) {
    console.error("Consent load error:", error);
    consent = { ...DEFAULT_CONSENT };
  }

  return { ...consent };
}

function saveConsent(newConsent) {
  consent = {
    ...DEFAULT_CONSENT,
    ...newConsent,
    necessary: true,
    updatedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  } catch (error) {
    console.error("Consent save error:", error);
  }

  if (typeof onConsentChange === "function") {
    onConsentChange({ ...consent });
  }

  window.dispatchEvent(
    new CustomEvent("consentChanged", {
      detail: { ...consent }
    })
  );

  return { ...consent };
}

export function getConsent() {
  return { ...consent };
}

export function hasConsent(category) {
  if (category === "necessary") return true;

  return consent[category] === true;
}

export function isConsentSelected() {
  return consent.updatedAt !== null;
}

export function setConsentChangeHandler(callback) {
  onConsentChange = callback;
}

export function acceptAllConsent() {
  return saveConsent({
    necessary: true,
    analytics: true,
    ads: true,
    personalization: true
  });
}

export function rejectOptionalConsent() {
  return saveConsent({
    necessary: true,
    analytics: false,
    ads: false,
    personalization: false
  });
}

export function updateConsent(options = {}) {
  return saveConsent({
    ...consent,
    ...options,
    necessary: true
  });
}

export function resetConsent() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Consent reset error:", error);
  }

  consent = { ...DEFAULT_CONSENT };

  if (typeof onConsentChange === "function") {
    onConsentChange({ ...consent });
  }

  return { ...consent };
}

// Consent banner
export function showConsentBanner() {
  if (isConsentSelected()) return;

  if (document.getElementById("consent-banner")) return;

  const banner = document.createElement("div");
  banner.id = "consent-banner";

  banner.innerHTML = `
    <div class="consent-box">
      <h2>Privacy Preferences</h2>

      <p>
        हम आपकी गोपनीयता का सम्मान करते हैं।
        आवश्यक सेवाओं के अलावा Analytics और Ads
        जैसी सुविधाओं के लिए आप अपनी पसंद चुन सकते हैं।
      </p>

      <div class="consent-options">
        <label>
          <input type="checkbox" checked disabled>
          आवश्यक सेवाएँ
        </label>

        <label>
          <input type="checkbox" id="consent-analytics">
          Analytics
        </label>

        <label>
          <input type="checkbox" id="consent-ads">
          विज्ञापन (Ads)
        </label>

        <label>
          <input type="checkbox" id="consent-personalization">
          Personalization
        </label>
      </div>

      <div class="consent-actions">
        <button id="consent-reject">केवल आवश्यक</button>
        <button id="consent-save">चयन सेव करें</button>
        <button id="consent-accept">सभी स्वीकार करें</button>
      </div>
    </div>
  `;

  const style = document.createElement("style");
  style.id = "consent-banner-style";

  style.textContent = `
    #consent-banner {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px;
      background: rgba(0,0,0,.72);
      font-family: Arial, sans-serif;
    }

    .consent-box {
      width: 100%;
      max-width: 430px;
      padding: 22px;
      border-radius: 14px;
      background: #fff;
      color: #222;
      box-shadow: 0 8px 35px rgba(0,0,0,.3);
    }

    .consent-box h2 {
      margin: 0 0 12px;
      font-size: 21px;
    }

    .consent-box p {
      font-size: 14px;
      line-height: 1.6;
    }

    .consent-options {
      display: grid;
      gap: 13px;
      margin: 20px 0;
      font-size: 14px;
    }

    .consent-options label {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .consent-options input {
      width: 17px;
      height: 17px;
    }

    .consent-actions {
      display: grid;
      gap: 9px;
    }

    .consent-actions button {
      border: 0;
      border-radius: 8px;
      padding: 12px;
      cursor: pointer;
      font-size: 14px;
    }

    #consent-reject {
      background: #eee;
      color: #222;
    }

    #consent-save,
    #consent-accept {
      background: #2457d6;
      color: #fff;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(banner);

  banner.querySelector("#consent-reject").onclick = () => {
    rejectOptionalConsent();
    banner.remove();
  };

  banner.querySelector("#consent-accept").onclick = () => {
    acceptAllConsent();
    banner.remove();
  };

  banner.querySelector("#consent-save").onclick = () => {
    updateConsent({
      analytics: banner.querySelector("#consent-analytics").checked,
      ads: banner.querySelector("#consent-ads").checked,
      personalization: banner.querySelector(
        "#consent-personalization"
      ).checked
    });

    banner.remove();
  };
}

// Initialize consent
export function initializeConsent() {
  loadConsent();

  if (!isConsentSelected()) {
    showConsentBanner();
  }

  return getConsent();
}

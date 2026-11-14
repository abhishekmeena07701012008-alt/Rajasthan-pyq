import {
  getConsentStatus,
  saveConsent
} from "./admob-consent.js";

import {
  openAdBanner,
  closeAdBanner
} from "./admob-gate.js";

const STYLE_ID = "admob-consent-style";

function addStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;

  style.textContent = `
    .ad-consent-box {
      max-width: 480px;
      margin: 20px auto;
      padding: 20px;
      border-radius: 14px;
      background: var(--card-bg, #ffffff);
      color: var(--text-color, #222222);
      border: 1px solid #dddddd;
    }

    .ad-consent-box h3 {
      margin-top: 0;
    }

    .ad-consent-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 18px;
    }

    .ad-consent-actions button {
      flex: 1;
      min-width: 110px;
      padding: 12px;
      border: 0;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
    }

    .ad-consent-accept {
      background: #2563eb;
      color: white;
    }

    .ad-consent-reject {
      background: #e5e7eb;
      color: #111827;
    }
  `;

  document.head.appendChild(style);
}

export function showAdConsentUI(containerId = "ad-consent-container") {
  addStyles();

  const container = document.getElementById(containerId);

  if (!container) {
    console.error("Ad consent container not found.");
    return false;
  }

  const status = getConsentStatus();

  if (status !== "unknown") {
    container.innerHTML = "";
    return true;
  }

  container.innerHTML = `
    <section class="ad-consent-box">
      <h3>विज्ञापन प्राथमिकताएँ</h3>

      <p>
        इस ऐप में विज्ञापन दिखाए जा सकते हैं।
        आप अपनी विज्ञापन प्राथमिकता चुन सकते हैं।
      </p>

      <div class="ad-consent-actions">
        <button
          type="button"
          class="ad-consent-accept"
          id="ad-consent-accept">
          स्वीकार करें
        </button>

        <button
          type="button"
          class="ad-consent-reject"
          id="ad-consent-reject">
          अस्वीकार करें
        </button>
      </div>
    </section>
  `;

  document
    .getElementById("ad-consent-accept")
    .addEventListener("click", async () => {
      saveConsent(true);
      container.innerHTML = "";
      await openAdBanner();
    });

  document
    .getElementById("ad-consent-reject")
    .addEventListener("click", async () => {
      saveConsent(false);
      container.innerHTML = "";
      await closeAdBanner();
    });

  return true;
}

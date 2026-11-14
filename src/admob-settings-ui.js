import {
  getConsentStatus,
  saveConsent,
  revokeAdvertisementConsent
} from "./admob-consent.js";

import {
  hideBannerAd
} from "./admob.js";

const STYLE_ID = "admob-settings-ui-style";

function addStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;

  style.textContent = `
    .admob-settings {
      padding: 20px;
      border-radius: 12px;
      background: var(--card-bg, #fff);
      color: var(--text-color, #222);
      border: 1px solid #ddd;
    }

    .admob-settings h3 {
      margin-top: 0;
    }

    .admob-settings p {
      line-height: 1.6;
    }

    .admob-settings button {
      padding: 11px 16px;
      margin: 6px 6px 6px 0;
      border: 0;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
    }

    .admob-settings .allow {
      background: #2563eb;
      color: white;
    }

    .admob-settings .deny {
      background: #e5e7eb;
      color: #111827;
    }
  `;

  document.head.appendChild(style);
}

export function renderAdMobSettings(
  containerId = "admob-settings-container"
) {
  addStyles();

  const container = document.getElementById(containerId);

  if (!container) {
    console.error("AdMob settings container not found.");
    return false;
  }

  const status = getConsentStatus();

  const statusText = {
    granted: "विज्ञापन की अनुमति दी गई है।",
    denied: "विज्ञापन की अनुमति अस्वीकार है।",
    unknown: "अभी कोई प्राथमिकता नहीं चुनी गई है।"
  };

  container.innerHTML = `
    <section class="admob-settings">
      <h3>विज्ञापन सेटिंग्स</h3>

      <p>
        विज्ञापन प्राथमिकता:
        <strong id="admob-current-status">
          ${statusText[status]}
        </strong>
      </p>

      <p>
        आप अपनी विज्ञापन प्राथमिकता कभी भी बदल सकते हैं।
      </p>

      <button
        type="button"
        class="allow"
        id="admob-allow-button">
        अनुमति दें
      </button>

      <button
        type="button"
        class="deny"
        id="admob-deny-button">
        अनुमति वापस लें
      </button>
    </section>
  `;

  document
    .getElementById("admob-allow-button")
    .addEventListener("click", () => {
      saveConsent(true);
      renderAdMobSettings(containerId);
    });

  document
    .getElementById("admob-deny-button")
    .addEventListener("click", async () => {
      revokeAdvertisementConsent();
      await hideBannerAd();
      renderAdMobSettings(containerId);
    });

  return true;
}

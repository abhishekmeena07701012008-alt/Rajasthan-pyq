import {
  checkInternetConnection,
  onNetworkChange,
  getNetworkStatus
} from "./network-monitor.js";

const STATUS_ID = "network-status-indicator";

export function initializeNetworkStatusUI(
  containerId = "network-status-container"
) {
  const container = document.getElementById(containerId);

  if (!container) {
    console.error("Network status container not found.");
    return false;
  }

  container.innerHTML = `
    <div
      id="${STATUS_ID}"
      role="status"
      aria-live="polite"
      style="
        display:flex;
        align-items:center;
        gap:8px;
        padding:8px 12px;
        border-radius:8px;
        font-size:13px;
      "
    >
      <span id="network-status-dot">●</span>
      <span id="network-status-text">कनेक्शन जाँचा जा रहा है...</span>
    </div>
  `;

  function updateUI(connected) {
    const indicator = document.getElementById(STATUS_ID);
    const dot = document.getElementById("network-status-dot");
    const text = document.getElementById("network-status-text");

    if (!indicator || !dot || !text) return;

    dot.style.color = connected ? "#16a34a" : "#dc2626";

    text.textContent = connected
      ? "इंटरनेट कनेक्टेड"
      : "इंटरनेट उपलब्ध नहीं है";

    indicator.style.background = connected
      ? "#dcfce7"
      : "#fee2e2";

    indicator.style.color = connected
      ? "#166534"
      : "#991b1b";
  }

  updateUI(getNetworkStatus());

  const unsubscribe = onNetworkChange(updateUI);

  checkInternetConnection();

  return unsubscribe;
}

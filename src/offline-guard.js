const OVERLAY_ID = "internet-connection-overlay";

let initialized = false;

function createOverlay() {
  let overlay = document.getElementById(OVERLAY_ID);

  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;

  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "999999",
    background: "#101827",
    color: "#ffffff",
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "24px",
    fontFamily: "Arial, sans-serif"
  });

  overlay.innerHTML = `
    <div style="max-width:360px">
      <div style="font-size:55px;margin-bottom:15px">📡</div>

      <h2 style="margin-bottom:12px">
        इंटरनेट कनेक्शन उपलब्ध नहीं है
      </h2>

      <p style="color:#cbd5e1;line-height:1.6">
        Rajasthan PYQ Master चलाने के लिए
        इंटरनेट कनेक्शन आवश्यक है।
      </p>

      <p id="connection-status" style="color:#fbbf24">
        इंटरनेट कनेक्शन की जाँच हो रही है...
      </p>

      <button
        id="retry-internet-button"
        style="
          margin-top:15px;
          padding:12px 25px;
          border:0;
          border-radius:8px;
          background:#2563eb;
          color:white;
          font-size:16px;
          cursor:pointer;
        "
      >
        दोबारा जाँचें
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  return overlay;
}

function updateConnectionStatus() {
  const overlay = createOverlay();
  const status = document.getElementById("connection-status");

  if (!navigator.onLine) {
    overlay.style.display = "flex";

    if (status) {
      status.textContent = "आप ऑफलाइन हैं। इंटरनेट चालू करें।";
    }

    document.documentElement.style.overflow = "hidden";
    return false;
  }

  overlay.style.display = "none";
  document.documentElement.style.overflow = "";

  return true;
}

export function initializeOfflineGuard() {
  if (initialized) return;

  initialized = true;

  createOverlay();

  window.addEventListener("offline", () => {
    updateConnectionStatus();
  });

  window.addEventListener("online", () => {
    updateConnectionStatus();
    window.location.reload();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      updateConnectionStatus();
    }
  });

  document
    .getElementById("retry-internet-button")
    .addEventListener("click", () => {
      if (navigator.onLine) {
        window.location.reload();
      } else {
        updateConnectionStatus();
      }
    });

  updateConnectionStatus();
}

export function isInternetAvailable() {
  return navigator.onLine;
}

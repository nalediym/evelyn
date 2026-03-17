// Evelyn Dream Lens — Content Script
// Runs only on localhost:8000 and evelyn.app pages.
// Bridges the dream profile from extension storage to the web app.

function sendProfile(profile) {
  window.postMessage(
    { type: "evelyn-dream-lens", profile },
    "*"
  );
}

async function loadAndSendProfile() {
  const data = await chrome.storage.local.get("dreamProfile");
  if (data.dreamProfile) {
    sendProfile(data.dreamProfile);
  }
}

// Send profile once the page is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadAndSendProfile);
} else {
  loadAndSendProfile();
}

// Listen for requests from the web app
window.addEventListener("message", async (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== "evelyn-dream-lens-request") return;

  const data = await chrome.storage.local.get("dreamProfile");
  if (data.dreamProfile) {
    sendProfile(data.dreamProfile);
  }
});

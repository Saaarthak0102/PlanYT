/**
 * background.js
 * PlanYT Background Service Worker
 * Handles messages from content scripts to open the extension popup
 */

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle request to open PlanYT popup
  if (message.type === 'OPEN_PLANYT_POPUP') {
    // Open the extension popup (legacy simple open)
    chrome.action.openPopup()
      .then(() => {
        console.log('PlanYT: Popup opened successfully');
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('PlanYT: Failed to open popup', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  // Open a specific plan by playlistId (widget -> background -> popup)
  if (message.type === 'OPEN_SPECIFIC_PLAN') {
    const playlistId = message.playlistId || null;
    const pending = { type: 'openPlan', playlistId };
    chrome.storage.local.set({ pendingPopupAction: pending }, () => {
      chrome.action.openPopup().catch(err => console.error('PlanYT: Failed to open popup', err));
      sendResponse({ success: true });
    });
    return true;
  }

  // Create a plan for current playlist: prefill popup with URL and trigger fetch
  if (message.type === 'CREATE_PLAN_FOR_PLAYLIST') {
    const playlistUrl = message.playlistUrl || window.location?.href || '';
    const playlistId = message.playlistId || null;
    const pending = { type: 'createPlan', playlistUrl, playlistId };
    chrome.storage.local.set({ pendingPopupAction: pending }, () => {
      chrome.action.openPopup().catch(err => console.error('PlanYT: Failed to open popup', err));
      sendResponse({ success: true });
    });
    return true;
  }
});

// Optional: Log when service worker starts
console.log('PlanYT: Background service worker initialized');

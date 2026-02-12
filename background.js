/**
 * background.js
 * PlanYT Background Service Worker
 * Handles messages from content scripts to open the extension popup
 */

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle request to open PlanYT popup
  if (message.type === 'OPEN_PLANYT_POPUP') {
    // Open the extension popup
    // Note: This only works reliably when triggered by a user gesture
    chrome.action.openPopup()
      .then(() => {
        console.log('PlanYT: Popup opened successfully');
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('PlanYT: Failed to open popup', error);
        sendResponse({ success: false, error: error.message });
      });
    
    // Return true to indicate we'll send a response asynchronously
    return true;
  }
});

// Optional: Log when service worker starts
console.log('PlanYT: Background service worker initialized');

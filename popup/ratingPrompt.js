/**
 * ratingPrompt.js
 * Handles the logic for displaying the "Rate us" banner.
 */

document.addEventListener('DOMContentLoaded', () => {
  initRatingPrompt();
});

function initRatingPrompt() {
  chrome.storage.local.get(['installDate', 'ratingPrompt', 'playlistPlans'], (result) => {
    const installDate = result.installDate;
    const ratingPrompt = result.ratingPrompt || { status: 'pending', lastShown: null };
    const playlistPlans = result.playlistPlans;

    // 1. Abort if user has already rated or opted out permanently
    if (ratingPrompt.status === 'rated' || ratingPrompt.status === 'never') {
      return;
    }

    // 2. Abort if 3 days haven't passed since install (or since backdated install)
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    if (!installDate || Date.now() - installDate < THREE_DAYS_MS) {
      return;
    }

    // 3. Abort if previously dismissed and 7 days haven't passed
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    if (ratingPrompt.status === 'dismissed' && ratingPrompt.lastShown) {
      if (Date.now() - ratingPrompt.lastShown < SEVEN_DAYS_MS) {
        return;
      }
    }

    // 4. Abort if user hasn't made any progress
    let hasProgress = false;
    if (playlistPlans && playlistPlans.plans) {
      hasProgress = playlistPlans.plans.some(plan => 
        plan.progress && (plan.progress.percent > 0 || plan.progress.lastWatchedIndex > 0)
      );
    }
    
    if (!hasProgress) {
      return;
    }

    // All conditions met, show the banner
    const banner = document.getElementById('ratingBanner');
    if (!banner) return;
    
    banner.classList.remove('hidden');

    // Attach event listeners
    const rateBtn = document.getElementById('ratingRateBtn');
    const neverBtn = document.getElementById('ratingNeverBtn');
    const dismissBtn = document.getElementById('ratingDismissBtn');

    rateBtn.addEventListener('click', () => {
      updateRatingStatus('rated', null);
      banner.classList.add('hidden');
      const storeUrl = `https://chromewebstore.google.com/detail/${chrome.runtime.id}/reviews`;
      chrome.tabs.create({ url: storeUrl });
    });

    neverBtn.addEventListener('click', () => {
      updateRatingStatus('never', null);
      banner.classList.add('hidden');
    });

    dismissBtn.addEventListener('click', () => {
      updateRatingStatus('dismissed', Date.now());
      banner.classList.add('hidden');
    });
  });
}

function updateRatingStatus(status, lastShown) {
  chrome.storage.local.get(['ratingPrompt'], (result) => {
    const newRatingPrompt = result.ratingPrompt || {};
    newRatingPrompt.status = status;
    if (lastShown !== null) {
      newRatingPrompt.lastShown = lastShown;
    }
    chrome.storage.local.set({ ratingPrompt: newRatingPrompt });
  });
}

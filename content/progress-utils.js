/**
 * progress-utils.js
 * Small helpers shared by the YouTube content scripts.
 * Progress maths lives in core/progress.js (PlanYTProgress).
 */

/** Playlist ID of the current page (playlist page or watch page with list=) */
function extractPlaylistIdFromPage() {
  return PlanYTProgress.playlistIdFromUrl(window.location.href);
}

/** True on /playlist?list=… and /watch?…&list=… pages */
function isPlaylistPage() {
  return /[?&]list=/.test(window.location.href) &&
    (window.location.pathname === '/playlist' || window.location.pathname === '/watch');
}

/** Find the saved plan whose playlistUrl matches the given playlist id */
function findMatchingPlan(playlistId, allPlans) {
  if (!playlistId || !Array.isArray(allPlans)) return null;
  return allPlans.find(plan => PlanYTProgress.playlistIdFromUrl(plan.playlistUrl) === playlistId) || null;
}

/** Read all plans ({plans, activePlanId}) from storage */
function readPlansData() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(['playlistPlans'], (result) => {
        if (chrome.runtime.lastError) {
          resolve({ plans: [], activePlanId: null });
          return;
        }
        resolve(result.playlistPlans || { plans: [], activePlanId: null });
      });
    } catch (_) {
      resolve({ plans: [], activePlanId: null });
    }
  });
}

/**
 * Mutate the plan matching playlistId and save it.
 * mutate(planData) must return true if something changed.
 */
async function updatePlanForPlaylist(playlistId, mutate) {
  const data = await readPlansData();
  const plan = findMatchingPlan(playlistId, data.plans || []);
  if (!plan) return false;
  if (!mutate(plan.planData)) return false;
  plan.progress = PlanYTProgress.derive(plan.planData);
  return new Promise((resolve) => {
    chrome.storage.local.set({ playlistPlans: data }, () => resolve(!chrome.runtime.lastError));
  });
}

/** Debounce */
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * playlist-highlight.js
 * Tints completed videos in YouTube's playlist panel (watch page sidebar and
 * /playlist page). Fully done = full red tint, partially done = proportional tint.
 */
(function () {
  'use strict';

  const STYLE_ID = 'planyt-highlight-style';
  const ITEM_SELECTOR = 'ytd-playlist-panel-video-renderer, ytd-playlist-video-renderer';
  const ATTR_PCT = 'data-planyt-pct';

  let completionMap = null; // {videoId: fraction} for the current playlist, or null
  let observer = null;
  let observedRoot = null;
  let currentPlaylistId = null;

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      ${ITEM_SELECTOR.split(',').map(s => s.trim() + '[' + ATTR_PCT + ']').join(',\n')} {
        background-image: linear-gradient(90deg,
          rgba(255, 0, 0, 0.24) 0%,
          rgba(255, 0, 0, 0.24) var(--planyt-pct, 0%),
          transparent var(--planyt-pct, 0%)) !important;
      }
      ${ITEM_SELECTOR.split(',').map(s => s.trim() + '[' + ATTR_PCT + '="100"]').join(',\n')} {
        box-shadow: inset 3px 0 0 #ff0000;
      }
      ${ITEM_SELECTOR.split(',').map(s => s.trim() + '[' + ATTR_PCT + '="100"] #video-title').join(',\n')} {
        text-decoration: line-through !important;
        opacity: 0.7;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function videoIdOf(item) {
    const a = item.querySelector('a[href*="watch?v="], a[href*="/watch?"]');
    if (!a) return null;
    try {
      return new URL(a.getAttribute('href'), location.origin).searchParams.get('v');
    } catch (_) {
      return null;
    }
  }

  function clearItem(item) {
    if (item.hasAttribute(ATTR_PCT)) {
      item.removeAttribute(ATTR_PCT);
      item.style.removeProperty('--planyt-pct');
    }
  }

  function applyAll() {
    const items = document.querySelectorAll(ITEM_SELECTOR);
    items.forEach(item => {
      const id = completionMap ? videoIdOf(item) : null;
      const fraction = id && completionMap[id] ? completionMap[id] : 0;
      if (fraction <= 0.001) {
        clearItem(item);
        return;
      }
      const pct = fraction >= 0.999 ? 100 : Math.round(fraction * 100);
      if (item.getAttribute(ATTR_PCT) !== String(pct)) {
        item.setAttribute(ATTR_PCT, String(pct));
        item.style.setProperty('--planyt-pct', pct + '%');
      }
    });
  }

  const applyDebounced = debounce(applyAll, 150);

  async function loadMap() {
    currentPlaylistId = extractPlaylistIdFromPage();
    if (!currentPlaylistId || !isPlaylistPage()) {
      completionMap = null;
      return;
    }
    const data = await readPlansData();
    const plan = findMatchingPlan(currentPlaylistId, data.plans || []);
    completionMap = plan ? PlanYTProgress.videoCompletionMap(plan.planData) : null;
  }

  async function refresh() {
    await loadMap();
    applyAll();
    attachObserver();
  }

  function attachObserver() {
    // Observe the whole page body subtree cheaply: items are lazy-rendered and recycled by YouTube.
    const root = document.querySelector('ytd-watch-flexy, ytd-browse, ytd-page-manager') || document.body;
    if (!root || root === observedRoot) return;
    if (observer) observer.disconnect();
    observedRoot = root;
    observer = new MutationObserver(() => {
      if (completionMap) applyDebounced();
    });
    observer.observe(root, { childList: true, subtree: true });
  }

  function init() {
    injectStyle();
    refresh();

    document.addEventListener('yt-navigate-finish', () => {
      observedRoot = null; // page containers get replaced on SPA navigation
      refresh();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.playlistPlans) refresh();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

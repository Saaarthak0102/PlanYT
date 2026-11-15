/**
 * progress-widget.js
 * PlanYT Progress Widget - YouTube Playlist Sidebar Integration
 * Injects a native-looking progress card into YouTube playlist pages
 */

(function() {
  'use strict';

  const CONFIG = {
    WIDGET_ID: 'planyt-progress-widget-container',
    WIDGET_HOST_ID: 'planyt-progress-widget-host',
    SECONDARY_SELECTOR: '#secondary',
    CHECK_INTERVAL: 300,
    MAX_INIT_ATTEMPTS: 30,
    UPDATE_DEBOUNCE: 200,
    STORAGE_KEY: 'playlistPlans'
  };

  const STATE = {
    initialized: false,
    currentPlaylistId: null,
    shadowRoot: null,
    updateDebounceTimer: null,
    navigationCheckInterval: null,
    navigationDebounceTimer: null,
    lastPath: window.location.pathname,
    activeInjectionPromise: null
  };

  async function injectWidgetSafely() {
    if (!isPlaylistPage()) {
      return;
    }

    const existing = document.getElementById(CONFIG.WIDGET_HOST_ID);
    if (existing && existing.isConnected) {
      return;
    }

    if (STATE.activeInjectionPromise) {
      return STATE.activeInjectionPromise;
    }

    STATE.activeInjectionPromise = (async () => {
      try {
        try {
          const staleWidget = document.getElementById(CONFIG.WIDGET_HOST_ID);
          if (staleWidget) {
            staleWidget.remove();
          }
        } catch (err) {
          console.warn('PlanYT: Could not remove stale widget', err);
        }

        const hostSpot = await waitForHost();
        if (!hostSpot) {
          console.warn('PlanYT: Playlist sidebar not found');
          return;
        }

        // Double check connected state under the lock after awaiting the sidebar
        const existingAfterWait = document.getElementById(CONFIG.WIDGET_HOST_ID);
        if (existingAfterWait && existingAfterWait.isConnected) {
          return;
        }

        const widget = createWidgetContainer();
        if (!widget) {
          console.warn('PlanYT: Failed to create widget');
          return;
        }

        const playlistPanel = hostSpot.parent;

        try {
          if (hostSpot.before && hostSpot.before.parentNode === playlistPanel) {
            playlistPanel.insertBefore(widget, hostSpot.before);
          } else {
            playlistPanel.appendChild(widget);
          }
        } catch (err) {
          console.warn('PlanYT: insertBefore failed, using appendChild fallback', err);
          try {
            playlistPanel.appendChild(widget);
          } catch (err2) {
            console.warn('PlanYT: appendChild also failed', err2);
            return;
          }
        }

        STATE.initialized = true;
      } finally {
        STATE.activeInjectionPromise = null;
      }
    })();

    return STATE.activeInjectionPromise;
  }

  // Decide where the widget goes for the current page type.
  // Returns { parent, before } or null if the page isn't ready yet.
  function findHost() {
    const isPlaylistListing = window.location.pathname === '/playlist';

    if (isPlaylistListing) {
      // /playlist?list=… : the legacy sidebar/header elements are empty & hidden in the
      // new layout, so only use a candidate if it is actually visible.
      const isVisible = (el) => {
        const r = el.getBoundingClientRect();
        return r.width > 150 && r.height > 20;
      };
      // Current layout: right under the Play / Comments button row of the playlist header
      const playMenu = document.querySelector(
        'ytd-browse[page-subtype="playlist"] ytd-playlist-header-renderer .play-menu');
      if (playMenu && playMenu.isConnected && isVisible(playMenu) && playMenu.parentElement) {
        return { parent: playMenu.parentElement, before: playMenu.nextElementSibling };
      }

      const sidebar = document.querySelector('ytd-browse[page-subtype="playlist"] ytd-playlist-sidebar-renderer');
      if (sidebar && sidebar.isConnected && isVisible(sidebar)) {
        const items = sidebar.querySelector('#items') || sidebar;
        const primary = items.querySelector('ytd-playlist-sidebar-primary-info-renderer');
        const before = primary && primary.parentNode === items ? primary.nextElementSibling : null;
        return { parent: items, before };
      }

      // New layout: top of the video-list column, above the first video
      const listColumn = document.querySelector(
        'ytd-browse[page-subtype="playlist"] ytd-two-column-browse-results-renderer #primary');
      if (listColumn && listColumn.isConnected && listColumn.firstElementChild) {
        return { parent: listColumn, before: listColumn.firstElementChild };
      }
      return null;
    }

    // /watch?v=…&list=… : playlist panel in the secondary column
    const panel =
      document.querySelector('ytd-watch-flexy ytd-playlist-panel-renderer') ||
      document.querySelector('ytd-playlist-panel-renderer');
    if (panel && panel.isConnected) {
      const ref = panel.querySelector('#header-description');
      return { parent: panel, before: ref && ref.parentNode === panel ? ref : null };
    }
    return null;
  }

  async function waitForHost(maxAttempts = CONFIG.MAX_INIT_ATTEMPTS) {
    for (let i = 0; i < maxAttempts; i++) {
      const spot = findHost();
      if (spot) {
        return spot;
      }

      await new Promise((resolve) => setTimeout(resolve, CONFIG.CHECK_INTERVAL));
    }

    return null;
  }

  function removeWidget() {
    try {
      const widget = document.getElementById(CONFIG.WIDGET_HOST_ID);
      if (widget && widget.isConnected) {
        widget.remove();
      }
    } catch (err) {
      console.warn('PlanYT: Error removing widget', err);
    }

    STATE.shadowRoot = null;
    STATE.activeInjectionPromise = null;
  }

  function createWidgetContainer() {
    const host = document.createElement('div');
    host.id = CONFIG.WIDGET_HOST_ID;

    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = getWidgetStyles();

    const container = document.createElement('div');
    container.className = 'planyt-widget-container';

    shadow.appendChild(style);
    shadow.appendChild(container);

    shadow.widgetContainer = container;
    STATE.shadowRoot = shadow;

    return host;
  }

  async function renderWidget() {
    let widgetHost = document.getElementById(CONFIG.WIDGET_HOST_ID);

    if (!STATE.shadowRoot || !STATE.shadowRoot.widgetContainer || !widgetHost || !widgetHost.isConnected) {
      console.warn('PlanYT: Widget detached during render, reinjecting safely');
      STATE.initialized = false;
      await injectWidgetSafely();
      
      widgetHost = document.getElementById(CONFIG.WIDGET_HOST_ID);
      if (!widgetHost || !widgetHost.isConnected) {
        return;
      }
    }

    const container = STATE.shadowRoot.widgetContainer;
    const playlistId = extractPlaylistIdFromPage();

    if (!playlistId) {
      renderEmptyState(container, 'Unable to detect playlist');
      return;
    }

    STATE.currentPlaylistId = playlistId;

    try {
      const plansData = await getPlansFromStorage();
      const plan = findMatchingPlan(playlistId, plansData);

      if (!plan) {
        renderEmptyState(container, 'Plan this playlist with PlanYT');
        return;
      }

      const progress = PlanYTProgress.derive(plan.planData || []);

      if (progress.totalDays === 0) {
        renderEmptyState(container, 'Plan this playlist with PlanYT');
        return;
      }

      if (progress.completedDays === progress.totalDays) {
        renderCompletedState(container);
      } else {
        renderActivePlan(container, plan, progress);
      }
    } catch (error) {
      console.warn('PlanYT widget: Error rendering', error);
      renderEmptyState(container, 'Error loading plan');
    }
  }

  function renderEmptyState(container, message = 'Plan this playlist with PlanYT') {
    container.innerHTML = `
      <div class="cta-only">
        <button class="btn btn-secondary" id="planyt-empty-cta" title="${escapeHtml(message)}">Create Plan</button>
      </div>
    `;

    const btn = container.querySelector('#planyt-empty-cta');
    if (btn) {
      btn.addEventListener('click', () => openPlanYTPopup('create'));
    }
  }

  function renderCompletedState(container) {
    container.innerHTML = `
      <div class="cta-only">
        <button class="btn btn-secondary" id="planyt-view-cta" title="Playlist completed">View Plan</button>
      </div>
    `;

    const btn = container.querySelector('#planyt-view-cta');
    if (btn) {
      btn.addEventListener('click', () => openPlanYTPopup('open'));
    }
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function renderActivePlan(container, plan, progress) {
    const planData = plan.planData || [];
    const dayIndex = PlanYTProgress.currentDayIndex(planData);
    const day = planData[dayIndex];
    const playlistId = STATE.currentPlaylistId;
    const fmt = PlanYTProgress.formatMinutes;

    const segmentsHtml = (day.videos || []).map((seg, i) => {
      const url = PlanYTProgress.segmentUrl(seg, playlistId);
      const range = seg.isPartial
        ? `${fmt(seg.startTime || 0)} – ${seg.endTime ? fmt(seg.endTime) : 'end'}`
        : '';
      return `
        <label class="today-item ${seg.completed ? 'done' : ''}">
          <input type="checkbox" class="seg-check" data-seg="${i}" ${seg.completed ? 'checked' : ''}>
          <span class="today-item-text">
            <a class="today-item-title" href="${escapeHtml(url || '#')}">${escapeHtml(seg.title)}</a>
            <span class="today-item-meta">${fmt(seg.duration)}${range ? ' · ' + range : ''}</span>
          </span>
        </label>`;
    }).join('');

    container.innerHTML = `
      <div class="container">
        <section class="section section-compact">
          <h3 class="plans-title">Plan Progress</h3>
          <div class="progress-hero">
            <div class="progress-hero-percent">${progress.percent}% Complete</div>
            <div class="progress-bar-container progress-bar-container-hero">
              <div class="progress-bar" style="width: ${progress.percent}%"></div>
            </div>
          </div>

          <div class="today-card">
            <div class="today-head">
              <span class="today-title">Today · Day ${day.day}</span>
              <span class="today-time">${fmt(day.totalTime)}</span>
            </div>
            <div class="today-list">${segmentsHtml}</div>
            ${plan.mode === 'video-by-video' ? '' : `<label class="today-all">
              <input type="checkbox" id="planyt-day-check" ${day.completed ? 'checked' : ''}>
              <span>Mark today as completed</span>
            </label>`}
          </div>

          <div class="plans-footer">
            <button class="btn btn-secondary" id="planyt-open-cta">Open Plan</button>
          </div>
        </section>
      </div>
    `;

    const openBtn = container.querySelector('#planyt-open-cta');
    if (openBtn) {
      openBtn.addEventListener('click', () => openPlanYTPopup('open'));
    }

    container.querySelectorAll('.seg-check').forEach(box => {
      box.addEventListener('change', () => {
        const segIndex = parseInt(box.dataset.seg, 10);
        updatePlanForPlaylist(playlistId, (pd) =>
          PlanYTProgress.setSegmentCompleted(pd, dayIndex, segIndex, box.checked));
      });
    });

    const dayBox = container.querySelector('#planyt-day-check');
    if (dayBox) {
      dayBox.addEventListener('change', () => {
        updatePlanForPlaylist(playlistId, (pd) =>
          PlanYTProgress.setDayCompleted(pd, dayIndex, dayBox.checked));
      });
    }
  }

  async function getPlansFromStorage() {
    const data = await readPlansData();
    return data.plans || [];
  }

  function setupStorageListener() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;
      if (!changes[CONFIG.STORAGE_KEY]) return;

      clearTimeout(STATE.updateDebounceTimer);
      STATE.updateDebounceTimer = setTimeout(() => {
        renderWidget();
      }, CONFIG.UPDATE_DEBOUNCE);
    });
  }

  function setupNavigationListeners() {
    document.addEventListener('yt-navigate-finish', () => {
      try {
        const stale = document.getElementById(CONFIG.WIDGET_HOST_ID);
        if (stale) {
          stale.remove();
        }
      } catch (err) {
        console.warn('PlanYT: Error removing stale widget on navigation', err);
      }
      handlePageChangeDebounced();
    });

    setInterval(() => {
      if (window.location.pathname !== STATE.lastPath) {
        STATE.lastPath = window.location.pathname;
        handlePageChangeDebounced();
      }
    }, 1000);
  }

  function handlePageChangeDebounced() {
    clearTimeout(STATE.navigationDebounceTimer);
    STATE.navigationDebounceTimer = setTimeout(() => {
      handlePageChange();
    }, 250);
  }

  function handlePageChange() {
    const wasPreviouslyPlaylist = STATE.currentPlaylistId !== null;
    const isNowPlaylist = isPlaylistPage();

    if (!isNowPlaylist && wasPreviouslyPlaylist) {
      removeWidget();
      STATE.initialized = false;
    } else if (isNowPlaylist) {
      const newPlaylistId = extractPlaylistIdFromPage();

      if (newPlaylistId !== STATE.currentPlaylistId) {
        removeWidget();
        STATE.initialized = false;
        initialize();
      } else {
        if (STATE.shadowRoot && STATE.shadowRoot.widgetContainer) {
          renderWidget();
        } else if (!STATE.initialized) {
          injectWidgetSafely();
        }
      }
    }
  }

  function openPlanYTPopup(action) {
    // action: 'open' -> open existing plan; 'create' -> create new plan for current playlist
    const playlistId = extractPlaylistIdFromPage();
    const playlistUrl = window.location.href;

    if (action === 'open') {
      chrome.runtime.sendMessage({ type: 'OPEN_SPECIFIC_PLAN', playlistId }, () => {
        if (chrome.runtime.lastError) console.warn('PlanYT widget: OPEN_SPECIFIC_PLAN error', chrome.runtime.lastError);
      });
      return;
    }

    if (action === 'create') {
      chrome.runtime.sendMessage({ type: 'CREATE_PLAN_FOR_PLAYLIST', playlistUrl, playlistId }, () => {
        if (chrome.runtime.lastError) console.warn('PlanYT widget: CREATE_PLAN_FOR_PLAYLIST error', chrome.runtime.lastError);
      });
      return;
    }

    // Fallback
    chrome.runtime.sendMessage({ type: 'OPEN_PLANYT_POPUP' });
  }

  async function initialize() {
    if (STATE.initialized) {
      return;
    }

    if (!isPlaylistPage()) {
      return;
    }

    STATE.currentPlaylistId = extractPlaylistIdFromPage();
    await injectWidgetSafely();
    await renderWidget();
  }

  function getWidgetStyles() {
    return `
      :host {
        --yt-bg-primary: #0f0f0f;
        --yt-bg-secondary: #212121;
        --yt-bg-tertiary: #272727;
        --yt-bg-hover: #3f3f3f;
        --yt-text-primary: #ffffff;
        --yt-text-secondary: #e6e6e6;
        --yt-text-tertiary: #bfbfbf;
        --yt-brand-red: #ff0000;
        --yt-brand-red-hover: #cc0000;
        --yt-accent: #ff0000;
        --yt-accent-hover: #cc0000;
        --yt-success: #0fb556;
        --yt-error: #ff4444;
        --yt-warning: #ff9800;
        --yt-space-xs: 4px;
        --yt-space-sm: 8px;
        --yt-space-md: 12px;
        --yt-space-lg: 16px;
        --yt-space-xl: 24px;
        --yt-radius-sm: 2px;
        --yt-radius-md: 8px;
        --yt-radius-lg: 12px;
        --yt-radius-full: 999px;
        --yt-transition: 0.1s cubic-bezier(0.05, 0, 0, 1);
      }

      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      .planyt-widget-container {
        display: block;
        width: 100%;
        color: var(--yt-text-primary);
        font-family: "Roboto", "Arial", sans-serif;
        font-size: 14px;
        line-height: 1.4;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      .container {
        padding: var(--yt-space-lg);
      }

      .section {
        margin-bottom: var(--yt-space-md);
        padding: var(--yt-space-lg);
        background-color: var(--yt-bg-secondary);
        border-radius: var(--yt-radius-md);
        border: none;
      }

      .section-compact {
        padding: var(--yt-space-md);
        margin-bottom: var(--yt-space-xs);
      }

      .plans-title {
        font-size: 13px;
        font-weight: 500;
        color: var(--yt-text-primary);
        letter-spacing: 0.2px;
        margin-bottom: var(--yt-space-sm);
        display: block;
      }

      .progress-hero {
        display: flex;
        flex-direction: column;
        gap: var(--yt-space-sm);
        margin-bottom: var(--yt-space-md);
      }

      .progress-hero-empty,
      .progress-hero-complete {
        gap: var(--yt-space-xs);
      }

      .progress-hero-percent {
        font-size: 20px;
        font-weight: 500;
        color: var(--yt-text-primary);
        letter-spacing: -0.2px;
      }

      .progress-hero-empty .progress-hero-percent,
      .progress-hero-complete .progress-hero-percent {
        font-size: 15px;
      }

      .progress-hero-subtext {
        font-size: 12px;
        color: var(--yt-text-secondary);
        font-weight: 400;
      }

      .progress-bar-container-hero {
        height: 10px;
        margin-top: var(--yt-space-xs);
      }

      .progress-bar-container {
        width: 100%;
        height: 4px;
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        overflow: hidden;
      }

      .progress-bar {
        height: 100%;
        background-color: var(--yt-accent);
        transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 2px;
      }

      .today-card {
        background: rgba(255, 255, 255, 0.04);
        border-radius: var(--yt-radius-md);
        padding: var(--yt-space-sm) var(--yt-space-md);
      }

      .today-head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: var(--yt-space-xs);
        font-size: 13px;
        font-weight: 500;
      }

      .today-time {
        color: var(--yt-text-tertiary);
        font-size: 12px;
      }

      .today-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
        max-height: 180px;
        overflow-y: auto;
      }

      .today-item,
      .today-all {
        display: flex;
        align-items: flex-start;
        gap: var(--yt-space-sm);
        padding: 4px 0;
        cursor: pointer;
      }

      .today-item input,
      .today-all input {
        accent-color: var(--yt-accent);
        margin-top: 2px;
        cursor: pointer;
      }

      .today-item-text {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .today-item-title {
        color: var(--yt-text-primary);
        text-decoration: none;
        font-size: 13px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .today-item-title:hover {
        text-decoration: underline;
      }

      .today-item.done .today-item-title {
        text-decoration: line-through;
        color: var(--yt-text-tertiary);
      }

      .today-item-meta {
        font-size: 11px;
        color: var(--yt-text-tertiary);
      }

      .today-all {
        margin-top: var(--yt-space-xs);
        padding-top: var(--yt-space-sm);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 13px;
        font-weight: 500;
      }

      .cta-only {
        padding: var(--yt-space-sm) 0;
      }

      .plans-footer {
        margin-top: var(--yt-space-md);
        margin-bottom: var(--yt-space-md);
      }

      .btn {
        width: 100%;
        padding: 10px 16px;
        font-size: 14px;
        font-weight: 500;
        border: none;
        border-radius: var(--yt-radius-full);
        cursor: pointer;
        transition: all var(--yt-transition);
        text-align: center;
        font-family: "Roboto", sans-serif;
        letter-spacing: 0.2px;
      }

      .btn-secondary {
        background-color: var(--yt-accent);
        color: #ffffff;
        border: 1px solid var(--yt-accent);
      }

      .btn-secondary:hover {
        background-color: var(--yt-accent-hover);
      }

      .btn-secondary:active {
        opacity: 0.9;
      }

      .btn-small {
        width: auto;
        padding: 6px 14px;
        font-size: 12px;
        background-color: rgba(80, 0, 0, 0.45);
        color: var(--yt-text-primary);
        border-radius: var(--yt-radius-full);
      }

      .btn-small:hover {
        background-color: rgba(80, 0, 0, 0.6);
      }

      @media (max-width: 500px) {
        .container {
          padding: var(--yt-space-md);
        }

        .section-compact {
          padding: var(--yt-space-md);
        }

        .progress-hero-percent {
          font-size: 18px;
        }

      }
    `;
  }

  function setupHealthCheck() {
    setInterval(() => {
      if (!isPlaylistPage()) {
        return;
      }

      const widgetHost = document.getElementById(CONFIG.WIDGET_HOST_ID);

      // Only reinject if genuinely missing OR detached from live DOM tree
      if (!widgetHost || !widgetHost.isConnected) {
        console.warn('PlanYT: Widget missing or detached, reinjecting');
        STATE.initialized = false;
        initialize();
      }
    }, 2000);
  }

  if (isPlaylistPage()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initialize();
        setupNavigationListeners();
        setupStorageListener();
        setupHealthCheck();
      });
    } else {
      initialize();
      setupNavigationListeners();
      setupStorageListener();
      setupHealthCheck();
    }
  } else {
    setupNavigationListeners();
    setupStorageListener();
    setupHealthCheck();
  }
})();
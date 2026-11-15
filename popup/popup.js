/**
 * i18n Initialization
 * Applies Chrome i18n translations to all elements with data-i18n attributes.
 * Must run before any other UI code.
 */
function applyI18n() {
  // Text content
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.textContent = msg;
  });
  // Placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.placeholder = msg;
  });
  // Aria labels
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria');
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.setAttribute('aria-label', msg);
  });
}

document.addEventListener('DOMContentLoaded', applyI18n);

/**
 * popup.js
 * Main orchestration file - handles UI interactions and coordinates utility modules
 */

// ========================================
// DOM Element References
// ========================================
const elements = {
  // Plans Section
  plansSection: document.getElementById('plansSection'),
  plansList: document.getElementById('plansList'),
  addPlanBtn: document.getElementById('addPlanBtn'),
  
  // Playlist Section
  playlistSection: document.getElementById('playlistSection'),
  playlistUrlInput: document.getElementById('playlistUrlInput'),
  fetchPlaylistBtn: document.getElementById('fetchPlaylistBtn'),
  playlistSectionBackBtn: document.getElementById('playlistSectionBackBtn'),
  
  // UI States
  loadingIndicator: document.getElementById('loadingIndicator'),
  errorMessage: document.getElementById('errorMessage'),
  successSection: document.getElementById('successSection'),
  mainHeader: document.getElementById('mainHeader'),
  mainFooter: document.getElementById('mainFooter'),
  
  // Results Section
  resultsSection: document.getElementById('resultsSection'),
  playlistTitle: document.getElementById('playlistTitle'),
  videoCount: document.getElementById('videoCount'),
  totalDuration: document.getElementById('totalDuration'),
  
  // Progress Bar
  progressSection: document.getElementById('progressSection'),
  progressBar: document.getElementById('progressBar'),
  progressPercent: document.getElementById('progressPercent'),
  progressLabel: document.getElementById('progressLabel'),
  
  // Planner Input
  plannerInputSection: document.getElementById('plannerInputSection'),
  dailyWatchTimeInput: document.getElementById('dailyWatchTimeInput'),
  plannerInputBackBtn: document.getElementById('plannerInputBackBtn'),
  plannerInputNextBtn: document.getElementById('plannerInputNextBtn'),
  
  // Mode Picker
  modePickerSection: document.getElementById('modePickerSection'),
  modePickerBackBtn: document.getElementById('modePickerBackBtn'),
  modeVideoByVideoBtn: document.getElementById('modeVideoByVideoBtn'),
  modeCustomBtn: document.getElementById('modeCustomBtn'),
  
  // Speed Picker
  speedPickerSection: document.getElementById('speedPickerSection'),
  speedPickerBackBtn: document.getElementById('speedPickerBackBtn'),
  speedPickerNextBtn: document.getElementById('speedPickerNextBtn'),
  speedSlider: document.getElementById('speedSlider'),
  speedValueDisplay: document.getElementById('speedValueDisplay'),
  speedHintText: document.getElementById('speedHintText'),
  generatePlanBtn: document.getElementById('finalGenerateBtn'),
  
  // Confirm Section
  confirmSection: document.getElementById('confirmSection'),
  confirmBackBtn: document.getElementById('confirmBackBtn'),
  confirmMode: document.getElementById('confirmMode'),
  confirmDailyTimeRow: document.getElementById('confirmDailyTimeRow'),
  confirmDailyTime: document.getElementById('confirmDailyTime'),
  confirmDaysRow: document.getElementById('confirmDaysRow'),
  confirmDays: document.getElementById('confirmDays'),
  confirmSpeedRow: document.getElementById('confirmSpeedRow'),
  confirmSpeed: document.getElementById('confirmSpeed'),
  
  // Dashboard
  dashboardSection: document.getElementById('dashboardSection'),
  dashboardBackBtn: document.getElementById('dashboardBackBtn'),
  dashboardTitle: document.getElementById('dashboardTitle'),
  donutFill: document.getElementById('donutFill'),
  donutPercent: document.getElementById('donutPercent'),
  statDaysLeft: document.getElementById('statDaysLeft'),
  statVideosDone: document.getElementById('statVideosDone'),
  statTimeLeft: document.getElementById('statTimeLeft'),
  startDayBtn: document.getElementById('startDayBtn'),

  // Plan Display
  planSection: document.getElementById('planSection'),
  planContainer: document.getElementById('planContainer'),
  resetBtn: document.getElementById('resetBtn')
};

// ========================================
// State Management
// ========================================
let appState = {
  playlistData: null,
  videos: [],
  plan: [],
  currentPlanId: null,
  dailyWatchTime: 0,
  isAddingNewPlan: false,
  dashboardOpen: false,
  isFetching: false,
  isUpdatingCompletion: false,
  plansCache: [],
  wizardStep: 'enter-url',
  mode: 'custom',
  playbackSpeed: 1.0
};

// ========================================
// Initialization
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Extension loaded');
  attachEventListeners();

  // Check for a pending action placed by the content-script/widget
  const pending = await getPendingPopupAction();

  await migrateLegacyStorage();

  // Load plans first so we can resolve open/create actions without flashing old state
  await loadAndDisplayPlans();

  if (pending) {
    await handlePendingPopupAction(pending);
  }

  renderUI();
  setupStorageSync();
});

// Retrieve and consume any pending popup action from storage
function getPendingPopupAction() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(['pendingPopupAction'], (result) => {
        const pending = result && result.pendingPopupAction ? result.pendingPopupAction : null;
        if (pending) {
          // Clear pending action after reading to avoid reprocessing
          chrome.storage.local.remove(['pendingPopupAction'], () => {
            resolve(pending);
          });
        } else {
          resolve(null);
        }
      });
    } catch (error) {
      console.error('Error reading pendingPopupAction:', error);
      resolve(null);
    }
  });
}

async function handlePendingPopupAction(pending) {
  if (!pending || !pending.type) return;

  try {
    if (pending.type === 'openPlan') {
      const playlistId = pending.playlistId || null;
      if (!playlistId) return;

      // Try to find a matching saved plan by playlistId
      const match = (appState.plansCache || []).find(p => {
        try {
          const pid = extractPlaylistId(p.playlistUrl || p.playlistUrl || '');
          return pid === playlistId;
        } catch (e) {
          return false;
        }
      });

      if (match) {
        // Select and render the matched plan without showing previous plan first
        await handlePlanSelect(match.id);
        return;
      }

      // Not found: stay on the plans list
      return;
    }

    if (pending.type === 'createPlan') {
      // Prefill playlist URL and trigger fetch
      appState.isAddingNewPlan = true;
      appState.playlistData = null;
      appState.plan = [];
      hideError();
      hideSuccessScreen();

      const url = pending.playlistUrl || (pending.playlistId ? `https://www.youtube.com/playlist?list=${pending.playlistId}` : '');
      elements.playlistUrlInput.value = url;

      renderUI();

      // Mark that after fetch we should focus the daily minutes input
      appState.pendingAutoFocusDaily = true;

      // Trigger existing fetch flow (reuse logic)
      await handleFetchPlaylist();

      // After fetch completes, focus the daily input if available
      try {
        if (elements.dailyWatchTimeInput && appState.pendingAutoFocusDaily) {
          elements.dailyWatchTimeInput.focus();
          appState.pendingAutoFocusDaily = false;
        }
      } catch (e) {
        console.error('Could not focus daily input:', e);
      }

      return;
    }
  } catch (error) {
    console.error('Error handling pending popup action:', error);
  }
}

// ========================================
// Event Listeners
// ========================================
let listenersAttached = false;
function attachEventListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  // Add New Plan
  elements.addPlanBtn.addEventListener('click', handleAddNewPlan);

  // Dashboard
  elements.dashboardBackBtn.addEventListener('click', () => {
    appState.dashboardOpen = false;
    renderUI();
  });
  elements.startDayBtn.addEventListener('click', handleStartDay);

  // Fetch Playlist
  elements.fetchPlaylistBtn.addEventListener('click', handleFetchPlaylist);
  
  // Generate Plan
  elements.generatePlanBtn.addEventListener('click', handleGeneratePlan);
  
  // Reset
  elements.resetBtn.addEventListener('click', handleReset);

  // Playlist Section Back Button
  elements.playlistSectionBackBtn.addEventListener('click', () => {
    appState.isAddingNewPlan = false;
    renderUI();
  });

  // Mode Picker Back
  elements.modePickerBackBtn.addEventListener('click', () => {
    appState.wizardStep = 'enter-url';
    renderUI();
  });

  // Mode Picker Cards Selection
  elements.modeVideoByVideoBtn.addEventListener('click', () => {
    appState.mode = 'video-by-video';
    appState.wizardStep = 'confirm';
    renderUI();
  });

  elements.modeCustomBtn.addEventListener('click', () => {
    appState.mode = 'custom';
    appState.wizardStep = 'daily-time';
    renderUI();
  });

  // Planner Input Back & Next
  elements.plannerInputBackBtn.addEventListener('click', () => {
    appState.wizardStep = 'mode-picker';
    renderUI();
  });

  elements.plannerInputNextBtn.addEventListener('click', () => {
    const dailyTime = parseInt(elements.dailyWatchTimeInput.value);
    if (!dailyTime || dailyTime <= 0) {
      showError('Please enter a valid daily watch time');
      return;
    }
    appState.dailyWatchTime = dailyTime;
    appState.wizardStep = 'speed-picker';
    renderUI();
  });

  // Speed Picker Back & Next
  elements.speedPickerBackBtn.addEventListener('click', () => {
    appState.wizardStep = 'daily-time';
    renderUI();
  });

  elements.speedPickerNextBtn.addEventListener('click', () => {
    appState.wizardStep = 'confirm';
    renderUI();
  });

  // Confirm Back
  elements.confirmBackBtn.addEventListener('click', () => {
    appState.wizardStep = appState.mode === 'video-by-video' ? 'mode-picker' : 'speed-picker';
    renderUI();
  });

  // Speed Slider input event
  if (elements.speedSlider) {
    elements.speedSlider.addEventListener('input', (e) => {
      updateSpeedFromSlider(parseInt(e.target.value));
    });
  }

  // Speed Tick Labels Click/Tap
  const tickLabels = document.querySelectorAll('.tick-label');
  tickLabels.forEach(tick => {
    tick.addEventListener('click', () => {
      const idx = parseInt(tick.dataset.index);
      if (elements.speedSlider) {
        elements.speedSlider.value = idx;
      }
      updateSpeedFromSlider(idx);
    });
  });
}

const SPEED_VALUES = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
const SPEED_LABELS = ['0.25', '0.5', '0.75', '1', '1.25', '1.5', '1.75', '2'];

function updateSpeedFromSlider(index) {
  const speed = SPEED_VALUES[index];
  appState.playbackSpeed = speed;
  
  if (elements.speedValueDisplay) {
    elements.speedValueDisplay.textContent = SPEED_LABELS[index] + '×';
  }
  
  const tickLabels = document.querySelectorAll('.tick-label');
  tickLabels.forEach((tick, idx) => {
    if (idx === index) {
      tick.classList.add('active');
    } else {
      tick.classList.remove('active');
    }
  });
  
  updateSpeedHint();
}

function updateSpeedHint() {
  if (!elements.speedHintText) return;
  
  const speed = appState.playbackSpeed || 1.0;
  
  if (appState.mode === 'custom') {
    const dailyMinutes = appState.dailyWatchTime || 30;
    const effective = Math.round(dailyMinutes * speed);
    elements.speedHintText.textContent = `Your ${dailyMinutes} min/day becomes effectively ~${effective} min of content`;
  }
}

function renderUI() {
  hideSuccessScreen();

  if (appState.isAddingNewPlan) {
    hideSection(elements.plansSection);
    hideSection(elements.addPlanBtn);
    hideSection(elements.dashboardSection);
    hideSection(elements.planSection);
    hideSection(elements.progressSection);
    hideSection(elements.confirmSection);

    if (appState.playlistData) {
      displayPlaylistSummary(appState.playlistData);
    }

    if (appState.wizardStep === 'enter-url') {
      showSection(elements.playlistSection);
      hideSection(elements.resultsSection);
      hideSection(elements.modePickerSection);
      hideSection(elements.plannerInputSection);
      hideSection(elements.speedPickerSection);
    } else if (appState.wizardStep === 'mode-picker') {
      hideSection(elements.playlistSection);
      showSection(elements.resultsSection);
      showSection(elements.modePickerSection);
      hideSection(elements.plannerInputSection);
      hideSection(elements.speedPickerSection);
    } else if (appState.wizardStep === 'daily-time') {
      hideSection(elements.playlistSection);
      showSection(elements.resultsSection);
      hideSection(elements.modePickerSection);
      showSection(elements.plannerInputSection);
      hideSection(elements.speedPickerSection);
    } else if (appState.wizardStep === 'speed-picker') {
      hideSection(elements.playlistSection);
      showSection(elements.resultsSection);
      hideSection(elements.modePickerSection);
      hideSection(elements.plannerInputSection);
      showSection(elements.speedPickerSection);
      
      const sliderVal = SPEED_VALUES.indexOf(appState.playbackSpeed);
      const val = sliderVal >= 0 ? sliderVal : 3;
      if (elements.speedSlider) {
        elements.speedSlider.value = val;
      }
      updateSpeedFromSlider(val);
    } else if (appState.wizardStep === 'confirm') {
      hideSection(elements.playlistSection);
      showSection(elements.resultsSection);
      hideSection(elements.modePickerSection);
      hideSection(elements.plannerInputSection);
      hideSection(elements.speedPickerSection);
      showSection(elements.confirmSection);

      elements.confirmMode.textContent = appState.mode === 'video-by-video' ? 'Video by Video' : 'Custom Schedule';
      if (appState.mode === 'video-by-video') {
        hideSection(elements.confirmDailyTimeRow);
        hideSection(elements.confirmSpeedRow);
        showSection(elements.confirmDaysRow);
        const pd = appState.playlistData || {};
        elements.confirmDays.textContent = (pd.videos && pd.videos.length) || pd.videoCount || 0;
      } else {
        hideSection(elements.confirmDaysRow);
        showSection(elements.confirmDailyTimeRow);
        showSection(elements.confirmSpeedRow);
        elements.confirmDailyTime.textContent = formatMinutes(appState.dailyWatchTime);
        elements.confirmSpeed.textContent = appState.playbackSpeed + 'x';
      }
    }
    return;
  }

  hideSection(elements.playlistSection);
  hideSection(elements.modePickerSection);
  hideSection(elements.plannerInputSection);
  hideSection(elements.speedPickerSection);
  hideSection(elements.confirmSection);
  hideSection(elements.resultsSection);
  hideSection(elements.progressSection);

  const hasPlan = appState.currentPlanId && appState.plan && appState.plan.length > 0;

  if (appState.dashboardOpen && hasPlan) {
    hideSection(elements.plansSection);
    hideSection(elements.addPlanBtn);
    showSection(elements.dashboardSection);
    renderDashboard();
    renderPlan(appState.plan);
    showSection(elements.planSection);
  } else {
    appState.dashboardOpen = false;
    showSection(elements.plansSection);
    showSection(elements.addPlanBtn);
    hideSection(elements.dashboardSection);
    hideSection(elements.planSection);
  }
}

function clearActivePlanUI() {
  if (elements.planContainer) {
    elements.planContainer.innerHTML = '';
  }
  hideSection(elements.resultsSection);
  hideSection(elements.progressSection);
  hideSection(elements.planSection);
  hideSection(elements.dashboardSection);
}

function scrollToPlannerInput() {
  try {
    if (!elements.plannerInputSection || elements.plannerInputSection.classList.contains('hidden')) return;
    elements.plannerInputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    console.error('Error autoscrolling to planner input:', error);
  }
}

function scrollToFirstIncompleteDay() {
  try {
    if (!elements.planContainer) return;
    const firstIncomplete = elements.planContainer.querySelector('.day-card:not(.completed)');
    if (!firstIncomplete) return;

    const containerRect = elements.planContainer.getBoundingClientRect();
    const cardRect = firstIncomplete.getBoundingClientRect();
    const offset = cardRect.top - containerRect.top + elements.planContainer.scrollTop - 8;

    elements.planContainer.scrollTo({ top: offset, behavior: 'smooth' });
  } catch (error) {
    console.error('Error autoscrolling plan container:', error);
  }
}

function applyPlanToState(plan) {
  // Calculate total duration from plan data
  let totalDuration = 0;
  if (plan.planData && Array.isArray(plan.planData)) {
    totalDuration = plan.planData.reduce((sum, day) => {
      return sum + (day.totalTime || 0);
    }, 0);
  }
  
  appState.playlistData = {
    id: plan.playlistUrl || '',
    url: plan.playlistUrl || '',
    title: plan.title,
    videoCount: plan.totalVideos,
    totalDuration: totalDuration,
    videos: []
  };
  appState.plan = Array.isArray(plan.planData) ? plan.planData.map(day => ({
    ...day,
    videos: Array.isArray(day.videos) ? [...day.videos] : []
  })) : [];
  appState.dailyWatchTime = plan.dailyMinutes || 0;
  elements.dailyWatchTimeInput.value = appState.dailyWatchTime || '';
  appState.playbackSpeed = plan.playbackSpeed || 1.0;
  appState.mode = plan.mode || 'custom';
}

function handleAddNewPlan() {
  appState.isAddingNewPlan = true;
  appState.dashboardOpen = false;
  appState.playlistData = null;
  appState.plan = [];
  appState.wizardStep = 'enter-url';
  appState.mode = 'custom';
  appState.playbackSpeed = 1.0;
  elements.playlistUrlInput.value = '';
  elements.dailyWatchTimeInput.value = '';
  hideError();
  hideSuccessScreen();
  renderUI();
}

// ========================================
// Plans Management Functions
// ========================================
async function loadAndDisplayPlans() {
  try {
    // Defensive check: validate activePlanId points to existing plan
    const plansData = await validateAndFixPlansState();
    appState.currentPlanId = plansData.activePlanId || null;

    const recalculatedPlans = (plansData.plans || []).map(plan => {
      return {
        ...plan,
        progress: deriveProgressFromPlanData(plan.planData)
      };
    });

    appState.plansCache = recalculatedPlans;

    if (!appState.currentPlanId || appState.plansCache.length === 0) {
      clearActivePlanUI();
    }

    renderPlansList(appState.plansCache, appState.currentPlanId);
    showSection(elements.plansSection);
  } catch (error) {
    console.error('Error loading plans:', error);
    appState.plansCache = [];
    clearActivePlanUI();
    renderPlansList([], null);
    showSection(elements.plansSection);
  }
}

function renderPlansList(plans, activePlanId) {
  elements.plansList.innerHTML = '';

  if (!plans || plans.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'plan-item plan-item-empty';
    empty.textContent = 'No plans yet. Create one to get started.';
    elements.plansList.appendChild(empty);
    return;
  }
  
  plans.forEach(plan => {
    const planItem = document.createElement('div');
    planItem.className = `plan-item ${plan.id === activePlanId ? 'active' : ''}`;
    planItem.dataset.planId = plan.id;
    planItem.addEventListener('click', () => handlePlanSelect(plan.id));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'plan-item-delete';
    deleteBtn.type = 'button';
    deleteBtn.setAttribute('aria-label', `Delete plan ${plan.title}`);
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      handlePlanDelete(plan.id);
    });
    
    // Plain text title (no redirect)
    const title = document.createElement('div');
    title.className = 'plan-item-title';
    title.textContent = plan.title;
    
    const progress = deriveProgressFromPlanData(plan.planData);
    const progressPercent = progress.percent;
    
    const subtext = document.createElement('div');
    subtext.className = 'plan-item-subtext';
    subtext.textContent = `${progressPercent}% completed`;
    
    // Create progress bar
    const progressBarContainer = document.createElement('div');
    progressBarContainer.className = 'plan-item-progress-bar';
    
    const progressBarFill = document.createElement('div');
    progressBarFill.className = 'plan-item-progress-fill';
    progressBarFill.style.width = `${progressPercent}%`;
    
    progressBarContainer.appendChild(progressBarFill);
    
    planItem.appendChild(deleteBtn);
    planItem.appendChild(title);
    planItem.appendChild(subtext);
    planItem.appendChild(progressBarContainer);
    elements.plansList.appendChild(planItem);
  });
}

async function handlePlanSelect(planId) {
  try {
    const fresh = await getPlanById(planId);
    if (!fresh) {
      showError('Plan not found');
      await loadAndDisplayPlans();
      return;
    }
    await setActivePlan(planId);
    appState.currentPlanId = planId;
    appState.isAddingNewPlan = false;
    appState.dashboardOpen = true;

    applyPlanToState(fresh);

    // Reload plans list to update active state
    await loadAndDisplayPlans();

    renderUI();
  } catch (error) {
    showError('Failed to load plan: ' + error.message);
  }
}

async function handlePlanDelete(planId) {
  if (!planId) return;

  const confirmDelete = confirm('Delete this plan? This cannot be undone.');
  if (!confirmDelete) return;

  try {
    const result = await deletePlan(planId);

    if (appState.currentPlanId === planId) {
      appState.currentPlanId = result.activePlanId;
      appState.plan = [];
      appState.playlistData = null;
    }
    appState.dashboardOpen = false;

    await loadAndDisplayPlans();
    renderUI();
  } catch (error) {
    showError('Failed to delete plan: ' + error.message);
  }
}

function renderDashboard() {
  const progress = PlanYTProgress.derive(appState.plan);
  const data = appState.playlistData || {};

  // Title (clickable -> playlist on YouTube)
  elements.dashboardTitle.textContent = data.title || '';
  elements.dashboardTitle.title = data.url ? 'Open playlist on YouTube' : '';
  elements.dashboardTitle.onclick = data.url ? () => chrome.tabs.create({ url: data.url }) : null;

  // Donut
  const circumference = 2 * Math.PI * 50;
  elements.donutFill.setAttribute('stroke-dasharray', `${(progress.percent / 100) * circumference} ${circumference}`);
  elements.donutPercent.textContent = progress.percent + '%';

  // Stats
  elements.statDaysLeft.textContent = Math.max(0, progress.totalDays - progress.completedDays);
  elements.statVideosDone.textContent = `${progress.completedVideos}/${progress.totalVideos}`;
  elements.statTimeLeft.textContent = formatMinutes(progress.remainingMinutes);

  // Start / continue button
  const next = PlanYTProgress.nextSegment(appState.plan);
  if (!next) {
    elements.startDayBtn.textContent = 'Plan completed \uD83C\uDF89';
    elements.startDayBtn.disabled = true;
  } else {
    const day = appState.plan[next.dayIndex];
    const dayStarted = day.videos.some(v => v.completed);
    elements.startDayBtn.textContent = `${dayStarted ? 'Continue' : 'Start'} Day ${day.day}`;
    elements.startDayBtn.disabled = false;
  }
}

function handleStartDay() {
  const next = PlanYTProgress.nextSegment(appState.plan);
  if (!next) return;
  const playlistId = extractPlaylistId(appState.playlistData && appState.playlistData.url);
  const url = PlanYTProgress.segmentUrl(next.segment, playlistId);
  if (url) chrome.tabs.create({ url });
}

// Keep an open popup in sync with changes made from the YouTube widget
function setupStorageSync() {
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'local' || !changes.playlistPlans) return;
    if (appState.isAddingNewPlan || appState.isUpdatingCompletion) return;
    try {
      await loadAndDisplayPlans();
      if (appState.dashboardOpen && appState.currentPlanId) {
        const fresh = await getPlanById(appState.currentPlanId);
        if (!fresh) {
          appState.dashboardOpen = false;
        } else if (JSON.stringify(fresh.planData) !== JSON.stringify(appState.plan)) {
          applyPlanToState(fresh);
        } else {
          return;
        }
        renderUI();
      }
    } catch (error) {
      console.error('Storage sync failed:', error);
    }
  });
}

// ========================================
// Handler Functions
// ========================================
async function handleFetchPlaylist() {
  const url = elements.playlistUrlInput.value.trim();
  
  if (!url) {
    showError('Please enter a playlist URL');
    return;
  }
  
  // Extract playlist ID from URL
  const playlistId = extractPlaylistId(url);
  if (!playlistId) {
    showError('Invalid playlist URL. Use format: https://www.youtube.com/playlist?list=...');
    return;
  }

  if (appState.isFetching) return;
  
  try {
    appState.isFetching = true;
    showLoading(true);
    hideError();
    
    // Fetch complete playlist data from backend (includes videos with durations)
    const playlistData = await fetchPlaylistData(playlistId);
    
    // Backend already provides durationMinutes, so calculate total
    const totalDurationMinutes = playlistData.videos.reduce((sum, video) => sum + video.durationMinutes, 0);
    
    // Construct the full playlist URL
    const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
    
    // Store in app state
    appState.playlistData = {
      id: playlistId,
      url: playlistUrl,
      title: playlistData.title,
      videoCount: playlistData.videoCount,
      totalDuration: totalDurationMinutes,
      videos: playlistData.videos
    };
    
    appState.wizardStep = 'mode-picker';
    renderUI();
    showLoading(false);
    
  } catch (error) {
    showLoading(false);
    showError(`Error: ${error.message}`);
    console.error('Fetch error:', error);
  } finally {
    appState.isFetching = false;
  }
}

async function handleGeneratePlan() {
  const generateButton = elements.generatePlanBtn;
  if (generateButton) {
    generateButton.disabled = true;
  }
  hideError();
  hideSuccessScreen();

  const dailyTime = appState.mode === 'video-by-video' ? 0 : parseInt(elements.dailyWatchTimeInput.value);
  let shouldClose = false;
  
  try {
    if (appState.mode === 'custom' && (!dailyTime || dailyTime <= 0)) {
      showError('Please enter a valid daily watch time');
      return;
    }
    
    if (!appState.playlistData || !appState.playlistData.videos) {
      showError('Please fetch a playlist first');
      return;
    }

    if (appState.playlistData.videos.length === 0) {
      showError('This playlist has no videos. Please choose another playlist.');
      return;
    }

    const speed = appState.playbackSpeed || 1.0;
    
    // Generate plan
    let plan = [];
    if (appState.mode === 'video-by-video') {
      plan = generateVideoByVideoplan(appState.playlistData.videos);
    } else {
      plan = generateDayWisePlan(appState.playlistData.videos, dailyTime, speed);
    }
    
    if (plan.length === 0) {
      showError('Could not generate plan. Please check your inputs.');
      return;
    }
    
    // Store plan in state
    appState.plan = plan;
    appState.dailyWatchTime = dailyTime;

    // Save as a new plan in the plans system (atomic activePlanId update)
    const newPlan = await createPlan(
      appState.playlistData,
      dailyTime,
      plan,
      appState.mode === 'video-by-video' ? null : speed,
      appState.mode
    );
    appState.currentPlanId = newPlan.id;

    showSuccessScreen();
    shouldClose = true;
    
  } catch (error) {
    showError(`Error generating plan: ${error.message}`);
    console.error('Plan generation error:', error);
  } finally {
    if (!shouldClose && generateButton) {
      generateButton.disabled = false;
    }
  }

  if (shouldClose) {
    setTimeout(() => {
      window.close();
    }, 1000);
  }
}

async function handleReset() {
  if (confirm('Are you sure you want to reset? This will clear all saved data and refresh the extension.')) {
    try {
      await clearAllStorage();
      location.reload();
    } catch (error) {
      showError('Failed to reset: ' + error.message);
    }
  }
}

// ========================================
// UI Helper Functions
// ========================================
function showLoading(show = true) {
  if (show) {
    elements.loadingIndicator.classList.remove('hidden');
    elements.fetchPlaylistBtn.disabled = true;
  } else {
    elements.loadingIndicator.classList.add('hidden');
    elements.fetchPlaylistBtn.disabled = false;
  }
}

function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorMessage.classList.remove('hidden');
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    elements.errorMessage.classList.add('hidden');
  }, 5000);
}

function hideError() {
  elements.errorMessage.classList.add('hidden');
}

function showSuccessScreen() {
  hideError();
  hideSection(elements.plansSection);
  hideSection(elements.playlistSection);
  hideSection(elements.resultsSection);
  hideSection(elements.progressSection);
  hideSection(elements.plannerInputSection);
  hideSection(elements.planSection);
  hideSection(elements.loadingIndicator);
  hideSection(elements.dashboardSection);
  hideSection(elements.mainHeader);
  hideSection(elements.mainFooter);
  elements.successSection.classList.remove('hidden');
}

function hideSuccessScreen() {
  elements.successSection.classList.add('hidden');
  showSection(elements.mainHeader);
  showSection(elements.mainFooter);
}

function showMessage(message, type = 'info') {
  // Simple console log for now
  console.log(`[${type.toUpperCase()}] ${message}`);
}

function showSection(section) {
  section.classList.remove('hidden');
}

function hideSection(section) {
  section.classList.add('hidden');
}

// ========================================
// Data Display Functions
// ========================================
function displayPlaylistSummary(data) {
  // Clear previous content
  elements.playlistTitle.innerHTML = '';
  
  // Check if we have a playlist URL to make it clickable
  if (data && data.url) {
    // Create clickable link (no icon)
    const titleLink = document.createElement('a');
    titleLink.href = '#';
    titleLink.className = 'playlist-title-link';
    titleLink.textContent = data.title;
    titleLink.setAttribute('aria-label', `Open ${data.title} on YouTube`);
    titleLink.setAttribute('title', 'Click to open playlist on YouTube');
    
    // Add click handler using chrome.tabs.create for extension compatibility
    titleLink.addEventListener('click', (event) => {
      event.preventDefault();
      if (data.url) {
        chrome.tabs.create({ url: data.url });
      }
    });
    
    // Add keyboard accessibility
    titleLink.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (data.url) {
          chrome.tabs.create({ url: data.url });
        }
      }
    });
    
    elements.playlistTitle.appendChild(titleLink);
  } else {
    // Fallback to plain text if no URL
    elements.playlistTitle.textContent = data.title;
  }
  
  elements.videoCount.textContent = data.videoCount;
  elements.totalDuration.textContent = formatMinutes(data.totalDuration);
  
  // Show results section
  showSection(elements.resultsSection);
}

function renderPlan(plan) {
  // Clear existing content
  elements.planContainer.innerHTML = '';
  
  if (!plan || plan.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.textContent = 'No plan generated';
    emptyMessage.style.color = 'var(--text-secondary)';
    elements.planContainer.appendChild(emptyMessage);
    return;
  }
  
  // Create a card for each day
  plan.forEach((dayData, index) => {
    const dayCard = createDayCard(dayData, index);
    elements.planContainer.appendChild(dayCard);
  });

  setTimeout(scrollToFirstIncompleteDay, 0);
}

function replaceDayCard(index, newDayData) {
  const oldCard = elements.planContainer.querySelector(`[data-day-index="${index}"]`);
  if (oldCard) {
    const newCard = createDayCard(newDayData, index);
    oldCard.replaceWith(newCard);
  }
}

function createDayCard(dayData, index) {
  const card = document.createElement('div');
  card.className = `day-card ${dayData.completed ? 'completed' : ''}`;
  card.dataset.dayIndex = index;
  
  // Day header (Day number + total time)
  const header = document.createElement('div');
  header.className = 'day-header';
  
  const title = document.createElement('div');
  title.className = 'day-title';
  title.textContent = `Day ${dayData.day}`;
  
  const duration = document.createElement('div');
  duration.className = 'day-duration';
  duration.textContent = formatMinutes(dayData.totalTime);
  
  header.appendChild(title);
  header.appendChild(duration);
  card.appendChild(header);
  
  // Video list
  const videoList = document.createElement('ul');
  videoList.className = 'video-list';
  
  const videos = Array.isArray(dayData.videos) ? dayData.videos : [];
  videos.forEach((video, videoIdx) => {
    const videoItem = document.createElement('li');
    videoItem.className = `video-item ${video.completed ? 'video-completed' : ''}`;
    
    {
      // Create video checkbox (all modes)
      const videoCheckbox = document.createElement('input');
      videoCheckbox.type = 'checkbox';
      videoCheckbox.className = 'video-checkbox';
      videoCheckbox.id = `day-${index}-video-${videoIdx}-checkbox`;
      videoCheckbox.checked = video.completed || false;
      videoCheckbox.addEventListener('change', (e) => handleVideoCompletion(index, videoIdx, e.target.checked));
      
      videoItem.appendChild(videoCheckbox);
      
      // Create content container
      const contentContainer = document.createElement('div');
      contentContainer.className = 'video-content-container';
      
      const titleSpan = document.createElement('span');
      titleSpan.className = 'video-title';
      titleSpan.textContent = video.title;
      contentContainer.appendChild(titleSpan);
      
      const metaDiv = document.createElement('div');
      metaDiv.className = 'video-meta-row';
      
      let timeRangeStr = '';
      if (video.isPartial) {
        const startTimeStr = video.startTime ? formatMinutes(video.startTime) : '0:00';
        const endTimeStr = video.endTime ? formatMinutes(video.endTime) : 'end';
        timeRangeStr = `(${startTimeStr} - ${endTimeStr}) `;
      }
      timeRangeStr += `[${formatMinutes(video.duration)}]`;
      
      const timeRangeLabel = document.createElement('span');
      timeRangeLabel.className = 'video-time-range';
      timeRangeLabel.textContent = timeRangeStr;
      metaDiv.appendChild(timeRangeLabel);
      
      if (video.isPartial) {
        const partialBadge = document.createElement('span');
        partialBadge.className = 'partial-badge';
        partialBadge.textContent = 'partial';
        metaDiv.appendChild(partialBadge);
      }
      
      contentContainer.appendChild(metaDiv);
      videoItem.appendChild(contentContainer);
    }

    videoList.appendChild(videoItem);
  });
  
  card.appendChild(videoList);
  
  // Day-level checkbox only for custom plans (video-by-video has one video per day)
  if (appState.mode !== 'custom') return card;

  const checkboxContainer = document.createElement('div');
  checkboxContainer.className = 'checkbox-container';
  
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = `day-${index}-checkbox`;
  checkbox.checked = dayData.completed;
  checkbox.addEventListener('change', (e) => handleDayCompletion(index, e.target.checked));
  
  const label = document.createElement('label');
  label.htmlFor = `day-${index}-checkbox`;
  label.textContent = 'Mark day as completed';
  
  checkboxContainer.appendChild(checkbox);
  checkboxContainer.appendChild(label);
  card.appendChild(checkboxContainer);
  
  return card;
}

async function handleVideoCompletion(dayIndex, videoIndex, completed) {
  if (appState.isUpdatingCompletion) return;
  if (!appState.plan[dayIndex] || !appState.plan[dayIndex].videos[videoIndex]) return;

  appState.isUpdatingCompletion = true;
  try {
    // Update local state
    appState.plan[dayIndex].videos[videoIndex].completed = completed;
    const allCompleted = appState.plan[dayIndex].videos.every(v => v.completed === true);
    appState.plan[dayIndex].completed = allCompleted;

    // Re-render only this card
    replaceDayCard(dayIndex, appState.plan[dayIndex]);

    // Save to storage using API helper
    if (appState.currentPlanId) {
      await toggleVideoCompleted(appState.currentPlanId, dayIndex, videoIndex, completed);
      await loadAndDisplayPlans();
    }

    renderDashboard();

    // Auto-scroll if the day was completed
    if (allCompleted) {
      setTimeout(scrollToFirstIncompleteDay, 100);
    }
  } catch (error) {
    console.error('Error updating video completion:', error);
  } finally {
    appState.isUpdatingCompletion = false;
  }
}

async function handleDayCompletion(dayIndex, completed) {
  if (appState.isUpdatingCompletion) return;
  if (!appState.plan[dayIndex]) return;

  appState.isUpdatingCompletion = true;
  try {
    // Update local state
    appState.plan[dayIndex].completed = completed;
    if (Array.isArray(appState.plan[dayIndex].videos)) {
      appState.plan[dayIndex].videos.forEach(v => {
        v.completed = completed;
      });
    }

    // Re-render only this card
    replaceDayCard(dayIndex, appState.plan[dayIndex]);

    // Save to storage using API helper
    if (appState.currentPlanId) {
      await toggleDayCompleted(appState.currentPlanId, dayIndex, completed);
      await loadAndDisplayPlans();
    }
    
    renderDashboard();
    
    // Auto-scroll to next incomplete day
    setTimeout(scrollToFirstIncompleteDay, 100);
  } catch (error) {
    console.error('Error updating day completion:', error);
  } finally {
    appState.isUpdatingCompletion = false;
  }
}

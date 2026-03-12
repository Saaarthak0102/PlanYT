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
  
  // UI States
  loadingIndicator: document.getElementById('loadingIndicator'),
  errorMessage: document.getElementById('errorMessage'),
  successSection: document.getElementById('successSection'),
  mainHeader: document.getElementById('mainHeader'),
  mainFooter: document.getElementById('mainFooter'),
  plansFooter: document.getElementById('plansFooter'),
  
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
  generatePlanBtn: document.getElementById('generatePlanBtn'),
  
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
  isFetching: false,
  isUpdatingCompletion: false,
  plansCache: []
};

// ========================================
// Initialization
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Extension loaded');
  attachEventListeners();

  await loadAndDisplayPlans();
  await restoreActivePlan();
  renderUI();
});

// ========================================
// Event Listeners
// ========================================
let listenersAttached = false;
function attachEventListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  // Add New Plan
  elements.addPlanBtn.addEventListener('click', handleAddNewPlan);

  // Fetch Playlist
  elements.fetchPlaylistBtn.addEventListener('click', handleFetchPlaylist);
  
  // Generate Plan
  elements.generatePlanBtn.addEventListener('click', handleGeneratePlan);
  
  // Reset
  elements.resetBtn.addEventListener('click', handleReset);
}

function renderUI() {
  hideSuccessScreen();
  showSection(elements.plansSection);

  if (appState.isAddingNewPlan) {
    showSection(elements.playlistSection);
    hideSection(elements.planSection);
    hideSection(elements.progressSection);

    if (appState.playlistData) {
      displayPlaylistSummary(appState.playlistData);
      showSection(elements.plannerInputSection);
      scrollToPlannerInput();
    } else {
      hideSection(elements.resultsSection);
      hideSection(elements.plannerInputSection);
    }

    return;
  }

  hideSection(elements.playlistSection);
  hideSection(elements.plannerInputSection);

  if (appState.currentPlanId && appState.plan && appState.plan.length > 0) {
    displayPlaylistSummary(appState.playlistData);
    renderPlan(appState.plan);
    showSection(elements.planSection);
    updateProgressBar(appState.currentPlanId);
  } else {
    hideSection(elements.resultsSection);
    hideSection(elements.progressSection);
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
}

function handleAddNewPlan() {
  appState.isAddingNewPlan = true;
  appState.playlistData = null;
  appState.plan = [];
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

async function restoreActivePlan() {
  if (!appState.currentPlanId) {
    clearActivePlanUI();
    return;
  }

  if (appState.currentPlanId) {
    const activePlan = appState.plansCache.find(plan => plan.id === appState.currentPlanId) || await getActivePlan();
    if (activePlan) {
      // Merge legacy saved completion (planData) when it matches the active plan
      try {
        const legacyPlanData = await getFromStorage('planData');
        const legacyHasPlan = legacyPlanData && Array.isArray(legacyPlanData.plan) && legacyPlanData.plan.length > 0;
        const matchesByTitle = legacyPlanData?.playlistData?.title && legacyPlanData.playlistData.title === activePlan.title;
        const matchesByPlaylistId = legacyPlanData?.playlistData?.id && legacyPlanData.playlistData.id === activePlan.playlistUrl;
        const sameLength = Array.isArray(activePlan.planData) && legacyPlanData?.plan?.length === activePlan.planData.length;

        if (legacyHasPlan && sameLength && (matchesByTitle || matchesByPlaylistId)) {
          activePlan.planData = legacyPlanData.plan;
          await updatePlanData(activePlan.id, legacyPlanData.plan);
        }
      } catch (error) {
        console.error('Error syncing legacy plan data:', error);
      }
      activePlan.progress = deriveProgressFromPlanData(activePlan.planData);
      applyPlanToState(activePlan);
      return;
    }
  }

  const savedPlanData = await getFromStorage('planData');
  if (savedPlanData && savedPlanData.plan && savedPlanData.plan.length > 0) {
    appState.playlistData = savedPlanData.playlistData;
    appState.plan = savedPlanData.plan;
    appState.dailyWatchTime = savedPlanData.dailyWatchTime;
    appState.currentPlanId = appState.currentPlanId || 'legacy-plan';
    appState.plansCache = appState.plansCache.length > 0 ? appState.plansCache : [
      {
        id: 'legacy-plan',
        title: savedPlanData.playlistData?.title || 'Saved Plan',
        playlistUrl: savedPlanData.playlistData?.url || savedPlanData.playlistData?.id || '',
        totalVideos: savedPlanData.playlistData?.videoCount || 0,
        totalDays: savedPlanData.plan.length,
        dailyMinutes: savedPlanData.dailyWatchTime,
        progress: deriveProgressFromPlanData(savedPlanData.plan),
        planData: savedPlanData.plan
      }
    ];
    renderPlansList(appState.plansCache, appState.currentPlanId);
    return;
  }

  clearActivePlanUI();
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
    planItem.addEventListener('click', () => handlePlanSelect(plan.id, plan));

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

async function handlePlanSelect(planId, plan) {
  try {
    await setActivePlan(planId);
    appState.currentPlanId = planId;
    appState.isAddingNewPlan = false;

    applyPlanToState(plan);
    
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

      if (appState.currentPlanId) {
        const nextPlan = appState.plansCache.find(p => p.id === appState.currentPlanId) || await getActivePlan();
        if (nextPlan) {
          applyPlanToState(nextPlan);
        } else {
          appState.plan = [];
          appState.playlistData = null;
        }
      } else {
        appState.plan = [];
        appState.playlistData = null;
      }
    }

    await loadAndDisplayPlans();
    renderUI();
  } catch (error) {
    showError('Failed to delete plan: ' + error.message);
  }
}

function updateProgressBar(planId) {
  if (!planId || !appState.plan || appState.plan.length === 0) {
    hideSection(elements.progressSection);
    return;
  }
  
  try {
    // Find the plan to get progress data
    const plans = document.querySelectorAll('.plan-item');
    let currentProgress = null;
    
    plans.forEach(item => {
      if (item.dataset.planId === planId) {
        // The progress is in appState (from the loaded plan)
      }
    });
    
    const progress = deriveProgressFromPlanData(appState.plan);
    const progressPercent = progress.percent;
    
    // Update UI
    elements.progressBar.style.width = progressPercent + '%';
    elements.progressPercent.textContent = progressPercent + '%';
    
    showSection(elements.progressSection);
  } catch (error) {
    console.error('Error updating progress bar:', error);
    hideSection(elements.progressSection);
  }
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
    
    renderUI();
    scrollToPlannerInput();
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
  generateButton.disabled = true;
  hideError();
  hideSuccessScreen();

  const dailyTime = parseInt(elements.dailyWatchTimeInput.value);
  let shouldClose = false;
  
  try {
    if (!dailyTime || dailyTime <= 0) {
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

    // Generate day-wise plan
    const plan = generateDayWisePlan(appState.playlistData.videos, dailyTime);
    
    if (plan.length === 0) {
      showError('Could not generate plan. Please check your inputs.');
      return;
    }
    
    // Store plan in state
    appState.plan = plan;
    appState.dailyWatchTime = dailyTime;

    // Save to storage for persistence (legacy + compatibility)
    await saveToStorage('planData', {
      playlistData: appState.playlistData,
      plan: appState.plan,
      dailyWatchTime: appState.dailyWatchTime
    });
    
    // Save as a new plan in the plans system (atomic activePlanId update)
    const newPlan = await createPlan(appState.playlistData, dailyTime, plan);
    appState.currentPlanId = newPlan.id;

    showSuccessScreen();
    shouldClose = true;
    
  } catch (error) {
    showError(`Error generating plan: ${error.message}`);
    console.error('Plan generation error:', error);
  } finally {
    if (!shouldClose) {
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
  hideSection(elements.plansFooter);
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
  videos.forEach(video => {
    const videoItem = document.createElement('li');
    videoItem.className = 'video-item';
    
    // Format video display (don't add bullet, CSS handles it)
    let videoText = video.title;
    
    if (video.isPartial) {
      const startTimeStr = video.startTime ? formatMinutes(video.startTime) : '0:00';
      const endTimeStr = video.endTime ? formatMinutes(video.endTime) : 'end';
      videoText += ` (${startTimeStr} - ${endTimeStr})`;
    }
    
    videoText += ` [${formatMinutes(video.duration)}]`;
    videoItem.textContent = videoText;
    
    videoList.appendChild(videoItem);
  });
  
  card.appendChild(videoList);
  
  // Checkbox for completion
  const checkboxContainer = document.createElement('div');
  checkboxContainer.className = 'checkbox-container';
  
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = `day-${index}-checkbox`;
  checkbox.checked = dayData.completed;
  checkbox.addEventListener('change', (e) => handleDayCompletion(index, e.target.checked));
  
  const label = document.createElement('label');
  label.htmlFor = `day-${index}-checkbox`;
  label.textContent = 'Mark as completed';
  
  checkboxContainer.appendChild(checkbox);
  checkboxContainer.appendChild(label);
  card.appendChild(checkboxContainer);
  
  return card;
}

async function handleDayCompletion(dayIndex, completed) {
  if (appState.isUpdatingCompletion) return;
  if (!appState.plan[dayIndex]) return;

  appState.isUpdatingCompletion = true;
  try {
    // Update state immutably
    const updatedPlan = appState.plan.map((day, index) => {
      if (index !== dayIndex) return day;
      return {
        ...day,
        completed
      };
    });
    appState.plan = updatedPlan;
    
    // Update UI
    const card = elements.planContainer.querySelector(`[data-day-index="${dayIndex}"]`);
    if (card) {
      if (completed) {
        card.classList.add('completed');
      } else {
        card.classList.remove('completed');
      }
    }
    
    // Save to storage
    await saveToStorage('planData', {
      playlistData: appState.playlistData,
      plan: appState.plan,
      dailyWatchTime: appState.dailyWatchTime
    });

    // Persist to plans system and refresh list
    if (appState.currentPlanId) {
      try {
        await updatePlanData(appState.currentPlanId, appState.plan);
        await loadAndDisplayPlans();
      } catch (error) {
        console.error('Error updating plan progress:', error);
      }
    }
    
    // Update progress bar
    updateProgressBar(appState.currentPlanId);
    
    // Auto-scroll to next incomplete day
    setTimeout(scrollToFirstIncompleteDay, 100);
  } finally {
    appState.isUpdatingCompletion = false;
  }
}

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
  
  // Playlist Section
  playlistUrlInput: document.getElementById('playlistUrlInput'),
  fetchPlaylistBtn: document.getElementById('fetchPlaylistBtn'),
  
  // UI States
  loadingIndicator: document.getElementById('loadingIndicator'),
  errorMessage: document.getElementById('errorMessage'),
  
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
  progressDay: document.getElementById('progressDay'),
  progressTotal: document.getElementById('progressTotal'),
  
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
  dailyWatchTime: 0
};

// ========================================
// Initialization
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Extension loaded');
  
  // Load plans and show them
  await loadAndDisplayPlans();
  
  // Load saved plan if exists
  const savedPlanData = await getFromStorage('planData');
  if (savedPlanData) {
    appState.playlistData = savedPlanData.playlistData;
    appState.plan = savedPlanData.plan;
    appState.dailyWatchTime = savedPlanData.dailyWatchTime;
    
    // Restore UI state
    displayPlaylistSummary(appState.playlistData);
    showSection(elements.plannerInputSection);
    elements.dailyWatchTimeInput.value = appState.dailyWatchTime;
    
    renderPlan(appState.plan);
    showSection(elements.planSection);
    
    // Update progress bar if plan exists
    if (savedPlanData.plan && savedPlanData.plan.length > 0) {
      updateProgressBar(appState.currentPlanId);
    }
    
    showMessage('Previous plan restored', 'success');
  }
  
  attachEventListeners();
});

// ========================================
// Event Listeners
// ========================================
function attachEventListeners() {
  // Fetch Playlist
  elements.fetchPlaylistBtn.addEventListener('click', handleFetchPlaylist);
  
  // Generate Plan
  elements.generatePlanBtn.addEventListener('click', handleGeneratePlan);
  
  // Reset
  elements.resetBtn.addEventListener('click', handleReset);
}

// ========================================
// Plans Management Functions
// ========================================
async function loadAndDisplayPlans() {
  try {
    const plans = await getAllPlans();
    appState.currentPlanId = (await getPlansData()).activePlanId;
    
    if (plans.length > 0) {
      renderPlansList(plans, appState.currentPlanId);
      showSection(elements.plansSection);
    } else {
      hideSection(elements.plansSection);
    }
  } catch (error) {
    console.error('Error loading plans:', error);
    hideSection(elements.plansSection);
  }
}

function renderPlansList(plans, activePlanId) {
  elements.plansList.innerHTML = '';
  
  plans.forEach(plan => {
    const planItem = document.createElement('div');
    planItem.className = `plan-item ${plan.id === activePlanId ? 'active' : ''}`;
    planItem.dataset.planId = plan.id;
    planItem.addEventListener('click', () => handlePlanSelect(plan.id, plan));
    
    const title = document.createElement('div');
    title.className = 'plan-item-title';
    title.textContent = plan.title;
    
    const subtext = document.createElement('div');
    subtext.className = 'plan-item-subtext';
    const currentDay = calculateCurrentDay(plan);
    subtext.textContent = `Day ${currentDay} of ${plan.totalDays}`;
    
    planItem.appendChild(title);
    planItem.appendChild(subtext);
    elements.plansList.appendChild(planItem);
  });
}

async function handlePlanSelect(planId, plan) {
  try {
    // Set as active
    await setActivePlan(planId);
    appState.currentPlanId = planId;
    
    // Update state
    appState.playlistData = {
      id: plan.playlistUrl || '',
      title: plan.title,
      videoCount: plan.totalVideos,
      totalDuration: 0, // Not stored, but not needed for display
      videos: []
    };
    appState.plan = plan.planData || [];
    appState.dailyWatchTime = plan.dailyMinutes;
    
    // Display
    displayPlaylistSummary(appState.playlistData);
    showSection(elements.plannerInputSection);
    elements.dailyWatchTimeInput.value = appState.dailyWatchTime;
    renderPlan(appState.plan);
    showSection(elements.planSection);
    
    // Update progress bar
    updateProgressBar(planId);
    
    // Update plans list UI
    document.querySelectorAll('.plan-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.planId === planId) {
        item.classList.add('active');
      }
    });
  } catch (error) {
    showError('Failed to load plan: ' + error.message);
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
    
    // Calculate progress from plan data
    let completedVideos = 0;
    appState.plan.forEach((dayData, dayIndex) => {
      if (dayData.completed) {
        completedVideos += dayData.videos.length;
      }
    });
    
    const totalVideos = appState.playlistData.videoCount || 0;
    const progressPercent = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;
    
    // Calculate current day
    let currentDay = 1;
    let videoCounter = 0;
    for (let i = 0; i < appState.plan.length; i++) {
      const videosInDay = appState.plan[i].videos.length;
      if (!appState.plan[i].completed) {
        currentDay = i + 1;
        break;
      }
      videoCounter += videosInDay;
    }
    
    // Update UI
    elements.progressBar.style.width = progressPercent + '%';
    elements.progressPercent.textContent = progressPercent + '%';
    elements.progressDay.textContent = currentDay;
    elements.progressTotal.textContent = appState.plan.length;
    
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
  
  try {
    showLoading(true);
    hideError();
    
    // Fetch complete playlist data from backend (includes videos with durations)
    const playlistData = await fetchPlaylistData(playlistId);
    
    // Backend already provides durationMinutes, so calculate total
    const totalDurationMinutes = playlistData.videos.reduce((sum, video) => sum + video.durationMinutes, 0);
    
    // Store in app state
    appState.playlistData = {
      id: playlistId,
      title: playlistData.title,
      videoCount: playlistData.videoCount,
      totalDuration: totalDurationMinutes,
      videos: playlistData.videos
    };
    
    // Display results
    displayPlaylistSummary(appState.playlistData);
    
    // Show planner input section
    showSection(elements.plannerInputSection);
    
    showLoading(false);
    
  } catch (error) {
    showLoading(false);
    showError(`Error: ${error.message}`);
    console.error('Fetch error:', error);
  }
}

async function handleGeneratePlan() {
  const dailyTime = parseInt(elements.dailyWatchTimeInput.value);
  
  if (!dailyTime || dailyTime <= 0) {
    showError('Please enter a valid daily watch time');
    return;
  }
  
  if (!appState.playlistData || !appState.playlistData.videos) {
    showError('Please fetch a playlist first');
    return;
  }
  
  try {
    // Generate day-wise plan
    const plan = generateDayWisePlan(appState.playlistData.videos, dailyTime);
    
    if (plan.length === 0) {
      showError('Could not generate plan. Please check your inputs.');
      return;
    }
    
    // Store plan in state
    appState.plan = plan;
    appState.dailyWatchTime = dailyTime;
    
    // Render plan UI
    renderPlan(plan);
    
    // Show plan section
    showSection(elements.planSection);
    
    // Save to storage for persistence
    await saveToStorage('planData', {
      playlistData: appState.playlistData,
      plan: appState.plan,
      dailyWatchTime: appState.dailyWatchTime
    });
    
    // Also save as a new plan in the plans system
    try {
      const newPlan = await createPlan(appState.playlistData, dailyTime, plan);
      appState.currentPlanId = newPlan.id;
      
      // Reload and display plans
      await loadAndDisplayPlans();
      
      // Update progress bar
      updateProgressBar(newPlan.id);
    } catch (planError) {
      console.error('Error saving plan to plans system:', planError);
      // Plan is still saved to planData, so continue
    }
    
  } catch (error) {
    showError(`Error generating plan: ${error.message}`);
    console.error('Plan generation error:', error);
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
  // Populate summary fields
  elements.playlistTitle.textContent = data.title;
  elements.videoCount.textContent = data.videoCount;
  elements.totalDuration.textContent = formatMinutes(data.totalDuration);
  
  // Show results section
  showSection(elements.resultsSection);
}

function renderPlan(plan) {
  // Clear existing content
  elements.planContainer.innerHTML = '';
  
  if (!plan || plan.length === 0) {
    elements.planContainer.innerHTML = '<p style="color: var(--text-secondary);">No plan generated</p>';
    return;
  }
  
  // Create a card for each day
  plan.forEach((dayData, index) => {
    const dayCard = createDayCard(dayData, index);
    elements.planContainer.appendChild(dayCard);
  });
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
  
  dayData.videos.forEach(video => {
    const videoItem = document.createElement('li');
    videoItem.className = 'video-item';
    
    // Format video display
    let videoText = `• ${video.title}`;
    
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
  // Update state
  appState.plan[dayIndex].completed = completed;
  
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
  
  // Update progress bar
  updateProgressBar(appState.currentPlanId);
}

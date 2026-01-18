/**
 * popup.js
 * Main orchestration file - handles UI interactions and coordinates utility modules
 */

// ========================================
// DOM Element References
// ========================================
const elements = {
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
  plan: []
};

// ========================================
// Initialization
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Extension loaded');
  
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
}

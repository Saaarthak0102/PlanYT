/**
 * plans.js
 * Manages multiple playlist plans and their persistence
 * Stores plans in chrome.storage.local with structure:
 * {
 *   plans: [...],
 *   activePlanId: "id"
 * }
 */

const PLANS_STORAGE_KEY = 'playlistPlans';

/**
 * Generate a unique ID for a plan
 */
function generatePlanId() {
  return `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Initialize or get plans data from storage
 */
async function getPlansData() {
  try {
    const data = await getFromStorage(PLANS_STORAGE_KEY);
    return data || { plans: [], activePlanId: null };
  } catch (error) {
    console.error('Error loading plans:', error);
    return { plans: [], activePlanId: null };
  }
}

/**
 * Save plans data to storage
 */
async function savePlansData(data) {
  try {
    await saveToStorage(PLANS_STORAGE_KEY, data);
  } catch (error) {
    console.error('Error saving plans:', error);
    throw error;
  }
}

/**
 * Create a new plan from current playlist data
 */
async function createPlan(playlistData, dailyWatchTime, plan) {
  const plansData = await getPlansData();
  
  // Calculate total days needed
  const totalDays = plan.length;
  
  const newPlan = {
    id: generatePlanId(),
    title: playlistData.title,
    playlistUrl: playlistData.url || '',
    totalVideos: playlistData.videoCount,
    dailyMinutes: dailyWatchTime,
    playbackSpeed: 1.0,
    videosPerDay: plan[0]?.videos?.length || 0,
    createdAt: Date.now(),
    totalDays: totalDays,
    progress: {
      currentDay: 1,
      lastWatchedIndex: 0
    },
    // Store the plan data for display
    planData: plan
  };
  
  plansData.plans.push(newPlan);
  
  // Set as active plan if it's the first one
  if (!plansData.activePlanId) {
    plansData.activePlanId = newPlan.id;
  }
  
  await savePlansData(plansData);
  return newPlan;
}

/**
 * Get active plan
 */
async function getActivePlan() {
  const plansData = await getPlansData();
  if (!plansData.activePlanId) return null;
  
  return plansData.plans.find(p => p.id === plansData.activePlanId) || null;
}

/**
 * Set active plan by ID
 */
async function setActivePlan(planId) {
  const plansData = await getPlansData();
  if (plansData.plans.some(p => p.id === planId)) {
    plansData.activePlanId = planId;
    await savePlansData(plansData);
    return true;
  }
  return false;
}

/**
 * Get all plans
 */
async function getAllPlans() {
  const plansData = await getPlansData();
  return plansData.plans;
}

/**
 * Update plan progress
 */
async function updatePlanProgress(planId, progressData) {
  const plansData = await getPlansData();
  const plan = plansData.plans.find(p => p.id === planId);
  
  if (plan) {
    plan.progress = progressData;
    await savePlansData(plansData);
    return true;
  }
  return false;
}

/**
 * Calculate progress percentage
 */
function calculateProgressPercentage(plan) {
  if (!plan || plan.totalVideos === 0) return 0;
  return Math.round((plan.progress.lastWatchedIndex / plan.totalVideos) * 100);
}

/**
 * Calculate current day based on progress
 */
function calculateCurrentDay(plan) {
  if (!plan || !plan.planData) return 1;
  
  let watchedVideos = 0;
  for (let dayIndex = 0; dayIndex < plan.planData.length; dayIndex++) {
    const dayVideos = plan.planData[dayIndex].videos.length;
    if (watchedVideos + dayVideos <= plan.progress.lastWatchedIndex) {
      watchedVideos += dayVideos;
    } else {
      return dayIndex + 1;
    }
  }
  return plan.planData.length;
}

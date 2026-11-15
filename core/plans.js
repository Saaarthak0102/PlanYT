/**
 * plans.js
 * Manages multiple playlist plans and their persistence
 * Stores plans in chrome.storage.local with structure:
 * {
 *   plans: [...],
 *   activePlanId: "id"
 * }
 * Progress maths lives in core/progress.js (PlanYTProgress).
 */

const PLANS_STORAGE_KEY = 'playlistPlans';

/**
 * Generate a unique ID for a plan
 */
function generatePlanId() {
  return `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Derive progress from planData (single source of truth: core/progress.js)
 */
function deriveProgressFromPlanData(planData) {
  return PlanYTProgress.derive(planData);
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
async function createPlan(playlistData, dailyWatchTime, plan, playbackSpeed = 1.0, mode = 'custom') {
  const plansData = await getPlansData();

  const totalDays = plan.length;

  const newPlan = {
    id: generatePlanId(),
    title: playlistData.title,
    playlistUrl: playlistData.url || '',
    totalVideos: playlistData.videoCount,
    dailyMinutes: mode === 'video-by-video' ? null : dailyWatchTime,
    playbackSpeed: mode === 'video-by-video' ? null : playbackSpeed,
    mode: mode,
    videosPerDay: mode === 'video-by-video' ? 1 : (plan[0]?.videos?.length || 0),
    createdAt: Date.now(),
    totalDays: totalDays,
    progress: deriveProgressFromPlanData(plan),
    planData: plan
  };

  plansData.plans.push(newPlan);
  plansData.activePlanId = newPlan.id;

  await savePlansData(plansData);
  return newPlan;
}

/**
 * Get active plan (the last opened plan)
 */
async function getActivePlan() {
  const plansData = await getPlansData();
  if (!plansData.activePlanId) return null;

  return plansData.plans.find(p => p.id === plansData.activePlanId) || null;
}

/**
 * Get a plan by id (fresh from storage)
 */
async function getPlanById(planId) {
  const plansData = await getPlansData();
  return plansData.plans.find(p => p.id === planId) || null;
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
 * Delete a plan by ID
 * Returns updated activePlanId after deletion
 */
async function deletePlan(planId) {
  const plansData = await getPlansData();
  const planIndex = plansData.plans.findIndex(p => p.id === planId);

  if (planIndex === -1) {
    return { deleted: false, activePlanId: plansData.activePlanId };
  }

  plansData.plans.splice(planIndex, 1);

  if (plansData.activePlanId === planId) {
    plansData.activePlanId = plansData.plans.length > 0 ? plansData.plans[0].id : null;
  }

  await savePlansData(plansData);

  return { deleted: true, activePlanId: plansData.activePlanId };
}

/**
 * Validate and fix plans state on load
 * Ensures activePlanId points to an existing plan
 */
async function validateAndFixPlansState() {
  try {
    const plansData = await getPlansData();

    const planExists = plansData.activePlanId &&
                       plansData.plans.some(p => p.id === plansData.activePlanId);

    if (plansData.activePlanId && !planExists) {
      console.warn(`Stale activePlanId detected: ${plansData.activePlanId}. Resetting to null.`);
      plansData.activePlanId = null;
      await savePlansData(plansData);
    }

    return plansData;
  } catch (error) {
    console.error('Error validating plans state:', error);
    return { plans: [], activePlanId: null };
  }
}

/**
 * v1.4 migration: the legacy 'planData' key could overwrite fresher data; drop it.
 */
async function migrateLegacyStorage() {
  try {
    const legacy = await getFromStorage('planData');
    if (legacy !== undefined) {
      await removeFromStorage('planData');
    }
  } catch (error) {
    console.error('Legacy storage migration failed:', error);
  }
}

/**
 * Update stored plan data (including progress derived from completion)
 */
async function updatePlanData(planId, planData) {
  const plansData = await getPlansData();
  const plan = plansData.plans.find(p => p.id === planId);

  if (!plan) return false;

  plan.planData = planData;
  plan.progress = deriveProgressFromPlanData(planData);

  await savePlansData(plansData);
  return true;
}

/**
 * Toggle completed state for a single video segment inside a day card
 */
async function toggleVideoCompleted(planId, dayIndex, videoIndex, value) {
  const plansData = await getPlansData();
  const plan = plansData.plans.find(p => p.id === planId);
  if (!plan) return false;

  if (!PlanYTProgress.setSegmentCompleted(plan.planData, dayIndex, videoIndex, value)) return false;

  plan.progress = deriveProgressFromPlanData(plan.planData);
  await savePlansData(plansData);
  return true;
}

/**
 * Toggle completed state for an entire day card
 */
async function toggleDayCompleted(planId, dayIndex, value) {
  const plansData = await getPlansData();
  const plan = plansData.plans.find(p => p.id === planId);
  if (!plan) return false;

  if (!PlanYTProgress.setDayCompleted(plan.planData, dayIndex, value)) return false;

  plan.progress = deriveProgressFromPlanData(plan.planData);
  await savePlansData(plansData);
  return true;
}

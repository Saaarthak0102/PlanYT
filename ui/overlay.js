/**
 * overlay.js
 * PlanYT Overlay UI Logic - Self-contained module for YouTube integration
 * Contains all utility functions and UI orchestration in one file
 */

(function() {
  'use strict';

  // ========================================
  // Utility Functions - Storage
  // ========================================
  async function saveToStorage(key, value) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  async function getFromStorage(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result[key]);
        }
      });
    });
  }

  async function removeFromStorage(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove([key], () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  // ========================================
  // Utility Functions - Time Conversion
  // ========================================
  function parseISO8601Duration(duration) {
    if (!duration) return 0;
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    
    return hours * 60 + minutes + seconds / 60;
  }

  function formatMinutes(totalMinutes) {
    if (!totalMinutes || totalMinutes === 0) return '0m';
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    
    if (hours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  }

  // ========================================
  // Utility Functions - Plans Management
  // ========================================
  const PLANS_STORAGE_KEY = 'playlistPlans';

  function generatePlanId() {
    return `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async function getPlansData() {
    try {
      const data = await getFromStorage(PLANS_STORAGE_KEY);
      return data || { plans: [], activePlanId: null };
    } catch (error) {
      console.error('Error loading plans:', error);
      return { plans: [], activePlanId: null };
    }
  }

  async function savePlansData(data) {
    try {
      await saveToStorage(PLANS_STORAGE_KEY, data);
    } catch (error) {
      console.error('Error saving plans:', error);
      throw error;
    }
  }

  async function createPlan(playlistData, dailyWatchTime, plan) {
    const plansData = await getPlansData();
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
      planData: plan
    };
    
    plansData.plans.push(newPlan);
    
    if (!plansData.activePlanId) {
      plansData.activePlanId = newPlan.id;
    }
    
    await savePlansData(plansData);
    return newPlan;
  }

  async function getActivePlan() {
    const plansData = await getPlansData();
    if (!plansData.activePlanId) return null;
    return plansData.plans.find(p => p.id === plansData.activePlanId) || null;
  }

  async function setActivePlan(planId) {
    const plansData = await getPlansData();
    if (plansData.plans.some(p => p.id === planId)) {
      plansData.activePlanId = planId;
      await savePlansData(plansData);
      return true;
    }
    return false;
  }

  async function deletePlan(planId) {
    const plansData = await getPlansData();
    plansData.plans = plansData.plans.filter(p => p.id !== planId);
    
    if (plansData.activePlanId === planId) {
      plansData.activePlanId = plansData.plans.length > 0 ? plansData.plans[0].id : null;
    }
    
    await savePlansData(plansData);
    return plansData;
  }

  async function updatePlanData(planId, planData) {
    const plansData = await getPlansData();
    const plan = plansData.plans.find(p => p.id === planId);
    
    if (plan) {
      plan.planData = planData;
      await savePlansData(plansData);
      return true;
    }
    return false;
  }

  // ========================================
  // Utility Functions - API
  // ========================================
  async function fetchPlaylistInfo(playlistUrl) {
    const apiUrl = 'https://planyt-backend.vercel.app/api/playlist-info';
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: playlistUrl })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // ========================================
  // Utility Functions - Planner
  // ========================================
  function generateWatchPlan(videos, dailyWatchTimeMinutes) {
    if (!videos || videos.length === 0) {
      return [];
    }

    const plan = [];
    let currentDay = 1;
    let currentDayVideos = [];
    let currentDayTime = 0;

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const videoDuration = video.duration;

      if (currentDayTime + videoDuration <= dailyWatchTimeMinutes) {
        currentDayVideos.push({
          ...video,
          isPartial: false
        });
        currentDayTime += videoDuration;
      } else {
        const remainingTime = dailyWatchTimeMinutes - currentDayTime;

        if (remainingTime > 0) {
          currentDayVideos.push({
            ...video,
            isPartial: true,
            startTime: 0,
            endTime: remainingTime,
            duration: remainingTime
          });
          currentDayTime += remainingTime;
        }

        plan.push({
          day: currentDay,
          videos: currentDayVideos,
          totalTime: currentDayTime,
          completed: false
        });

        currentDay++;
        currentDayVideos = [];
        currentDayTime = 0;

        const videoRemaining = videoDuration - remainingTime;

        if (videoRemaining > 0) {
          if (videoRemaining <= dailyWatchTimeMinutes) {
            currentDayVideos.push({
              ...video,
              isPartial: true,
              startTime: remainingTime,
              endTime: videoDuration,
              duration: videoRemaining
            });
            currentDayTime += videoRemaining;
          } else {
            let partStartTime = remainingTime;

            while (partStartTime < videoDuration) {
              const partDuration = Math.min(dailyWatchTimeMinutes, videoDuration - partStartTime);

              currentDayVideos.push({
                ...video,
                isPartial: true,
                startTime: partStartTime,
                endTime: partStartTime + partDuration,
                duration: partDuration
              });
              currentDayTime += partDuration;

              plan.push({
                day: currentDay,
                videos: currentDayVideos,
                totalTime: currentDayTime,
                completed: false
              });

              currentDay++;
              currentDayVideos = [];
              currentDayTime = 0;
              partStartTime += partDuration;
            }
          }
        }
      }
    }

    if (currentDayVideos.length > 0) {
      plan.push({
        day: currentDay,
        videos: currentDayVideos,
        totalTime: currentDayTime,
        completed: false
      });
    }

    return plan;
  }

  // ========================================
  // Main Overlay Class
  // ========================================
  class PlanYTOverlay {
    constructor(container) {
      this.container = container;
      this.state = {
        playlistData: null,
        videos: [],
        plan: [],
        currentPlanId: null,
        dailyWatchTime: 0,
        isAddingNewPlan: false,
        isFetching: false,
        plansCache: []
      };

      this.elements = {};
      this.initializeElements();
      this.attachEventListeners();
      this.initialize();
    }

    initializeElements() {
      const e = this.elements;
      e.plansSection = this.container.querySelector('#plansSection');
      e.plansList = this.container.querySelector('#plansList');
      e.addPlanBtn = this.container.querySelector('#addPlanBtn');
      e.playlistSection = this.container.querySelector('#playlistSection');
      e.playlistUrlInput = this.container.querySelector('#playlistUrlInput');
      e.fetchPlaylistBtn = this.container.querySelector('#fetchPlaylistBtn');
      e.loadingIndicator = this.container.querySelector('#loadingIndicator');
      e.errorMessage = this.container.querySelector('#errorMessage');
      e.resultsSection = this.container.querySelector('#resultsSection');
      e.playlistTitle = this.container.querySelector('#playlistTitle');
      e.videoCount = this.container.querySelector('#videoCount');
      e.totalDuration = this.container.querySelector('#totalDuration');
      e.progressSection = this.container.querySelector('#progressSection');
      e.progressBar = this.container.querySelector('#progressBar');
      e.progressPercent = this.container.querySelector('#progressPercent');
      e.progressLabel = this.container.querySelector('#progressLabel');
      e.plannerInputSection = this.container.querySelector('#plannerInputSection');
      e.dailyWatchTimeInput = this.container.querySelector('#dailyWatchTimeInput');
      e.generatePlanBtn = this.container.querySelector('#generatePlanBtn');
      e.planSection = this.container.querySelector('#planSection');
      e.planContainer = this.container.querySelector('#planContainer');
      e.resetBtn = this.container.querySelector('#resetBtn');
    }

    attachEventListeners() {
      this.elements.addPlanBtn.addEventListener('click', () => this.handleAddNewPlan());
      this.elements.fetchPlaylistBtn.addEventListener('click', () => this.handleFetchPlaylist());
      this.elements.generatePlanBtn.addEventListener('click', () => this.handleGeneratePlan());
      this.elements.resetBtn.addEventListener('click', () => this.handleReset());
    }

    async initialize() {
      await this.loadAndDisplayPlans();
      await this.restoreActivePlan();
      this.renderUI();
    }

    showSection(element) {
      element?.classList.remove('planyt-hidden');
    }

    hideSection(element) {
      element?.classList.add('planyt-hidden');
    }

    showError(message) {
      this.elements.errorMessage.textContent = message;
      this.showSection(this.elements.errorMessage);
    }

    hideError() {
      this.hideSection(this.elements.errorMessage);
    }

    showLoading() {
      this.showSection(this.elements.loadingIndicator);
    }

    hideLoading() {
      this.hideSection(this.elements.loadingIndicator);
    }

    renderUI() {
      this.showSection(this.elements.plansSection);

      if (this.state.isAddingNewPlan) {
        this.showSection(this.elements.playlistSection);
        this.hideSection(this.elements.planSection);
        this.hideSection(this.elements.progressSection);
        this.hideSection(this.elements.resultsSection);
        this.hideSection(this.elements.plannerInputSection);
      } else if (this.state.plan.length > 0) {
        this.hideSection(this.elements.playlistSection);
        this.hideSection(this.elements.plannerInputSection);
        this.showSection(this.elements.resultsSection);
        this.showSection(this.elements.progressSection);
        this.showSection(this.elements.planSection);
        this.renderSummary();
        this.renderPlan();
        this.updateProgressBar(this.state.currentPlanId);
      } else {
        this.hideSection(this.elements.playlistSection);
        this.hideSection(this.elements.planSection);
        this.hideSection(this.elements.progressSection);
        this.hideSection(this.elements.resultsSection);
        this.hideSection(this.elements.plannerInputSection);
      }
    }

    async loadAndDisplayPlans() {
      try {
        const plansData = await getPlansData();
        this.state.currentPlanId = plansData.activePlanId;
        this.state.plansCache = plansData.plans || [];
        this.renderPlansList(this.state.plansCache, this.state.currentPlanId);
      } catch (error) {
        console.error('Error loading plans:', error);
        this.state.plansCache = [];
      }
    }

    renderPlansList(plans, activePlanId) {
      this.elements.plansList.innerHTML = '';

      if (!plans || plans.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'planyt-plan-item planyt-plan-item-empty';
        empty.textContent = 'No plans yet. Create one to get started.';
        this.elements.plansList.appendChild(empty);
        return;
      }
      
      plans.forEach(plan => {
        const planItem = document.createElement('div');
        planItem.className = `planyt-plan-item ${plan.id === activePlanId ? 'planyt-active' : ''}`;
        planItem.dataset.planId = plan.id;
        planItem.addEventListener('click', () => this.handlePlanSelect(plan.id, plan));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'planyt-plan-item-delete';
        deleteBtn.type = 'button';
        deleteBtn.setAttribute('aria-label', `Delete plan ${plan.title}`);
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          this.handlePlanDelete(plan.id);
        });
        
        const title = document.createElement('div');
        title.className = 'planyt-plan-item-title';
        
        if (plan.playlistUrl) {
          title.classList.add('planyt-clickable');
          title.setAttribute('role', 'link');
          title.setAttribute('aria-label', `Open ${plan.title} playlist on YouTube`);
          title.setAttribute('tabindex', '0');
          
          const titleText = document.createElement('span');
          titleText.textContent = plan.title;
          
          const externalIcon = document.createElement('span');
          externalIcon.className = 'planyt-external-link-icon';
          externalIcon.innerHTML = '↗';
          externalIcon.setAttribute('aria-hidden', 'true');
          
          title.appendChild(titleText);
          title.appendChild(externalIcon);
          
          title.addEventListener('click', (event) => {
            event.stopPropagation();
            window.open(plan.playlistUrl, '_blank');
          });
          
          title.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              window.open(plan.playlistUrl, '_blank');
            }
          });
        } else {
          title.textContent = plan.title;
        }
        
        let completedVideos = 0;
        let totalVideos = plan.totalVideos || 0;
        if (plan.planData && Array.isArray(plan.planData)) {
          plan.planData.forEach(dayData => {
            if (dayData.completed) {
              completedVideos += dayData.videos.length;
            }
          });
        }
        const progressPercent = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;
        
        const subtext = document.createElement('div');
        subtext.className = 'planyt-plan-item-subtext';
        subtext.textContent = `${progressPercent}% completed`;
        
        const progressBarContainer = document.createElement('div');
        progressBarContainer.className = 'planyt-plan-item-progress-bar';
        
        const progressBarFill = document.createElement('div');
        progressBarFill.className = 'planyt-plan-item-progress-fill';
        progressBarFill.style.width = `${progressPercent}%`;
        
        progressBarContainer.appendChild(progressBarFill);
        
        planItem.appendChild(deleteBtn);
        planItem.appendChild(title);
        planItem.appendChild(subtext);
        planItem.appendChild(progressBarContainer);
        this.elements.plansList.appendChild(planItem);
      });
    }

    async handlePlanSelect(planId, plan) {
      try {
        await setActivePlan(planId);
        this.state.currentPlanId = planId;
        this.state.isAddingNewPlan = false;
        this.applyPlanToState(plan);
        await this.loadAndDisplayPlans();
        this.renderUI();
      } catch (error) {
        console.error('Error selecting plan:', error);
        this.showError('Failed to select plan');
      }
    }

    async handlePlanDelete(planId) {
      if (!confirm('Are you sure you want to delete this plan?')) {
        return;
      }

      try {
        const updatedData = await deletePlan(planId);
        
        if (planId === this.state.currentPlanId) {
          this.state.currentPlanId = updatedData.activePlanId;
          this.state.plan = [];
          this.state.playlistData = null;
          
          if (updatedData.activePlanId) {
            const newActivePlan = updatedData.plans.find(p => p.id === updatedData.activePlanId);
            if (newActivePlan) {
              this.applyPlanToState(newActivePlan);
            }
          }
        }
        
        await this.loadAndDisplayPlans();
        this.renderUI();
      } catch (error) {
        console.error('Error deleting plan:', error);
        this.showError('Failed to delete plan');
      }
    }

    applyPlanToState(plan) {
      this.state.playlistData = {
        title: plan.title,
        videoCount: plan.totalVideos,
        url: plan.playlistUrl
      };
      this.state.plan = plan.planData || [];
      this.state.dailyWatchTime = plan.dailyMinutes;
      this.state.currentPlanId = plan.id;
    }

    async restoreActivePlan() {
      if (this.state.currentPlanId) {
        const activePlan = this.state.plansCache.find(plan => plan.id === this.state.currentPlanId) || await getActivePlan();
        if (activePlan) {
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
          this.applyPlanToState(activePlan);
          return;
        }
      }

      const savedPlanData = await getFromStorage('planData');
      if (savedPlanData && savedPlanData.plan && savedPlanData.plan.length > 0) {
        this.state.playlistData = savedPlanData.playlistData;
        this.state.plan = savedPlanData.plan;
        this.state.dailyWatchTime = savedPlanData.dailyWatchTime;
        this.state.currentPlanId = this.state.currentPlanId || 'legacy-plan';
        this.state.plansCache = this.state.plansCache.length > 0 ? this.state.plansCache : [
          {
            id: 'legacy-plan',
            title: savedPlanData.playlistData?.title || 'Saved Plan',
            totalVideos: savedPlanData.playlistData?.videoCount || 0,
            totalDays: savedPlanData.plan.length,
            dailyMinutes: savedPlanData.dailyWatchTime,
            progress: { currentDay: 1, lastWatchedIndex: 0 },
            planData: savedPlanData.plan
          }
        ];
        this.renderPlansList(this.state.plansCache, this.state.currentPlanId);
      }
    }

    handleAddNewPlan() {
      this.state.isAddingNewPlan = true;
      this.renderUI();
      this.elements.playlistUrlInput.focus();
    }

    async handleFetchPlaylist() {
      const playlistUrl = this.elements.playlistUrlInput.value.trim();
      
      if (!playlistUrl) {
        this.showError('Please enter a valid playlist URL');
        return;
      }

      this.hideError();
      this.showLoading();
      this.state.isFetching = true;

      try {
        const data = await fetchPlaylistInfo(playlistUrl);
        
        this.state.playlistData = {
          title: data.title,
          videoCount: data.videos.length,
          totalDuration: data.totalDuration,
          url: playlistUrl
        };
        
        this.state.videos = data.videos.map(video => ({
          title: video.title,
          duration: parseISO8601Duration(video.duration)
        }));

        this.hideLoading();
        this.showSection(this.elements.resultsSection);
        this.showSection(this.elements.plannerInputSection);
        this.renderSummary();
        this.elements.dailyWatchTimeInput.focus();
      } catch (error) {
        this.hideLoading();
        this.showError(error.message || 'Failed to fetch playlist. Please check the URL and try again.');
        console.error('Fetch error:', error);
      } finally {
        this.state.isFetching = false;
      }
    }

    async handleGeneratePlan() {
      const dailyWatchTime = parseInt(this.elements.dailyWatchTimeInput.value);
      
      if (!dailyWatchTime || dailyWatchTime < 1) {
        this.showError('Please enter a valid daily watch time (at least 1 minute)');
        return;
      }

      this.state.dailyWatchTime = dailyWatchTime;
      this.state.plan = generateWatchPlan(this.state.videos, dailyWatchTime);

      try {
        const newPlan = await createPlan(this.state.playlistData, dailyWatchTime, this.state.plan);
        this.state.currentPlanId = newPlan.id;
        this.state.isAddingNewPlan = false;

        await saveToStorage('planData', {
          playlistData: this.state.playlistData,
          plan: this.state.plan,
          dailyWatchTime: this.state.dailyWatchTime
        });

        await this.loadAndDisplayPlans();
        this.renderUI();
      } catch (error) {
        console.error('Error creating plan:', error);
        this.showError('Failed to save plan');
      }
    }

    async handleReset() {
      if (!confirm('Are you sure you want to reset? This will clear your current session.')) {
        return;
      }

      this.state.isAddingNewPlan = false;
      this.state.playlistData = null;
      this.state.videos = [];
      this.state.plan = [];
      this.state.dailyWatchTime = 0;
      
      this.elements.playlistUrlInput.value = '';
      this.elements.dailyWatchTimeInput.value = '';
      
      this.renderUI();
    }

    renderSummary() {
      if (!this.state.playlistData) return;
      
      this.elements.playlistTitle.textContent = this.state.playlistData.title;
      this.elements.videoCount.textContent = this.state.playlistData.videoCount;
      
      if (this.state.playlistData.totalDuration) {
        this.elements.totalDuration.textContent = this.state.playlistData.totalDuration;
      } else {
        const totalMinutes = this.state.videos.reduce((sum, v) => sum + v.duration, 0);
        this.elements.totalDuration.textContent = formatMinutes(totalMinutes);
      }
    }

    updateProgressBar(planId) {
      if (!this.state.plan || this.state.plan.length === 0) return;

      let completedDays = 0;
      this.state.plan.forEach(dayData => {
        if (dayData.completed) completedDays++;
      });

      const progressPercent = Math.round((completedDays / this.state.plan.length) * 100);
      this.elements.progressBar.style.width = `${progressPercent}%`;
      this.elements.progressPercent.textContent = `${progressPercent}%`;
    }

    renderPlan() {
      this.elements.planContainer.innerHTML = '';
      
      this.state.plan.forEach((dayData, index) => {
        const dayCard = this.createDayCard(dayData, index);
        this.elements.planContainer.appendChild(dayCard);
      });

      setTimeout(() => this.scrollToFirstIncompleteDay(), 0);
    }

    createDayCard(dayData, index) {
      const card = document.createElement('div');
      card.className = `planyt-day-card ${dayData.completed ? 'planyt-completed' : ''}`;
      card.dataset.dayIndex = index;
      
      const header = document.createElement('div');
      header.className = 'planyt-day-header';
      
      const title = document.createElement('div');
      title.className = 'planyt-day-title';
      title.textContent = `Day ${dayData.day}`;
      
      const duration = document.createElement('div');
      duration.className = 'planyt-day-duration';
      duration.textContent = formatMinutes(dayData.totalTime);
      
      header.appendChild(title);
      header.appendChild(duration);
      card.appendChild(header);
      
      const videoList = document.createElement('ul');
      videoList.className = 'planyt-video-list';
      
      dayData.videos.forEach(video => {
        const videoItem = document.createElement('li');
        videoItem.className = 'planyt-video-item';
        
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
      
      const checkboxContainer = document.createElement('div');
      checkboxContainer.className = 'planyt-checkbox-container';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `planyt-day-${index}-checkbox`;
      checkbox.checked = dayData.completed;
      checkbox.addEventListener('change', (e) => this.handleDayCompletion(index, e.target.checked));
      
      const label = document.createElement('label');
      label.htmlFor = `planyt-day-${index}-checkbox`;
      label.textContent = 'Mark as completed';
      
      checkboxContainer.appendChild(checkbox);
      checkboxContainer.appendChild(label);
      card.appendChild(checkboxContainer);
      
      return card;
    }

    async handleDayCompletion(dayIndex, completed) {
      this.state.plan[dayIndex].completed = completed;
      
      const card = this.elements.planContainer.querySelector(`[data-day-index="${dayIndex}"]`);
      if (card) {
        if (completed) {
          card.classList.add('planyt-completed');
        } else {
          card.classList.remove('planyt-completed');
        }
      }
      
      await saveToStorage('planData', {
        playlistData: this.state.playlistData,
        plan: this.state.plan,
        dailyWatchTime: this.state.dailyWatchTime
      });

      if (this.state.currentPlanId) {
        try {
          await updatePlanData(this.state.currentPlanId, this.state.plan);
          await this.loadAndDisplayPlans();
        } catch (error) {
          console.error('Error updating plan progress:', error);
        }
      }
      
      this.updateProgressBar(this.state.currentPlanId);
      setTimeout(() => this.scrollToFirstIncompleteDay(), 100);
    }

    scrollToFirstIncompleteDay() {
      const firstIncomplete = this.elements.planContainer.querySelector('.planyt-day-card:not(.planyt-completed)');
      if (firstIncomplete) {
        firstIncomplete.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  // ========================================
  // Exports
  // ========================================
  window.PlanYTOverlay = PlanYTOverlay;

})();

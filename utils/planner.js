/**
 * planner.js
 * Core algorithm for splitting playlist into day-wise schedule
 * Handles video distribution and partial video carryover
 */

/**
 * Generates a day-wise watch plan from videos and daily watch time
 * 
 * Algorithm:
 * - Videos are assigned sequentially to days
 * - If a video exceeds remaining daily time, it's split:
 *   → Partial time assigned to current day
 *   → Remainder carried over to next day
 * - Each day has a list of video segments to watch
 * 
 * @param {Array} videos - [{id, title, durationMinutes}]
 * @param {number} dailyWatchTimeMinutes - Minutes available per day
 * @returns {Array} - [{day, videos: [{title, startTime, endTime, duration}], totalTime, completed}]
 */
function generateDayWisePlan(videos, dailyWatchTimeMinutes) {
  if (!videos || videos.length === 0) return [];
  if (!dailyWatchTimeMinutes || dailyWatchTimeMinutes <= 0) return [];
  
  const plan = [];
  let currentDay = 1;
  let remainingDailyTime = dailyWatchTimeMinutes;
  let currentDayVideos = [];
  let currentDayTotalTime = 0;
  
  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    let videoRemainingTime = video.durationMinutes;
    let videoStartTime = 0;
    
    // Process this video (might span multiple days)
    while (videoRemainingTime > 0) {
      const timeToWatch = Math.min(videoRemainingTime, remainingDailyTime);
      const videoEndTime = videoStartTime + timeToWatch;
      
      // Add video segment to current day
      currentDayVideos.push({
        id: video.id,
        title: video.title,
        startTime: videoStartTime > 0 ? videoStartTime : null, // null means watch from beginning
        endTime: videoEndTime < video.durationMinutes ? videoEndTime : null, // null means watch to end
        duration: timeToWatch,
        isPartial: videoStartTime > 0 || videoEndTime < video.durationMinutes
      });
      
      currentDayTotalTime += timeToWatch;
      remainingDailyTime -= timeToWatch;
      videoRemainingTime -= timeToWatch;
      videoStartTime = videoEndTime;
      
      // If day is full or video is done, finalize day
      if (remainingDailyTime <= 0.01 || (videoRemainingTime <= 0 && i === videos.length - 1)) {
        plan.push({
          day: currentDay,
          videos: currentDayVideos,
          totalTime: currentDayTotalTime,
          completed: false
        });
        
        // Reset for next day
        currentDay++;
        remainingDailyTime = dailyWatchTimeMinutes;
        currentDayVideos = [];
        currentDayTotalTime = 0;
      }
    }
  }
  
  // Add any remaining partial day
  if (currentDayVideos.length > 0) {
    plan.push({
      day: currentDay,
      videos: currentDayVideos,
      totalTime: currentDayTotalTime,
      completed: false
    });
  }
  
  return plan;
}

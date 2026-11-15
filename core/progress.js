/**
 * progress.js
 * Single source of truth for plan progress maths.
 * Loaded by the popup AND by the YouTube content scripts (no DOM / chrome deps).
 * Everything lives on the global `PlanYTProgress` object.
 */
(function (root) {
  'use strict';

  function days(planData) {
    return Array.isArray(planData) ? planData : [];
  }

  function segs(day) {
    return day && Array.isArray(day.videos) ? day.videos : [];
  }

  function segDone(day, seg) {
    return !!(day.completed || seg.completed);
  }

  /** Extract a playlist id from any YouTube url containing list= */
  function playlistIdFromUrl(url) {
    if (!url) return null;
    const m = String(url).match(/[?&]list=([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
  }

  /** Format minutes as "2h 30m" / "45m" */
  function formatMinutes(minutes) {
    if (!minutes || minutes <= 0) return '0m';
    let total = Math.round(minutes);
    if (total === 0) return '<1m';
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }

  /** Index of the first day that is not completed (or last day if all done, -1 if empty) */
  function currentDayIndex(planData) {
    const d = days(planData);
    if (d.length === 0) return -1;
    const idx = d.findIndex(day => !day.completed);
    return idx === -1 ? d.length - 1 : idx;
  }

  function isPlanComplete(planData) {
    const d = days(planData);
    return d.length > 0 && d.every(day => day.completed);
  }

  /**
   * Derive all progress numbers. Percent is weighted by video duration
   * (falls back to segment count if durations are unknown).
   */
  function derive(planData) {
    const d = days(planData);
    const totalDays = d.length;
    if (totalDays === 0) {
      return {
        percent: 0, completedDays: 0, totalDays: 0, currentDay: 1,
        lastWatchedIndex: 0, totalSegments: 0, completedSegments: 0,
        totalVideos: 0, completedVideos: 0,
        totalMinutes: 0, doneMinutes: 0, remainingMinutes: 0
      };
    }

    let completedDays = 0;
    let totalSegments = 0;
    let completedSegments = 0;
    let totalMinutes = 0;
    let doneMinutes = 0;
    let remainingWatchMinutes = 0;
    const videoTotals = {};
    const videoDone = {};

    d.forEach(day => {
      if (day.completed) completedDays += 1;
      const list = segs(day);
      let dayDone = 0;
      let dayTotal = 0;
      list.forEach(seg => {
        const dur = Number(seg.duration) || 0;
        const done = segDone(day, seg);
        totalSegments += 1;
        dayTotal += dur;
        totalMinutes += dur;
        if (done) {
          completedSegments += 1;
          doneMinutes += dur;
          dayDone += dur;
        }
        if (seg.id) {
          videoTotals[seg.id] = (videoTotals[seg.id] || 0) + dur;
          if (done) videoDone[seg.id] = (videoDone[seg.id] || 0) + dur;
        }
      });
      // Remaining *watch* time (already speed-adjusted in day.totalTime)
      if (!day.completed) {
        const dayWatch = Number(day.totalTime) || 0;
        const ratio = dayTotal > 0 ? (dayTotal - dayDone) / dayTotal : 1;
        remainingWatchMinutes += dayWatch * ratio;
      }
    });

    let totalVideos = 0;
    let completedVideos = 0;
    Object.keys(videoTotals).forEach(id => {
      totalVideos += 1;
      if (videoTotals[id] > 0 && (videoDone[id] || 0) >= videoTotals[id] - 0.001) completedVideos += 1;
    });

    const percent = totalMinutes > 0
      ? Math.round((doneMinutes / totalMinutes) * 100)
      : (totalSegments > 0 ? Math.round((completedSegments / totalSegments) * 100) : 0);

    const idx = currentDayIndex(d);
    return {
      percent,
      completedDays,
      totalDays,
      currentDay: idx + 1,
      lastWatchedIndex: completedSegments,
      totalSegments,
      completedSegments,
      totalVideos,
      completedVideos,
      totalMinutes,
      doneMinutes,
      remainingMinutes: Math.round(remainingWatchMinutes)
    };
  }

  /** { [videoId]: fraction 0..1 } of each video completed across all of its segments */
  function videoCompletionMap(planData) {
    const totals = {};
    const done = {};
    days(planData).forEach(day => {
      segs(day).forEach(seg => {
        if (!seg.id) return;
        const dur = Number(seg.duration) || 0;
        totals[seg.id] = (totals[seg.id] || 0) + dur;
        if (segDone(day, seg)) done[seg.id] = (done[seg.id] || 0) + dur;
      });
    });
    const out = {};
    Object.keys(totals).forEach(id => {
      if (totals[id] <= 0) {
        out[id] = done[id] ? 1 : 0;
      } else {
        out[id] = Math.min(1, (done[id] || 0) / totals[id]);
      }
    });
    return out;
  }

  /** First not-yet-done segment of the current day (or null) */
  function nextSegment(planData) {
    const d = days(planData);
    const idx = d.findIndex(day => !day.completed);
    if (idx === -1) return null;
    const list = segs(d[idx]);
    const segIdx = list.findIndex(seg => !seg.completed);
    const seg = list[segIdx === -1 ? 0 : segIdx];
    return seg ? { dayIndex: idx, segmentIndex: segIdx === -1 ? 0 : segIdx, segment: seg } : null;
  }

  /** Build a YouTube watch URL for a segment (start offset for partial segments) */
  function segmentUrl(seg, playlistId) {
    if (!seg || !seg.id) return null;
    let url = `https://www.youtube.com/watch?v=${encodeURIComponent(seg.id)}`;
    if (playlistId) url += `&list=${encodeURIComponent(playlistId)}`;
    if (seg.startTime && seg.startTime > 0) url += `&t=${Math.floor(seg.startTime * 60)}s`;
    return url;
  }

  /** Mutating helpers: set one segment's state; day completes when all segments do */
  function setSegmentCompleted(planData, dayIndex, segIndex, value) {
    const day = days(planData)[dayIndex];
    if (!day || !segs(day)[segIndex]) return false;
    day.videos[segIndex].completed = !!value;
    day.completed = day.videos.every(v => v.completed === true);
    return true;
  }

  function setDayCompleted(planData, dayIndex, value) {
    const day = days(planData)[dayIndex];
    if (!day) return false;
    day.completed = !!value;
    segs(day).forEach(v => { v.completed = !!value; });
    return true;
  }

  root.PlanYTProgress = {
    playlistIdFromUrl,
    formatMinutes,
    currentDayIndex,
    isPlanComplete,
    derive,
    videoCompletionMap,
    nextSegment,
    segmentUrl,
    setSegmentCompleted,
    setDayCompleted
  };
})(typeof self !== 'undefined' ? self : this);

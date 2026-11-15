<p align="center">
  <img src="assets/icon128.png" alt="PlanYT Icon" width="96" />
</p>

<h1 align="center">PlanYT</h1>

<p align="center">
  <b>Your YouTube, planned.</b><br/>
  It lives inside YouTube.
</p>

---

# PlanYT - v1.4.0
Plan Dashboard · Today's Checklist on YouTube · Playlist Highlighting · Simpler Video-by-Video

PlanYT is a lightweight Chrome extension that transforms overwhelming YouTube playlists into structured, realistic daily plans — directly inside YouTube.

No spreadsheets.  
No manual tracking.  
No switching tabs.  

Just open YouTube and follow your plan.

---

## What's New in v1.4

### Plans Home + Plan Dashboard (Major Update)

The popup is now organised around what you actually want to do.

- Opening PlanYT shows your **plans list**, with **+ Add plan** in the header next to the support and GitHub icons
- Open a plan to see its **dashboard**:
  - Progress donut with completion percentage
  - **Days left**, **Videos done** and **Watch time left**
  - **Start Day N / Continue Day N** button that opens the right video on YouTube (with the correct start time for split videos)
  - The full day-by-day list, auto-scrolled to your current day
- Back arrow returns to your plans list
- The popup stays in sync when you tick videos from YouTube

---

### Today's Checklist on YouTube (Major Update)

The playlist widget is now smaller and more useful.

- **Today · Day N** card with today's videos, each with its own checkbox
- **Mark today as completed** checkbox for Custom plans (Video-by-Video plans just have the video checkbox)
- Progress percentage and **Open Plan** button jump straight to your plan dashboard
- If a playlist has no plan, you only see a single **Create Plan** button; when finished, a single **View Plan** button
- Now also shown on `youtube.com/playlist?list=...` pages, right below the Play / Comments buttons

---

### Native Playlist Highlighting (Major Update)

Your progress is visible right inside YouTube's video lists.

- Completed videos are tinted red and their titles are struck through
- Partly watched videos (split across days in Custom mode) are tinted in proportion, e.g. half done = half highlighted
- Works in the watch-page playlist panel and on playlist pages, and updates instantly when you tick a video

---

### Simpler Video-by-Video Mode

- No playback speed step — one video per day, so speed doesn't change anything
- Confirm screen shows **Plan Mode** and **Days** (number of videos)
- One checkbox per day in the popup and on YouTube

---

## Bug Fixes in v1.4

- **Progress is now weighted by watch time** instead of counting segments, and calculated in a single shared module so the popup, widget and highlights always agree on the current day
- **Fixed stale data overwrite:** the old legacy `planData` storage key could overwrite fresher progress; it is now removed automatically on first open
- **Fixed background worker error** when creating a plan from the widget without a playlist URL
- **Backend:** videos keep their playlist order, duplicate and unavailable videos are handled, durations that include days are parsed correctly, and client IP detection for rate limiting is more reliable
- Selecting a plan now always loads the latest saved state

---

## What's New in v1.3

### Per-Video Sub-Checkboxes (Major Update)

Day cards in Custom (time-based) mode now show individual checkboxes for every video segment inside a day.

- Check off individual video segments as you finish them
- Completing all segments automatically marks the whole day as done
- Marking the whole day done cascades and checks all segments
- Unchecking any segment automatically unchecks the day
- Partial video segments are labeled clearly with a `partial` badge
- Completed segments show strikethrough text for visual clarity

Video-by-Video mode keeps the single day-level checkbox — no unnecessary complexity.

---

### Playback Speed Support (Major Update)

Custom mode now accounts for your actual watch speed.

- Speed selector with fixed snap points: `0.25×, 0.5×, 0.75×, 1×, 1.25×, 1.5×, 1.75×, 2×`
- Matches YouTube's native speed options exactly
- Live hint shows how much content your daily time covers at the selected speed
- Plans are recalculated using effective duration (`video duration ÷ speed`)
- Speed is stored on the plan and displayed in plan details

Video-by-Video mode does not include a speed selector — each day is one video regardless of duration.

---

### Plan Mode Selection at Creation (Major Update)

Two distinct modes now available when creating a plan:

#### Video-by-Video Mode
One video per day. No splitting, no time math. Best for consistency-focused goals where you want a clear daily target.

#### Custom Schedule Mode  
Set your daily watch time budget and let PlanYT distribute videos (with partial splits for long videos) across your timeline. Best for structured learning with a fixed daily time slot.

---

## Bug Fixes in v1.3

- **Fixed duplicate progress widget** appearing on YouTube playlist pages after navigating from the popup's playlist link. Root cause was a race condition between the `yt-navigate-finish` event and the 2-second health check interval both triggering injection simultaneously. Fixed with an injection lock flag, `isConnected` DOM verification, and stale host cleanup before re-injection.

---

## What's New in v1.2

### Native YouTube Integration
PlanYT now injects directly into the YouTube interface.

- PlanYT icon appears inside YouTube  
- Open your planner without reopening the extension popup  
- Instant access while browsing playlists  
- Reduced friction in daily usage  

### Improved State Persistence
Your last active plan restores automatically.

### Smarter Auto-Scroll
Automatically jumps to the first incomplete day or the next day after completion.

### Performance & Stability Improvements
Faster processing and smoother interactions.

---

## Core Features

### Multi-Plan Management
Manage multiple playlists simultaneously and switch between them instantly, with a dashboard for each plan.

### Accurate Duration Calculation
Fetches real playlist duration using a backend proxy.

### Partial Video Splitting
Long videos are automatically split across multiple days when needed (in Custom mode).

### Per-Segment Progress Tracking
- Individual video checkboxes (all modes) and day checkbox (Custom mode)
- Progress donut and visual progress bar  
- Completion percentage  
- Day-by-day tracking  

### Playback Speed Awareness
Custom plans account for your actual watch speed so daily targets are always realistic.

### Native YouTube Tracking
Today's checklist in the playlist widget and red highlighting of completed videos in YouTube's own playlist lists.

### Persistent Storage
Plans and progress are saved locally in your browser.

### One-Click Delete
Remove any plan instantly.

---

## UX Philosophy

- Zero configuration  
- Minimal interface  
- No feature bloat  
- YouTube-style dark UI  
- Focused on completion, not distraction  

---

## Privacy

PlanYT:

- Does not collect personal data  
- Does not track usage  
- Does not use analytics  
- Stores everything locally in your browser  

Your data never leaves your system.

---

## Tech Stack

- Vanilla JavaScript  
- Chrome Extension (Manifest V3)  
- Backend API proxy (no API key required)  

---

## Installation

1. Clone or download this repository  
2. Open `chrome://extensions`  
3. Enable Developer Mode  
4. Click Load Unpacked  
5. Select the project folder  

---

## Usage

### Create a Plan

1. Open YouTube  
2. Click the PlanYT icon inside YouTube  
3. Click **+ Add plan**  
4. Paste a YouTube playlist URL  
5. Click Fetch Playlist  
6. Choose your planning mode:
   - **Video-by-Video** — one video per day, no time math or speed
   - **Custom Schedule** — daily time budget with speed adjustment
7. *(Custom only)* Enter your daily watch time and select playback speed  
8. Confirm and Generate Plan  

You can also click **Create Plan** in the widget on any YouTube playlist page.

### Manage Progress

- View playlists under My Plans and open one to see its dashboard  
- Press **Start / Continue Day N** to jump to today's video  
- Tick today's videos in the YouTube widget, or check off videos and days in the popup  
- Completed videos are highlighted in YouTube's playlist lists  
- Progress updates everywhere automatically  
- Delete plans anytime  

---

## Product Philosophy

PlanYT is not about adding more features.  
It is about helping you finish what you start.

Simple structure.  
Clear progress.  
Real completion.

---

## Support the Project

If PlanYT helps you stay consistent with YouTube playlists, you can support development here:

https://github.com/sponsors/Saaaarthak0102

---

## Status

Actively developed.  
Open to feedback and improvements.

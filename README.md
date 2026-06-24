<p align="center">
  <img src="assets/icon128.png" alt="PlanYT Icon" width="96" />
</p>

<h1 align="center">PlanYT</h1>

<p align="center">
  <b>Your YouTube, planned.</b><br/>
  It lives inside YouTube.
</p>

---

# PlanYT - v1.3.0
Sub-Task Checkboxes · Smooth Completion Transitions · Bug Fixes

PlanYT is a lightweight Chrome extension that transforms overwhelming YouTube playlists into structured, realistic daily plans — directly inside YouTube.

No spreadsheets.  
No manual tracking.  
No switching tabs.  

Just open YouTube and follow your plan.

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
Manage multiple playlists simultaneously and switch between them instantly.

### Accurate Duration Calculation
Fetches real playlist duration using a backend proxy.

### Partial Video Splitting
Long videos are automatically split across multiple days when needed (in Custom mode).

### Per-Segment Progress Tracking
- Individual video segment checkboxes (Custom mode)
- Visual progress bar  
- Completion percentage  
- Day-by-day tracking  

### Playback Speed Awareness
Plans account for your actual watch speed so daily targets are always realistic.

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
3. Click Add New Plan  
4. Paste a YouTube playlist URL  
5. Click Fetch Playlist  
6. Choose your planning mode:
   - **Video-by-Video** — one video per day, no time math
   - **Custom Schedule** — daily time budget with speed adjustment
7. *(Custom only)* Enter your daily watch time and select playback speed  
8. Generate Plan  

### Manage Progress

- View playlists under My Plans  
- Switch between plans instantly  
- Check off individual video segments or entire days  
- Progress updates automatically  
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
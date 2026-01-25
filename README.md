# 📺 YouTube Playlist Watch-Time Planner

A Chrome extension that helps you complete YouTube playlists by generating realistic, day-wise watch schedules.


Most people start YouTube playlists but fail to finish them due to:
- No time planning
- Overwhelming total duration
- Lack of structured approach

This extension solves that by:
- Calculating exact playlist duration
- Creating personalized daily watch plans
- Tracking progress with checkboxes
- Persisting data across sessions

---

## ✨ Features

### Core Functionality
- ✅ **Playlist Analysis**: Fetch any public YouTube playlist
- ✅ **Duration Calculation**: Accurate total time via backend API
- ✅ **Smart Scheduling**: Day-wise breakdown based on your available time
- ✅ **Partial Video Support**: Videos spanning multiple days are split intelligently
- ✅ **Progress Tracking**: Check off completed days
- ✅ **Data Persistence**: Plans saved even after browser restart
- ✅ **Zero Setup**: No API key required (new in v2.0!)

### Technical Highlights
- Built with **Vanilla JavaScript** (no frameworks)
- Uses **Chrome Extension Manifest V3** (latest standard)
- **Backend API proxy** for secure YouTube data access
- **Responsive dark-themed UI** with smooth animations
- **Cached responses** for better performance

---

## 🚀 Quick Start (Users)

### Installation

1. **Download** this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **"Load unpacked"**
5. Select the `youtube-playlist-planner` folder
6. Extension icon should appear in toolbar

### Usage

1. **Click extension icon** in Chrome toolbar
2. **Paste a YouTube playlist URL**
   - Example: `https://www.youtube.com/playlist?list=PLrAXtmErZgOe...`
3. Click **"Fetch Playlist"**
4. **Enter daily watch time** (in minutes)
5. Click **"Generate Plan"**
6. **Check off days** as you complete them

### Using Your Plan

- View your **day-wise schedule**
- Each day shows:
  - Videos to watch (with time ranges for partial videos)
  - Total time for that day
- **Check off days** as you complete them
- Plan is **automatically saved** (persists after closing browser)

### Managing Plans

- **Reset**: Click "Reset" button to clear all data and start fresh
- **New Plan**: Simply fetch a new playlist (overwrites current plan)

---


---


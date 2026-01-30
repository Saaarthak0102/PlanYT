# 📺 YouTube Playlist Planner

A Chrome extension that helps you complete YouTube playlists by generating realistic, day-wise watch schedules with **multiple plan management**.

## 🎯 Why Use This?

Most people start YouTube playlists but fail to finish them due to:
- No time planning
- Overwhelming total duration
- Lack of structured approach
- Managing multiple playlists simultaneously

This extension solves that by:
- **Managing multiple playlists** at once
- Calculating exact playlist duration
- Creating personalized daily watch plans
- Tracking progress per day
- Persisting all plans across sessions

---

## ✨ Features

### Core Functionality
- ✅ **Multiple Plan Management**: Create and switch between multiple playlist plans
- ✅ **Playlist Analysis**: Fetch any public YouTube playlist
- ✅ **Duration Calculation**: Accurate total time via backend API
- ✅ **Smart Scheduling**: Day-wise breakdown based on your available time
- ✅ **Partial Video Support**: Videos spanning multiple days are split intelligently
- ✅ **Progress Tracking**: Check off completed days, track current day
- ✅ **Data Persistence**: All plans saved even after browser restart
- ✅ **Zero Setup**: No API key required
- ✅ **Clean UI**: Dark mode with red accents for better visibility

### Technical Highlights
- Built with **Vanilla JavaScript** (no frameworks)
- Uses **Chrome Extension Manifest V3** (latest standard)
- **Backend API proxy** for secure YouTube data access
- **Modern dark-themed UI** with red/black color scheme
- **Efficient state management** with deterministic rendering
- **Duplicate prevention** for playlists

---

## 🚀 Quick Start

### Installation

1. **Download** this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **"Load unpacked"**
5. Select the `youtube-playlist-planner` folder
6. Extension icon should appear in toolbar

### Usage

#### Creating Your First Plan

1. **Click extension icon** in Chrome toolbar
2. Click **"➕ Add New Plan"** button
3. **Paste a YouTube playlist URL**
   - Example: `https://www.youtube.com/playlist?list=PLrAXtmErZgOe...`
4. Click **"Fetch Playlist"**
5. **Enter daily watch time** (in minutes)
6. Click **"Generate Plan"**

#### Managing Multiple Plans

- **My Plans** section shows all your created plans
- Click any plan card to view its details and progress
- Each plan shows: `Day X of Y` progress
- Active plan is highlighted with red accent
- Progress bar shows completion percentage

#### Tracking Progress

- View your **day-wise schedule** for the selected plan
- Each day shows:
  - Videos to watch (with time ranges for partial videos)
  - Total time for that day
  - **Current day** highlighted with red border
- **Check off days** as you complete them
- Completed days show with reduced opacity

#### Managing Plans

- **Switch Plans**: Click any plan card in "My Plans"
- **Add More**: Click "➕ Add New Plan" anytime
- **Reset All**: Click "Reset" button to clear all data

---


---


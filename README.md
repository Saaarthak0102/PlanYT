<p align="center">
  <img src="assets/icon.png" alt="PlanYT Icon" width="96" />
</p>

<h1 align="center">PlanYT</h1>

<p align="center">
  Your Youtube, planned.
</p>

---

## Overview

**PlanYT** is a Chrome extension that helps you complete YouTube playlists by converting them into **clear daily schedules** with **multiple plan management** and **progress tracking**.

Instead of overwhelming total durations, you get a structured plan you can actually follow.

---

## Why PlanYT?

Most playlists are abandoned because they are:

- Too long
- Poorly planned
- Hard to track

**PlanYT solves this** by breaking playlists into manageable daily goals and tracking your progress automatically.

---

## Features

### Core Functionality

- **Multiple Plans** – Manage multiple playlists simultaneously  
- **Accurate Duration Calculation** – Fetches real playlist duration via backend API  
- **Smart Day-wise Planning** – Plans based on your available daily watch time  
- **Partial Video Splitting** – Long videos are split across days  
- **Progress Tracking** – Visual progress bar with completion percentage  
- **Persistent Storage** – Plans and progress saved across sessions  
- **One-click Delete** – Instantly remove any plan
  
## Privacy
PlanYT does not collect, store, or transmit any personal data.
All playlist plans and progress are stored locally in the user's browser.
No analytics, tracking, or external servers are used.

### UX Enhancements

- **YouTube-style Dark UI**
- **Auto-scroll** to:
  - Generated plan section
  - First incomplete day
  - Next day after completion

---

## Tech Stack

- Vanilla JavaScript  
- Chrome Extension (Manifest V3)  
- Backend API proxy (no API key required)

---

## Installation

1. Clone or download the repository  
2. Open `chrome://extensions`  
3. Enable **Developer Mode**  
4. Click **Load Unpacked**  
5. Select the project folder  

---

## Usage

### Create a Plan

1. Open the extension  
2. Click **Add New Plan**  
3. Paste a YouTube playlist URL  
4. Click **Fetch Playlist**  
5. Enter your daily watch time  
6. Click **Generate Plan**

### Manage Progress

- View all playlists under **My Plans**
- Switch between plans instantly
- Mark days as completed
- Progress updates automatically
- Delete plans with the ❌ button

---

## Philosophy

- Zero configuration  
- Minimal UI  
- No feature bloat  
- Focused on completion, not distraction  

---

## Support the project
If PlanYT helps you stay consistent with YouTube playlists, you can support its development here:

https://github.com/sponsors/Saaaarthak0102

## Status

Actively developed. Open to feedback and improvements.



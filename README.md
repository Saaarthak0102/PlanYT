<p align="center">
  <img src="assets/icon128.png" alt="PlanYT Icon" width="96" />
</p>

<h1 align="center">PlanYT</h1>

<p align="center">
  <b>Your YouTube, planned.</b><br/>
  It lives inside YouTube.
</p>

---

# PlanYT

PlanYT is a lightweight Chrome extension that transforms overwhelming YouTube playlists into structured, realistic daily plans — directly inside YouTube.

No spreadsheets.  
No manual tracking.  
No switching tabs.  

Just open YouTube and follow your plan.

---

## Why PlanYT Is Different

Most "Watch Later" lists are where tutorials go to die. PlanYT doesn't live in a separate dashboard — it lives inside YouTube and turns it into a learning management system.

### Lives Inside YouTube

- **Injected toolbar icon:** a PlanYT icon sits in the YouTube header, one click from your plans
- **Progress widget on playlist pages:** shown in the watch-page playlist panel and on `youtube.com/playlist` pages (right below the Play / Comments buttons)
- **Today's checklist:** the widget shows today's videos with a checkbox for each, so you can tick them off while you watch
- **One-click actions:** **Create Plan** for playlists without a plan, **Open Plan** / **View Plan** to jump straight to the plan dashboard
- **Native highlighting:** completed videos are tinted red and struck through in YouTube's own playlist lists; videos split across days are highlighted in proportion (half watched = half highlighted)

### Plan Dashboard

- Plans home with **+ Add plan** in the header; open any plan to see its dashboard
- Progress donut with completion percentage
- **Days left**, **Videos done** and **Watch time left** at a glance
- **Start / Continue Day N** opens the right video on YouTube — at the correct timestamp when a video is split across days
- Full day-by-day list, auto-scrolled to your current day
- Stays in sync when you tick videos from YouTube

### Two Planning Modes

- **Video-by-Video:** one video per day, no time math, no speed
- **Custom Schedule:** set a daily watch-time budget and PlanYT splits the playlist for you

### Speed-Aware Scheduling

- Custom plans account for how you actually watch, with a speed slider that snaps to YouTube's own options: `0.25×, 0.5×, 0.75×, 1×, 1.25×, 1.5×, 1.75×, 2×`
- Live hint shows how much content your daily time covers at the chosen speed
- Effective duration is calculated as `video duration ÷ speed`

### Smart Splitting of Long Videos

- In Custom mode, long videos are automatically split across days when they don't fit your daily budget
- Split segments are clearly labelled `partial` with their time range

### Granular Progress Tracking

- Individual video checkboxes in the popup and on YouTube
- Day checkbox in Custom mode — complete all videos and the day auto-completes; mark the day done and all videos check themselves
- Progress is weighted by watch time, so a 2-minute and a 2-hour video don't count the same
- Completed items are struck through; PlanYT remembers exactly where you left off

### Multi-Plan Management

- Manage multiple playlists at once and switch between them instantly
- Accurate durations fetched through a backend proxy (no API key needed)
- One-click delete for any plan

### Private by Design

- No ads, no tracking, no analytics, no unnecessary permissions
- Plans and progress are stored locally in your browser
- Open source — audit the code any time

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

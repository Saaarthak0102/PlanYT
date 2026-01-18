# 📺 YouTube Playlist Watch-Time Planner

A Chrome extension that helps you complete YouTube playlists by generating realistic, day-wise watch schedules.

**✨ NEW in v2.0**: Zero-setup! No API key required - just install and use immediately.

## 🎯 Problem Solved

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

That's it! No API keys, no configuration, no hassle.

---

## 🏗️ Architecture (v2.0)

### Backend-Proxy Model

```
User → Chrome Extension → Backend API (Vercel) → YouTube Data API v3
                           ↓
                    Caching & Rate Limiting
```

**Why This Approach?**
- 🔒 **Security**: API keys never exposed to users
- 🎯 **UX**: Zero-setup experience
- ⚡ **Performance**: Centralized caching reduces duplicate requests
- 📊 **Control**: Developer manages quota and can optimize server-side
- 🛡️ **Safety**: Rate limiting prevents abuse

**What Changed from v1.0:**
- ❌ Removed: User-managed API keys
- ❌ Removed: Complex setup instructions
- ✅ Added: Backend serverless API
- ✅ Added: Response caching
- ✅ Added: Rate limiting

---
   - Example: `30` for 30 minutes per day
6. Click **"Generate Plan"**

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

## 🏗️ Project Structure

```
youtube-playlist-planner/
├── manifest.json           # Extension configuration (v2.0)
├── popup.html              # UI structure
├── popup.js                # Main orchestration logic
├── styles.css              # Modern dark theme
├── README.md               # This file
├── assets/
│   └── icon.png            # Extension icon (128x128)
├── backend/                # Backend API (NEW in v2.0)
│   ├── api/
│   │   └── playlist-info.js  # Serverless function
│   ├── package.json
│   ├── vercel.json         # Deployment config
│   ├── .env.example        # Environment template
│   └── README.md           # Backend documentation
└── utils/
    ├── storage.js          # Chrome storage wrapper
    ├── api.js              # Backend API client (updated)
    ├── timeConverter.js    # ISO-8601 duration parser
    └── planner.js          # Day-wise scheduling algorithm
```

---

## 🔧 Developer Setup

**For users**: Skip this section - no setup needed!

**For developers** who want to deploy their own backend:

### 1. Backend Deployment

See [backend/README.md](backend/README.md) for complete instructions.

**Quick version:**
```bash
cd backend
npm install
cp .env.example .env
# Add your YOUTUBE_API_KEY to .env
npm run deploy  # Deploys to Vercel
```

### 2. Update Extension

After deploying backend, update [utils/api.js](utils/api.js):
```javascript
const BACKEND_API_URL = 'https://your-app.vercel.app/api/playlist-info';
```

### 3. Reload Extension

Go to `chrome://extensions/` and click reload button.

---

## 🧪 Local Backend Testing

Run the backend locally while you iterate on the extension UI.

1) **Install & configure**
  - `cd backend && npm install`
  - `cp .env.example .env` and set `YOUTUBE_API_KEY`
  - (Optional) Set `CORS_ALLOWED_ORIGINS` in `.env` if you want to restrict origins

2) **Start the server**
  - `npm start` (runs [backend/server.js](backend/server.js) on `http://localhost:3000`)

3) **Hit the API directly**
  - `curl "http://localhost:3000/api/playlist-info?playlistId=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf"`
  - You should see JSON with playlist title, count, and video durations

4) **Point the extension at local dev**
  - Update `BACKEND_API_URL` in [utils/api.js](utils/api.js) to `http://localhost:3000/api/playlist-info`
  - Reload the extension from `chrome://extensions/`

5) **Common pitfalls**
  - 400/404 errors: playlist must be public/unlisted and a valid ID
  - 429 errors: wait a minute; the server enforces 10 req/min/IP
  - CORS errors: add your origin (or extension ID) to `CORS_ALLOWED_ORIGINS`

---

## 🧠 How It Works

### 1. **URL Validation**
```javascript
// Extracts playlist ID from various URL formats
extractPlaylistId("youtube.com/playlist?list=PLxxx") → "PLxxx"
```

### 2. **Backend API Flow** (New Architecture)
```
Extension → Backend → YouTube API → Backend → Extension
              ↓
           Cache Check
              ↓
        Rate Limit Check
```

**What the backend does:**
- Validates playlist ID format
- Checks cache (1-hour TTL)
- Fetches playlist metadata from YouTube
- Handles pagination (50+ videos)
- Batch-fetches video durations
- Parses ISO-8601 durations to minutes
- Returns sanitized JSON

**What the extension receives:**
```json
{
  "title": "Playlist Name",
  "videoCount": 42,
  "videos": [
    { "id": "abc123", "title": "Video 1", "durationMinutes": 15 },
    { "id": "def456", "title": "Video 2", "durationMinutes": 23 }
  ]
}
```

### 3. **Planner Algorithm** (Unchanged)
```
For each video sequentially:
  While video has remaining time:
    - Calculate watchable time (min of video remaining, day remaining)
    - Add to current day
    - If day full or video done → finalize day
    - If video incomplete → carry remainder to next day
```

**Example**:
- Daily time: 30 minutes
- Videos: [25min, 40min, 15min]
- Plan:
  - Day 1: Video 1 (25min) + Video 2 (0-5min) = 30min
  - Day 2: Video 2 (5-35min) = 30min
  - Day 3: Video 2 (35-40min) + Video 3 (15min) = 20min

### 4. **State Persistence**
Data stored in `chrome.storage.local`:
```javascript
{
  planData: {
    playlistData: {...},
    plan: [...],
    dailyWatchTime: 30
  }
}
```

**Note**: API keys no longer stored (v2.0 change)

---

## 🎓 Learning Outcomes

### Chrome Extension Development
- **Manifest V3 structure** (permissions, popup architecture)
- **chrome.storage API** (local data persistence)
- **Extension security** (Content Security Policy, API key handling)
- **Popup lifecycle** (initialization, state management)

### API Integration
- **RESTful API consumption** (fetch, async/await)
- **Backend proxy pattern** (security best practice)
- **Error handling** (network failures, invalid responses)
- **Serverless architecture** (Vercel functions)

### Backend Development (New)
- **Serverless functions** (Node.js on Vercel)
- **Environment variables** (secure API key storage)
- **Rate limiting** (IP-based throttling)
- **Caching strategies** (in-memory with TTL)
- **Input validation** (security hardening)
- **CORS configuration** (cross-origin requests)

### Algorithm Design
- **Time-based scheduling** (greedy algorithm)
- **Edge case handling** (empty playlists, very long videos, exact-fit scenarios)
- **State machines** (tracking progress across multiple entities)

### Frontend Development
- **DOM manipulation** (dynamic rendering without frameworks)
- **Event delegation** (efficient event handling)
- **CSS custom properties** (theming system)
- **Responsive design** (card-based layouts, scrollable containers)

### JavaScript Patterns
- **Promise-based async operations**
- **Modular architecture** (separation of concerns)
- **Error boundaries** (try-catch in async functions)
- **Data transformation pipelines** (map, reduce, filter)

---

## 🐛 Troubleshooting

### "Could not connect to server"
- Check your internet connection
- Verify backend is deployed and accessible
- Contact developer if issue persists

### "Playlist not found or is private"
- Playlist must be **public** or **unlisted** (not private)
- Check URL format is correct

### "Too many requests"
- Wait 1 minute and try again
- Backend has rate limiting (10 requests/minute per IP)

### Extension Not Loading
- Ensure Developer mode is enabled
- Check console for errors (`chrome://extensions/` → "Errors" button)
- Try removing and re-adding the extension

### Plan Not Saving
- Check browser storage permissions
- Verify no browser extensions blocking chrome.storage
- Check console for storage errors

---

## 🔒 Privacy & Security

**v2.0 Security Improvements:**
- ✅ **No API keys in client code** (stored securely on backend)
- ✅ **No user authentication required** (stateless requests)
- ✅ **Rate limiting** (prevents abuse)
- ✅ **Input validation** (prevents injection attacks)
- ✅ **No data collection** (all processing happens server-side or client-side)
- ✅ **No tracking** (no analytics, no telemetry)
- ✅ **Open source** (audit the code yourself)

**What data is sent to the backend:**
- Playlist ID only (extracted from URL)

**What data is NOT sent:**
- Your YouTube account
- Watch history
- Personal information
- API keys

---

## 📝 Future Enhancements

Potential features for future versions:
- [ ] Export plan to calendar (Google Calendar, iCal)
- [ ] Email reminders for daily goals
- [ ] Multi-playlist support
- [ ] Video notes/bookmarks
- [ ] Progress statistics (completion rate, streaks)
- [ ] Dark/light theme toggle
- [ ] Custom scheduling (skip weekends, variable daily times)
- [ ] Redis caching for distributed backend (scalability)
- [ ] Admin dashboard for monitoring usage

---

## 🔄 Changelog

### v2.0.0 (Major Refactor)
- ✅ Removed user API key requirement
- ✅ Added backend serverless API (Vercel)
- ✅ Implemented response caching (1-hour TTL)
- ✅ Added rate limiting (10 req/min per IP)
- ✅ Improved error messages
- ✅ Simplified UI (removed API key section)
- ✅ Updated manifest to v2.0.0
- ✅ Removed googleapis.com permissions

### v1.0.0 (Initial Release)
- Basic functionality with user-managed API keys

---

## 📄 License

MIT License - Feel free to use, modify, and distribute.

---

## 🙏 Acknowledgments

- **YouTube Data API v3** by Google
- **Chrome Extensions documentation** by Google
- **Vercel** for serverless hosting
- Built as a learning project demonstrating modern web development architecture

---

## 📧 Support

For issues or questions:
1. Check the **Troubleshooting** section above
2. Review console logs for error messages
3. Verify playlist is public/unlisted
4. Contact developer for backend issues

**Happy Learning & Watching! 🎬**

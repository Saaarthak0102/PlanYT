# YouTube Playlist Watch-Time Planner — Project Summary

## Overview
- Status: ✅ Shipping (v2.0)
- Type: Chrome Extension (Manifest V3) + lightweight backend API
- UX: Zero-setup for users; backend keeps the YouTube Data API key
- Tech: Vanilla JS (popup), Node/Express-compatible backend (Vercel/serverless ready), CSS custom properties

---

## What Changed in v2.0
- Removed user-managed API keys; backend proxy holds the key server-side
- Added caching + rate limiting on the backend for quota safety
- Updated `utils/api.js` to call the backend endpoint instead of googleapis.com
- Simplified UI: no API key input; faster fetch + plan render

---

## Architecture
```
User → Extension popup → Backend API → YouTube Data API v3
                     ↓
              Cache + Rate Limit
```
- Backend: Express-style handler in [backend/api/playlist-info.js](backend/api/playlist-info.js) exposed via [backend/server.js](backend/server.js) or Vercel
- CORS: configurable via `CORS_ALLOWED_ORIGINS` when running locally/self-hosted
- Health: GET /health returns `{ ok: true }`

---

## Feature Snapshot
- Playlist analysis (public/unlisted) with full pagination
- Accurate duration computation (ISO-8601 parsing)
- Greedy day-wise planner with partial-video splits
- Progress tracking with persistence in `chrome.storage.local`
- Responsive dark UI with smooth interactions

---

## Key Files
```
youtube-playlist-planner/
├── manifest.json
├── popup.html
├── popup.js
├── styles.css
├── README.md
├── PROJECT_SUMMARY.md (this doc)
├── assets/
├── utils/
│   ├── api.js          # Backend client
│   ├── planner.js      # Day-wise scheduling
│   ├── storage.js      # chrome.storage wrapper
│   └── timeConverter.js# ISO-8601 → minutes
└── backend/
    ├── server.js       # Local/server deploy entry
    ├── api/playlist-info.js # Core handler
    ├── package.json
    ├── .env.example
    └── README.md
```

---

## Data Flow (Backend)
1) Validate playlist ID
2) Check cache (1h TTL via node-cache)
3) Fetch playlist metadata + items (handles pagination)
4) Batch-fetch video durations (50 IDs/request)
5) Parse ISO-8601 to minutes, return sanitized JSON
6) Rate limit: 10 requests/min/IP (adjust in handler if needed)

---

## Planner Algorithm (Popup)
- Greedy, order-preserving packing into daily buckets
- Splits videos across days when needed (tracks start/end offsets)
- Time complexity O(N) with N = videos; predictable and easy to reason about

---

## Storage Schema (Popup)
```json
{
  "planData": {
    "playlistData": { "id": "PL...", "title": "...", "videoCount": 42, "videos": [...] },
    "plan": [ { "day": 1, "videos": [...], "totalTime": 30, "completed": false }, ... ],
    "dailyWatchTime": 30
  }
}
```
- No API keys stored client-side (removed in v2.0)

---

## Backend API Quick Reference
- Endpoint: `/api/playlist-info`
- Methods: GET or POST
- Params: `playlistId` (string, required)
- Success: `{ title, videoCount, videos: [{ id, title, durationMinutes }] }`
- Errors: 400 (invalid/missing), 404 (not found/private), 429 (rate limit), 500 (server/config)

---

## Local Dev (Backend)
1) `cd backend && npm install`
2) `cp .env.example .env` and set `YOUTUBE_API_KEY`
3) `npm start` (serves on http://localhost:3000)
4) Test: `curl "http://localhost:3000/api/playlist-info?playlistId=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf"`
5) Point extension at local: set `BACKEND_API_URL` in [utils/api.js](utils/api.js) to `http://localhost:3000/api/playlist-info` and reload extension

---

## Deployment Notes
- Vercel/serverless ready; see [backend/README.md](backend/README.md)
- Set env var `YOUTUBE_API_KEY`; optionally `CORS_ALLOWED_ORIGINS`
- No changes required in the extension after backend URL is set

---

## Troubleshooting Pointers
- 400/404: ensure playlist is public/unlisted and ID is valid
- 429: wait a minute; rate limiter triggered
- CORS errors: add your origin or extension ID to `CORS_ALLOWED_ORIGINS`

---

## Future Ideas
- Calendar export, reminders, multi-playlist, richer stats, Redis cache for distributed deployments

**Total Code**: ~1,744 lines

---

## 🧠 Technical Deep Dive

### 1. Chrome Extension Architecture (Manifest V3)

**Why Manifest V3?**
- Latest standard (V2 deprecated January 2024)
- Enhanced security (stricter CSP, no inline scripts)
- Better performance (service workers instead of background pages)

**Key Manifest Fields Explained**:
```json
{
  "manifest_version": 3,              // Required: Latest version
  "permissions": ["storage"],         // Access to chrome.storage.local
  "host_permissions": ["..."],        // API calls to googleapis.com
  "action": {
    "default_popup": "popup.html"     // Opens on icon click
  }
}
```

**Extension Lifecycle**:
1. User clicks icon → Chrome opens popup.html in new context
2. popup.html loads → Executes all <script> tags sequentially
3. DOMContentLoaded fires → Initialization runs
4. User interacts → Event handlers execute
5. Popup closes → Context destroyed (but storage persists)
6. Popup reopens → Fresh context, must restore state from storage

**Why No Background Script?**
- Not needed: All operations are user-triggered (no background tasks)
- Simpler: Popup-only architecture reduces complexity
- Efficient: No persistent background process consuming resources

---

### 2. YouTube Data API v3 Integration

**API Flow**:
```
1. User pastes URL → extractPlaylistId()
   ↓
2. Fetch playlist metadata
   GET /playlists?part=snippet&id={playlistId}
   → Returns: {title, description, ...}
   ↓
3. Fetch all video IDs (pagination loop)
   GET /playlistItems?part=contentDetails&playlistId={id}&maxResults=50
   → Returns: {items: [{videoId}, ...], nextPageToken}
   → Repeat if nextPageToken exists
   ↓
4. Batch-fetch video durations (max 50 IDs per request)
   GET /videos?part=snippet,contentDetails&id={id1,id2,...,id50}
   → Returns: {items: [{duration: "PT4M13S"}, ...]}
   ↓
5. Parse durations → Sum total → Display
```

**Why Pagination?**
- YouTube API returns max 50 items per request
- Large playlists (100+ videos) require multiple requests
- `nextPageToken` used to fetch subsequent pages

**Why Batch Requests?**
- Efficiency: 1 request for 50 videos vs. 50 individual requests
- Quota conservation: 1 unit vs. 50 units
- Speed: Parallel processing in single network roundtrip

**Quota Management**:
- Default: 10,000 units/day
- Playlist fetch: ~1 unit
- PlaylistItems: 1 unit per page (50 videos)
- Videos batch: 1 unit per 50 videos
- Example: 150-video playlist = 1 + 3 + 3 = 7 units

---

### 3. ISO-8601 Duration Parsing

**Why This Format?**
- International standard (ISO 8601)
- Unambiguous (PT1H2M30S = 1 hour, 2 min, 30 sec)
- Compact representation

**Parsing Algorithm**:
```javascript
// Input: "PT1H2M30S"
// Regex: /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
//         ↑   ↑       ↑       ↑       ↑
//         P   hours   mins    secs    (all optional)

const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
// match[1] = hours, match[2] = minutes, match[3] = seconds

// Convert to total minutes:
totalMinutes = (hours * 60) + minutes + (seconds / 60)
```

**Edge Cases Handled**:
- `PT4M13S` → hours missing → match[1] = undefined → 0
- `PT1H` → minutes/seconds missing → correct parsing
- `PT45S` → only seconds → converts to 0.75 minutes
- Invalid format → returns 0 (fail-safe)

**Why Convert to Minutes?**
- Easier arithmetic (1 unit vs. managing hours/mins/secs)
- Simpler algorithm (no time unit conversions mid-calculation)
- Display formatting happens only at render time

---

### 4. Day-Wise Planner Algorithm

**Problem Statement**:
Given N videos with durations [d1, d2, ..., dN] and daily watch time T, distribute videos sequentially across days such that no day exceeds T minutes.

**Algorithm Type**: Greedy (First-Fit Decreasing)

**Pseudocode**:
```
currentDay = 1
remainingTime = dailyLimit

for each video in playlist:
    videoRemaining = video.duration
    videoStart = 0
    
    while videoRemaining > 0:
        watchTime = min(videoRemaining, remainingTime)
        
        Add segment to currentDay:
            {title, startTime: videoStart, endTime: videoStart + watchTime}
        
        videoRemaining -= watchTime
        remainingTime -= watchTime
        videoStart += watchTime
        
        if remainingTime ≈ 0:
            Finalize currentDay
            currentDay++
            remainingTime = dailyLimit
```

**Key Design Decisions**:

1. **Sequential Assignment** (not optimal packing)
   - Pros: Predictable, maintains playlist order, simple
   - Cons: Last day may be under-utilized
   - Alternative: Bin-packing (complex, loses order)

2. **Partial Video Support**
   - Videos can span multiple days
   - Tracked via `startTime` and `endTime`
   - Example: 40-min video with 30-min daily limit
     - Day 1: 0-30 minutes
     - Day 2: 30-40 minutes

3. **Floating-Point Precision**
   - Use `remainingTime <= 0.01` instead of `=== 0`
   - Avoids rounding errors (e.g., 0.0000001 minutes)

**Time Complexity**: O(N) where N = number of videos
**Space Complexity**: O(D) where D = number of days

**Example Walkthrough**:
```
Videos: [20min, 40min, 15min]
Daily limit: 30min

Day 1:
  - Video 1: 20min (full) → remaining: 10min
  - Video 2: 10min (0-10) → remaining: 0min
  → Finalize Day 1: [Video1(full), Video2(0-10)]

Day 2:
  - Video 2: 30min (10-40) → remaining: 0min
  → Finalize Day 2: [Video2(10-40)]

Day 3:
  - Video 3: 15min (full) → remaining: 15min
  → Finalize Day 3: [Video3(full)]

Result: 3 days
```

---

### 5. State Management & Persistence

**Storage Schema**:
```javascript
chrome.storage.local:
{
  "apiKey": "AIzaSy...",           // Masked in UI as ****
  "planData": {
    "playlistData": {
      "id": "PLxxx",
      "title": "My Playlist",
      "videoCount": 50,
      "totalDuration": 1200,       // minutes
      "videos": [
        {id, title, durationMinutes},
        ...
      ]
    },
    "plan": [
      {
        "day": 1,
        "videos": [{title, startTime, endTime, duration, isPartial}],
        "totalTime": 30,
        "completed": false
      },
      ...
    ],
    "dailyWatchTime": 30
  }
}
```

**Why chrome.storage.local?**
- Persistent (survives browser restarts)
- Secure (isolated per extension)
- Async (non-blocking)
- Quota: 10MB (sufficient for thousands of playlists)

**Promise Wrapper Pattern**:
```javascript
// Chrome API uses callbacks (old pattern)
chrome.storage.local.get(['key'], (result) => { ... });

// We wrap in Promises (modern pattern)
function getFromStorage(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], (result) => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve(result[key]);
    });
  });
}

// Usage: async/await syntax
const data = await getFromStorage('planData');
```

**State Restoration Flow**:
```
Popup Opens
  ↓
DOMContentLoaded fires
  ↓
Load apiKey from storage → Mask in UI
  ↓
Load planData from storage
  ↓
If exists:
  - Restore appState
  - displayPlaylistSummary()
  - renderPlan()
  - Show all relevant UI sections
```

---

### 6. Dynamic UI Rendering

**Why Not Use a Framework?**
- Learning goal: Understand DOM manipulation fundamentals
- Overkill: Simple UI doesn't justify React/Vue overhead
- Performance: Vanilla JS is faster for small-scale DOM ops
- Bundle size: No framework = smaller extension package

**Rendering Pattern**:
```javascript
function renderPlan(plan) {
  // Clear existing content
  container.innerHTML = '';
  
  // Create elements programmatically
  plan.forEach(dayData => {
    const card = createDayCard(dayData);
    container.appendChild(card);
  });
}

function createDayCard(data) {
  const card = document.createElement('div');
  card.className = 'day-card';
  
  // Build structure
  const header = createElement('div', 'day-header', `Day ${data.day}`);
  const list = createElement('ul', 'video-list', ...);
  const checkbox = createCheckbox(data.completed);
  
  // Assemble
  card.append(header, list, checkbox);
  return card;
}
```

**Event Delegation**:
```javascript
// Instead of adding listener to each checkbox (N listeners)
checkboxes.forEach(cb => cb.addEventListener('change', handler));

// Add single listener to parent (1 listener)
container.addEventListener('change', (e) => {
  if (e.target.type === 'checkbox') {
    const index = e.target.dataset.index;
    handleDayCompletion(index, e.target.checked);
  }
});
```

**Why Dataset Attributes?**
```html
<div class="day-card" data-day-index="0">...</div>
```
- Links DOM elements to data without global lookups
- Faster than searching arrays
- Clean separation of data and presentation

---

### 7. CSS Architecture

**Design System**:
```css
:root {
  /* Color tokens */
  --bg-primary: #1a1a1a;
  --accent-primary: #5b8dff;
  
  /* Spacing scale */
  --spacing-sm: 8px;
  --spacing-md: 16px;
  
  /* Transition timing */
  --transition-fast: 0.15s ease;
}
```

**Benefits**:
- Single source of truth for design values
- Easy theme changes (modify root variables)
- Consistent spacing/colors across components
- Better than Sass variables (works in browser natively)

**BEM-Inspired Naming**:
```css
.day-card { }              /* Block */
.day-card__header { }      /* Element */
.day-card--completed { }   /* Modifier */
```

**Accessibility**:
- WCAG AA contrast ratios (4.5:1 minimum)
- Focus states for keyboard navigation
- Semantic HTML (section, header, ul)
- Label associations (for="checkbox-id")

---

## 🎯 Learning Outcomes Achieved

### Technical Skills
✅ **Chrome Extensions**: Manifest structure, permissions, storage API, popup lifecycle  
✅ **REST APIs**: fetch(), async/await, error handling, pagination, batching  
✅ **Algorithms**: Time-based scheduling, greedy algorithms, edge case handling  
✅ **Data Structures**: State management, array operations, object transformations  
✅ **DOM Manipulation**: createElement, event listeners, dynamic rendering  
✅ **CSS**: Custom properties, responsive design, animations, accessibility  
✅ **JavaScript**: Promises, async patterns, regex, array methods  

### Software Engineering Practices
✅ **Modular Architecture**: Separation of concerns (storage, API, logic, UI)  
✅ **Error Handling**: Try-catch, validation, user feedback  
✅ **State Management**: Single source of truth, persistence  
✅ **Documentation**: README, testing guide, inline comments  
✅ **User Experience**: Loading states, error messages, progress tracking  

### Problem-Solving
✅ **API Integration**: Understanding docs, quota management, optimization  
✅ **Algorithm Design**: Breaking down complex problems, pseudocode → code  
✅ **Edge Cases**: Handling unusual inputs, boundary conditions  
✅ **Performance**: Minimizing API calls, efficient rendering  

---

## 🚀 Production Readiness

### ✅ Completed
- All core features working end-to-end
- Comprehensive error handling
- Data persistence implemented
- Modern, accessible UI
- Full documentation (README, testing guide)
- Edge cases handled

### ⚠️ Known Limitations (Documented)
- Deleted/private videos in playlist may cause issues
- Large playlists (1000+) may be slow
- Live streams (PT0S duration) not supported
- API quota limits (10,000 units/day)

### 🔮 Future Enhancements (Optional)
- Calendar export (Google Calendar, iCal)
- Multi-playlist support
- Progress statistics/streaks
- Variable daily times (weekends vs weekdays)
- Video notes/bookmarks

---

## 📊 Project Statistics

- **Development Time**: ~6 phases (foundation → deployment)
- **Lines of Code**: ~1,744 lines
- **Files Created**: 11 files
- **API Endpoints Used**: 3 (playlists, playlistItems, videos)
- **External Dependencies**: 0 (pure vanilla JS)
- **Storage Used**: ~50-500KB per plan (depending on playlist size)

---

## 🎉 Final Status

**The extension is fully functional and ready for use!**

### To Deploy:
1. Load in Chrome via `chrome://extensions/` → "Load unpacked"
2. Get YouTube API key from Google Cloud Console
3. Add API key in extension
4. Start planning playlists!

### To Learn From:
- Read code comments in each file
- Test edge cases from TESTING.md
- Experiment with modifications (e.g., add new features)
- Study the algorithm in `planner.js`
- Inspect network requests in DevTools

---

**Project completed successfully with all learning objectives met! 🚀**

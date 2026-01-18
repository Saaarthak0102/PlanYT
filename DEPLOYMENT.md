# Deployment Guide for Production

## Quick Deploy (Recommended: Vercel)

### Prerequisites
- YouTube Data API key from Google Cloud Console
- Vercel account (free at vercel.com)

### Step-by-Step Deployment

**1. Prepare Backend**
```bash
cd backend
```

**2. Deploy to Vercel**

Option A - Using Vercel CLI:
```bash
# Login
vercel login

# Deploy (follow prompts)
vercel

# When asked:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? youtube-playlist-backend (or your choice)
# - Directory? ./
# - Override settings? No

# After deploy, set environment variable:
vercel env add YOUTUBE_API_KEY

# Paste your YouTube API key when prompted
# Select: Production, Preview, Development (all three)

# Redeploy to apply env var:
vercel --prod
```

Option B - Using Vercel Dashboard:
1. Go to https://vercel.com/new
2. Import Git repository OR upload `backend` folder
3. Configure:
   - Framework Preset: Other
   - Build Command: (leave empty)
   - Output Directory: (leave empty)
4. Add Environment Variable:
   - Key: `YOUTUBE_API_KEY`
   - Value: Your API key from Google Cloud
5. Click Deploy
6. Copy your deployment URL (e.g., `https://your-project.vercel.app`)

**3. Update Extension**

Edit `utils/api.js` line 10:
```javascript
const BACKEND_API_URLS = [
  'https://YOUR-PROJECT.vercel.app/api/playlist-info',  // Replace with your URL
  'http://localhost:3000/api/playlist-info'
];
```

**4. Test Extension**
1. Open Chrome → `chrome://extensions/`
2. Click "Reload" on your extension
3. Test with a playlist URL
4. Check browser console for any errors

**5. Package Extension for Distribution**

```bash
cd ..  # Back to project root
```

Create a ZIP (exclude backend and dev files):
- Include: manifest.json, popup.html, popup.js, styles.css, utils/, assets/
- Exclude: backend/, .git/, node_modules/, .env, PROJECT_SUMMARY.md

In PowerShell:
```powershell
# Create distribution folder
New-Item -ItemType Directory -Force -Path "dist"

# Copy extension files
Copy-Item manifest.json, popup.html, popup.js, styles.css, README.md -Destination dist/
Copy-Item -Recurse utils, assets -Destination dist/

# Create ZIP
Compress-Archive -Path dist/* -DestinationPath youtube-playlist-planner-v2.0.zip -Force
```

**6. Publish to Chrome Web Store** (Optional)

1. Go to https://chrome.google.com/webstore/devconsole
2. Pay one-time $5 developer fee (if first time)
3. Click "New Item"
4. Upload `youtube-playlist-planner-v2.0.zip`
5. Fill in store listing:
   - Name: YouTube Playlist Watch-Time Planner
   - Description: Plan your YouTube playlist watching with daily schedules
   - Category: Productivity
   - Screenshots: Take screenshots of your extension in action
6. Submit for review (takes 1-3 days)

---

## Alternative Hosting Options

### Railway.app (Free Tier)
1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Select backend folder
4. Add environment variable: `YOUTUBE_API_KEY`
5. Get deployment URL

### Render.com (Free Tier)
1. Go to https://render.com
2. New → Web Service
3. Connect repository
4. Settings:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Add env var: `YOUTUBE_API_KEY`
5. Get deployment URL

### Self-Hosted VPS
```bash
# On your server (Ubuntu example)
git clone <your-repo>
cd backend
npm install
npm install -g pm2

# Create .env file
echo "YOUTUBE_API_KEY=your_key_here" > .env

# Start with PM2 (process manager)
pm2 start server.js --name youtube-backend
pm2 save
pm2 startup

# Setup nginx reverse proxy (optional)
```

---

## Cost Estimates

**Free Tier Limits:**
- Vercel: 100GB bandwidth, 100K function invocations/month
- YouTube API: 10,000 quota units/day (≈2,000 playlist fetches with caching)

**Sufficient for:**
- ~10,000 active users/month
- ~50,000 playlist fetches/month (with 1hr cache)

**To Scale Beyond:**
- Vercel Pro: $20/month (unlimited)
- YouTube quota increase: Request in Google Cloud Console (usually approved for free)

---

## Monitoring

**Check Vercel Logs:**
```bash
vercel logs
```

**Or in Dashboard:**
https://vercel.com/dashboard → Your Project → Logs

**Monitor YouTube Quota:**
Google Cloud Console → APIs & Services → Dashboard → YouTube Data API v3

---

## Troubleshooting

**Extension shows "All endpoints failed":**
- Check backend is deployed and accessible
- Verify `BACKEND_API_URL` in utils/api.js matches your deployment
- Check browser console for CORS errors

**"Server configuration error":**
- Environment variable `YOUTUBE_API_KEY` not set on Vercel
- Add it via: `vercel env add YOUTUBE_API_KEY`

**Quota exceeded:**
- Increase cache duration in backend/api/playlist-info.js
- Request quota increase in Google Cloud Console

---

## Security Checklist

- ✅ API key stored as environment variable (not in code)
- ✅ Rate limiting enabled (10 req/min)
- ✅ Input validation for playlist IDs
- ✅ CORS configured (extension-only access)
- ⚠️ Consider adding request authentication for production scale

---

**You're ready to deploy!** Start with Vercel Option B (dashboard) - it's the easiest.

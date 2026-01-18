<!-- File removed: backend README not required in minimal distribution -->

## 🚀 Deployment (Developer Only)

### Prerequisites

1. **YouTube Data API Key**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create/select a project
   - Enable "YouTube Data API v3"
   - Create credentials → API Key
   - Copy the key

2. **Vercel Account**
   - Sign up at [vercel.com](https://vercel.com)
   - Install Vercel CLI: `npm install -g vercel`

### Setup Steps

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```

4. **Add your API key to `.env`**
   ```
   YOUTUBE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

5. **Test locally (optional)**
   ```bash
   npm run dev
   ```
   Visit: `http://localhost:3000/api/playlist-info?playlistId=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf`

6. **Deploy to Vercel**
   ```bash
   npm run deploy
   ```
   
   Or use Vercel dashboard:
   - Import this repository
   - Set environment variable: `YOUTUBE_API_KEY`
   - Deploy

7. **Update extension configuration**
   - Copy your deployed URL (e.g., `https://your-app.vercel.app`)
   - Update `BACKEND_API_URL` in `utils/api.js`

---

## 📡 API Reference

### Endpoint

```
GET/POST /api/playlist-info
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| playlistId | string | Yes | YouTube playlist ID (from URL) |

### Example Request

**Query Parameter (GET)**
```
GET /api/playlist-info?playlistId=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf
```

**Body Parameter (POST)**
```json
POST /api/playlist-info
Content-Type: application/json

{
  "playlistId": "PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf"
}
```

### Response Format

**Success (200 OK)**
```json
{
  "title": "Web Development Tutorials",
  "videoCount": 42,
  "videos": [
    {
      "id": "dQw4w9WgXcQ",
      "title": "Introduction to HTML",
      "durationMinutes": 15
    },
    {
      "id": "jNQXAC9IVRw",
      "title": "CSS Fundamentals",
      "durationMinutes": 23
    }
  ]
}
```

**Error Responses**

| Status | Reason | Response |
|--------|--------|----------|
| 400 | Missing playlistId | `{ "error": "Missing required parameter: playlistId" }` |
| 400 | Invalid playlist ID | `{ "error": "Invalid playlist ID format" }` |
| 404 | Playlist not found | `{ "error": "Playlist not found or is private" }` |
| 429 | Rate limit exceeded | `{ "error": "Too many requests. Please wait..." }` |
| 500 | Server error | `{ "error": "Server configuration error..." }` |

---

## 🔒 Security Features

### 1. **API Key Protection**
- Stored in environment variables (never in code)
- Not exposed to client-side
- Vercel encrypts environment variables

### 2. **Rate Limiting**
- IP-based throttling
- Maximum 10 requests per minute per IP
- Prevents abuse and quota exhaustion

### 3. **Input Validation**
- Playlist ID format validation
- Sanitizes all inputs
- Rejects malformed requests

### 4. **CORS Configuration**
- Allows extension origin only (in production, configure restrictive CORS)
- Prevents unauthorized web access

---

## 💾 Caching Strategy

- **Cache Duration**: 1 hour per playlist
- **Cache Key**: `playlist_{playlistId}`
- **Benefits**:
  - Reduces YouTube API quota usage
  - Faster response times for popular playlists
  - Cost savings (less API calls)

**Cache Invalidation**: Automatic after 1 hour

---

## 📊 Performance

- **Average Response Time**: 1-3 seconds (uncached)
- **Cached Response**: < 100ms
- **Handles**:
  - Playlists with 1000+ videos
  - Pagination automatically
  - Concurrent requests efficiently

---

## 🛠️ Development

### Local Testing

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Test endpoint
curl "http://localhost:3000/api/playlist-info?playlistId=YOUR_PLAYLIST_ID"
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| YOUTUBE_API_KEY | YouTube Data API v3 key | Yes |

### Dependencies

- `node-cache`: In-memory caching
- `@vercel/node`: Vercel serverless runtime (auto-installed)

---

## 🐛 Troubleshooting

### "Server configuration error"
- **Cause**: `YOUTUBE_API_KEY` not set in Vercel
- **Fix**: Add environment variable in Vercel dashboard

### "Quota exceeded" errors
- **Cause**: YouTube API quota limit reached
- **Fix**: 
  - Wait for quota reset (daily)
  - Request quota increase in Google Cloud Console
  - Implement longer cache TTL

### CORS errors in extension
- **Cause**: Backend URL mismatch
- **Fix**: Verify `BACKEND_API_URL` in extension matches deployed URL

---

## 📈 Monitoring

### View Logs
```bash
vercel logs
```

### Check Usage
- Visit Vercel dashboard
- View function invocations
- Monitor response times

### YouTube API Quota
- Check in Google Cloud Console
- Navigate to "APIs & Services" → "Dashboard"
- Monitor daily quota usage

---

## 🔄 Updating

### To update the backend:

1. Make changes to `api/playlist-info.js`
2. Test locally: `npm run dev`
3. Deploy: `npm run deploy`
4. Extension automatically uses new version (same URL)

---

## 💰 Cost Estimate

**Vercel (Free Tier)**
- 100GB bandwidth/month
- 100,000 function invocations/month
- Sufficient for ~10,000 users

**YouTube API Quota**
- Free tier: 10,000 units/day
- Playlist fetch: ~3-5 units
- With caching: ~2,000 unique playlists/day

**Scaling Beyond Free Tier**
- Vercel Pro: $20/month (unlimited)
- YouTube quota increase: Free (request in console)

---

## 🤝 Contributing

To improve the backend:
1. Add more aggressive caching
2. Implement Redis for distributed caching
3. Add analytics/monitoring
4. Implement webhook for quota alerts

---

## 📄 License

MIT License - See main project README

# 🆓 FREE VolSpike Setup Guide (No Railway Pro Required)

## Overview
This setup uses **GitHub Actions** (free) + **client-side WebSocket** for Elite tier to avoid Railway's shared IP being blocked by Binance.

## Architecture
- **Free/Pro tiers**: GitHub Actions fetches Binance data every 5 minutes → Redis → Backend API
- **Elite tier**: Direct client-side Binance WebSocket connection (no server needed)
- **Backend**: Cache-only, never calls Binance directly

## Setup Steps

### 1. Add GitHub Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions

Add these secrets:
```
UPSTASH_REDIS_REST_URL=https://your-redis-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### 2. Test GitHub Actions Ingestion

```bash
# Trigger the workflow manually
# Go to GitHub repo → Actions → "Ingest Binance Data to Redis" → "Run workflow"

# Or push to main to trigger it
git add .
git commit -m "Add GitHub Actions ingestion"
git push origin main
```

### 3. Verify Data in Redis

```bash
# Check if data is being stored
railway run -s VolSpike-backend -- node -e "
const redis = require('ioredis').Redis(process.env.REDIS_URL);
redis.get('market:data').then(data => {
  if (data) {
    const parsed = JSON.parse(data);
    console.log('✅ Market data found:', parsed.length, 'symbols');
    console.log('Top 3:', parsed.slice(0, 3).map(x => x.symbol));
  } else {
    console.log('❌ No market data found');
  }
});
"
```

### 4. Test Backend API

```bash
# Test health endpoint
curl https://volspike-backend-production.up.railway.app/api/market/health

# Test market data (should return 200, not 500)
curl https://volspike-backend-production.up.railway.app/api/market/data
```

### 5. Deploy Frontend Changes

```bash
# Deploy frontend with client-side WebSocket support
railway redeploy -s VolSpike-frontend
```

## Expected Results

### ✅ Free/Pro Tiers
- Data updates every 5 minutes via GitHub Actions
- Backend serves from Redis cache
- No 500 errors (cache-only backend)

### ✅ Elite Tier  
- Real-time data via client-side Binance WebSocket
- Updates every few seconds
- No server egress needed

### ✅ Health Monitoring
- `/api/market/health` shows ingestion status
- GitHub Actions heartbeat tracking
- Error logging for debugging

## Troubleshooting

### GitHub Actions Not Running
```bash
# Check workflow status
# Go to GitHub repo → Actions tab
# Look for "Ingest Binance Data to Redis" workflow

# Check logs for errors
# Click on the workflow run → View logs
```

### No Data in Redis
```bash
# Check Redis connection
railway run -s VolSpike-backend -- node -e "
const redis = require('ioredis').Redis(process.env.REDIS_URL);
redis.ping().then(() => console.log('✅ Redis connected')).catch(console.error);
"

# Check if GitHub Actions secrets are correct
# Go to GitHub repo → Settings → Secrets and variables → Actions
```

### Elite Tier WebSocket Not Working
```bash
# Check browser console for WebSocket errors
# Elite tier should see: "✅ Binance WebSocket connected (client-side)"

# Test WebSocket manually
# Open browser console and run:
const ws = new WebSocket('wss://fstream.binance.com/stream?streams=!ticker@arr');
ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => console.log('Data:', JSON.parse(e.data));
```

## Cost Breakdown

- **GitHub Actions**: Free (2,000 minutes/month)
- **Railway**: Free tier (no Static Outbound IP needed)
- **Upstash Redis**: Free tier (10,000 requests/day)
- **Cloudflare Worker**: Free tier (100,000 requests/day) - optional backup

**Total cost: $0/month** 🎉

## Optional: Cloudflare Worker Proxy

If you want a backup proxy for REST calls:

```bash
# Install Wrangler CLI
npm install -g wrangler

# Deploy worker
cd cloudflare-worker
wrangler deploy

# Use proxy URL in your backend (optional)
# https://your-worker.your-subdomain.workers.dev/binance/fapi/v1/ticker/24hr
```

## Monitoring

### GitHub Actions Status
- Go to GitHub repo → Actions tab
- Look for green checkmarks on "Ingest Binance Data to Redis"

### Backend Health
```bash
curl https://volspike-backend-production.up.railway.app/api/market/health
```

### Redis Data Age
```bash
railway run -s VolSpike-backend -- node -e "
const redis = require('ioredis').Redis(process.env.REDIS_URL);
redis.get('market:lastUpdate').then(timestamp => {
  if (timestamp) {
    const age = Date.now() - parseInt(timestamp);
    console.log('Data age:', Math.round(age / 1000), 'seconds');
  } else {
    console.log('No data timestamp found');
  }
});
"
```

## Next Steps

1. **Test the setup** - Verify all tiers work correctly
2. **Monitor for 24 hours** - Ensure GitHub Actions runs reliably  
3. **Scale up later** - When you have paying users, consider:
   - Railway Static Outbound IP ($5/month)
   - Dedicated VPS for ingestion ($5-10/month)
   - Managed Redis cluster

This free setup will handle hundreds of users and gives you time to validate the product before investing in infrastructure! 🚀

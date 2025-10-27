# 🚀 Cloudflare Worker Proxy Setup Guide

## Overview
This guide shows how to deploy a Cloudflare Worker proxy to solve the Binance API 451 error from GitHub Actions runners.

## Why This Works
- **GitHub Actions runners** are blocked by Binance (451 error)
- **Cloudflare Workers** use different IP ranges that aren't blocked
- **Proxy pattern** routes requests through Cloudflare's edge network
- **Caching** reduces load on Binance API

## Step 1: Deploy Cloudflare Worker

### Install Wrangler CLI
```bash
npm install -g wrangler
```

### Login to Cloudflare
```bash
wrangler login
```

### Deploy the Worker
```bash
cd cloudflare-worker
wrangler deploy
```

**Note the Worker URL** (e.g., `https://volspike-binance-proxy.your-subdomain.workers.dev`)

## Step 2: Add GitHub Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions

Add these secrets:

### Required Secrets (you already have these):
```
UPSTASH_REDIS_REST_URL=https://your-redis-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### New Secrets (add these):
```
BINANCE_BASE_URL=https://volspike-binance-proxy.your-subdomain.workers.dev
WORKER_FALLBACK_BASE=https://volspike-binance-proxy.your-subdomain.workers.dev
```

## Step 3: Test the Setup

### Test Worker Directly
```bash
# Test health endpoint
curl https://volspike-binance-proxy.your-subdomain.workers.dev/health

# Test Binance proxy
curl https://volspike-binance-proxy.your-subdomain.workers.dev/fapi/v1/ticker/24hr
```

### Test GitHub Actions
1. Go to GitHub repo → Actions
2. Click "Ingest Binance Data to Redis" → "Run workflow"
3. Check logs for:
   ```
   📡 Using base URL: https://volspike-binance-proxy.your-subdomain.workers.dev
   ✅ Successfully ingested 150 market data points
   ```

## How It Works

### Request Flow:
1. **GitHub Actions** runs `scripts/ingest-binance.js`
2. **Script** calls `BINANCE_BASE_URL/fapi/v1/ticker/24hr`
3. **Cloudflare Worker** receives request at `/fapi/v1/ticker/24hr`
4. **Worker** forwards to `https://fapi.binance.com/fapi/v1/ticker/24hr`
5. **Binance** responds (from Cloudflare IP, not GitHub IP)
6. **Worker** caches response for 30 seconds
7. **Script** receives data and stores in Redis

### Fallback Logic:
- If direct Binance fails with 451 → try Worker proxy
- If rate limited (429) → wait 2 seconds and retry
- If Worker fails → log error and exit gracefully

## Monitoring

### Check Worker Logs
```bash
wrangler tail
```

### Check GitHub Actions Logs
- Go to Actions tab → latest run → "Run Binance ingestion" step

### Check Redis Data
```bash
# Test if data is being stored
railway run -s VolSpike-backend -- node -e "
const redis = require('ioredis').Redis(process.env.REDIS_URL);
redis.get('market:data').then(data => {
  if (data) {
    const parsed = JSON.parse(data);
    console.log('✅ Market data found:', parsed.length, 'symbols');
  } else {
    console.log('❌ No market data found');
  }
});
"
```

## Troubleshooting

### Worker Returns 500
- Check Wrangler logs: `wrangler tail`
- Verify Worker URL is correct in GitHub secrets
- Test Worker directly with curl

### GitHub Actions Still Fails
- Check that `BINANCE_BASE_URL` secret is set correctly
- Verify Worker URL format: `https://worker-name.subdomain.workers.dev`
- Check GitHub Actions logs for specific error messages

### No Data in Redis
- Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are correct
- Check if GitHub Actions workflow is running successfully
- Test Redis connection from backend

## Cost Breakdown

- **Cloudflare Workers**: Free tier (100,000 requests/day)
- **GitHub Actions**: Free tier (2,000 minutes/month)
- **Upstash Redis**: Free tier (10,000 requests/day)
- **Total**: $0/month 🎉

## Next Steps

1. **Deploy Worker** and note the URL
2. **Add GitHub secrets** with Worker URL
3. **Test the workflow** manually
4. **Monitor for 24 hours** to ensure reliability
5. **Scale up later** if needed (Worker Pro tier, dedicated VPS, etc.)

This solution provides a robust, free way to get Binance data into your VolSpike dashboard without IP blocking issues!

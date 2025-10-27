# Instructions for updating Cloudflare Worker with new Redis credentials

## Step 1: Get New Redis Credentials
1. Go to https://upstash.com
2. Create new account with different email
3. Create new Redis database
4. Copy the REST URL and Token

## Step 2: Update Cloudflare Worker Secrets
```bash
cd cloudflare-worker
wrangler secret put UPSTASH_REDIS_REST_URL
# Paste your new Redis URL when prompted

wrangler secret put UPSTASH_REDIS_REST_TOKEN  
# Paste your new Redis token when prompted
```

## Step 3: Deploy Updated Worker
```bash
wrangler deploy
```

## Step 4: Test New Setup
```bash
# Test Redis connection
curl "https://volspike-binance-proxy.nsitnikov1.workers.dev/test-redis"

# Trigger data ingestion
curl -X POST "https://volspike-binance-proxy.nsitnikov1.workers.dev/trigger"

# Check data endpoint
curl "https://volspike-binance-proxy.nsitnikov1.workers.dev/data"
```

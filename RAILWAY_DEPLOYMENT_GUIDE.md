# VolSpike Railway Deployment Guide

## Quick Fix for Binance Connectivity Issues

### Problem Summary
- Backend returns 500 errors when Redis cache is empty (tries to call Binance directly)
- Ingestion service crashes on "Error processing ticker data"
- Railway shared IP is blocked by Binance

### Solution Overview
1. ✅ **Fixed backend 500s** - Now cache-only, returns 200 with stale indicator
2. ✅ **Fixed ingestion crashes** - Better error handling and validation
3. ✅ **Added health monitoring** - `/api/market/health` endpoint
4. ✅ **Implemented tier throttling** - Server-side WebSocket rate limiting
5. 🔄 **Enable Static Outbound IP** - Required for Binance connectivity

## Step-by-Step Railway Deployment

### 1. Enable Static Outbound IP (CRITICAL)

**For VolSpike-backend service:**
```bash
# Go to Railway dashboard → VolSpike-backend → Settings → Add-ons
# Enable "Static Outbound IP"
```

**For VolSpike-ingestion service:**
```bash
# Go to Railway dashboard → VolSpike-ingestion → Settings → Add-ons  
# Enable "Static Outbound IP"
```

**Note the IP addresses** - you'll need them for Binance whitelisting.

### 2. Redeploy Services

```bash
# Redeploy backend
railway redeploy -s VolSpike-backend

# Redeploy ingestion service
railway redeploy -s VolSpike-ingestion
```

### 3. Test Binance Connectivity

```bash
# Test HTTP connectivity
railway run -s VolSpike-ingestion -- node -e "
require('axios').get('https://fapi.binance.com/fapi/v1/ticker/24hr')
  .then(() => console.log('✅ Binance HTTP: OK'))
  .catch(e => console.error('❌ Binance HTTP:', e.code || e.message))
"

# Test WebSocket connectivity  
railway run -s VolSpike-ingestion -- node - <<'EOF'
const WebSocket = require('ws');
const ws = new WebSocket('wss://fstream.binance.com/stream?streams=!ticker@arr');
ws.on('open', () => {
  console.log('✅ Binance WebSocket: Connected');
  ws.close();
});
ws.on('error', (e) => console.error('❌ Binance WebSocket:', e.code || e.message));
EOF
```

### 4. Monitor Deployment Logs

```bash
# Watch backend logs
railway logs -s VolSpike-backend -f

# Watch ingestion logs  
railway logs -s VolSpike-ingestion -f
```

**Look for:**
- ✅ `Redis client connected`
- ✅ `Connected to Binance WebSocket`
- ✅ `Market data processor worker started`
- ❌ No more `Error processing ticker data`

### 5. Test Health Endpoint

```bash
# Test health endpoint
curl https://volspike-backend-production.up.railway.app/api/market/health

# Expected response:
{
  "status": "ok",
  "redis": { "status": "connected" },
  "ingestion": { 
    "hasData": true,
    "lastHeartbeat": 1703123456789,
    "lastError": null
  },
  "market": { "symbolsCount": 150 }
}
```

### 6. Test Market Data API

```bash
# Test market data endpoint
curl https://volspike-backend-production.up.railway.app/api/market/data

# Should return 200 (not 500) with either:
# - Fresh data: { "data": [...], "stale": false }
# - Stale data: { "data": [], "stale": true, "message": "..." }
```

## Environment Variables

### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/volspike

# Redis (Upstash)
REDIS_URL=rediss://default:your-token@your-endpoint.upstash.io:6380

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Frontend URL
FRONTEND_URL=https://volspike.com

# Environment
NODE_ENV=production
LOG_LEVEL=info
PORT=3001
```

### Ingestion Service (.env)
```bash
# Redis (Upstash) - Same as backend
REDIS_URL=rediss://default:your-token@your-endpoint.upstash.io:6380

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/volspike

# Environment
NODE_ENV=production
LOG_LEVEL=info
```

### Frontend (.env.local)
```bash
# NextAuth.js
NEXTAUTH_URL=https://volspike.com
NEXTAUTH_SECRET=your-nextauth-secret

# API Configuration
NEXT_PUBLIC_API_URL=https://volspike-backend-production.up.railway.app
NEXT_PUBLIC_WS_URL=https://volspike-backend-production.up.railway.app

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id
```

## Security: Regenerate Redis Token

**CRITICAL:** Your Redis token was exposed in screenshots. Regenerate it:

1. Go to Upstash Console → Your Redis Database → Settings
2. Click "Regenerate Token"
3. Update `REDIS_URL` in both backend and ingestion services
4. Redeploy both services

## Troubleshooting

### Backend Still Returns 500s
- Check Redis connection: `railway logs -s VolSpike-backend`
- Verify Redis URL is correct
- Test health endpoint: `/api/market/health`

### Ingestion Still Crashes
- Check Binance connectivity: `railway run -s VolSpike-ingestion -- curl -I https://fapi.binance.com/fapi/v1/ticker/24hr`
- Verify Static Outbound IP is enabled
- Check logs for specific error messages

### No Market Data
- Verify ingestion service is running: `railway logs -s VolSpike-ingestion`
- Check Redis has data: `railway run -s VolSpike-backend -- node -e "require('ioredis').Redis(process.env.REDIS_URL).get('market:data').then(console.log)"`
- Test health endpoint for ingestion status

### WebSocket Not Working
- Check frontend WebSocket URL: `NEXT_PUBLIC_WS_URL`
- Verify backend Socket.IO is running
- Check browser console for connection errors

## Production Checklist

- [ ] Static Outbound IP enabled for both services
- [ ] Redis token regenerated and updated
- [ ] All services redeployed
- [ ] Binance connectivity tested
- [ ] Health endpoint returns OK
- [ ] Market data API returns 200 (not 500)
- [ ] WebSocket connections working
- [ ] Tier throttling working (Elite: 30s, Pro: 5min, Free: 15min)

## Architecture Benefits

✅ **No more 500 errors** - Cache-only backend  
✅ **Graceful degradation** - Shows stale data instead of errors  
✅ **Proper tier enforcement** - Server-side throttling  
✅ **Health monitoring** - Real-time system status  
✅ **Better error handling** - Ingestion won't crash on bad data  
✅ **Production-ready** - Follows crypto dashboard best practices  

## How Other Crypto Sites Do It

**Successful crypto dashboards use:**
- **One-way data flow**: Exchange → Ingestion → Cache → API → Frontend
- **Never fetch from exchanges at request-time**
- **Dedicated egress IP** for exchange connectivity
- **Graceful degradation** with stale data indicators
- **Server-side tier enforcement** to prevent cheating

This implementation follows these proven patterns.

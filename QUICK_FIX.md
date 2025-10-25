# Quick Fix - Copy & Paste Solutions

## 🚀 Fastest Fix (5 minutes)

### Option A: Quick Patch for ioredis (Existing Setup)

If you want to keep using ioredis with minimal changes:

**File: `src/services/redis-client.ts`**

Find this line:
```typescript
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
```

Replace the entire initialization block with:
```typescript
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    enableOfflineQueue: true,
    autoResubscribe: true,
    autoResendUnfulfilledCommands: true,
})
```

**That's it.** Deploy and check logs.

---

### Option B: Minimal Fix for index.ts Socket.IO Adapter

**File: `src/index.ts`**

Replace this section:
```typescript
if (process.env.REDIS_URL) {
    try {
        const pubClient = createClient({ url: process.env.REDIS_URL })
        const subClient = pubClient.duplicate()
```

With:
```typescript
if (process.env.REDIS_URL) {
    try {
        const pubClient = createClient({
            url: process.env.REDIS_URL,
            socket: {
                tls: process.env.REDIS_URL.startsWith('rediss://'),
                rejectUnauthorized: process.env.NODE_ENV === 'production',
            },
        })
        const subClient = pubClient.duplicate()
```

---

## 🧪 Testing the Fix

### Test 1: Check Redis Connection
```bash
# Add this to your app temporarily:
app.get('/redis-test', async (c) => {
    try {
        const ping = await redis.ping()
        return c.json({ success: true, redis: ping })
    } catch (e) {
        return c.json({ success: false, error: String(e) }, 500)
    }
})

# Then curl:
curl https://your-app/redis-test
# Expected: {"success":true,"redis":"PONG"}
```

### Test 2: Check Socket.IO Adapter
```bash
# Add this to your app temporarily:
app.get('/socketio-test', (c) => {
    const adapter = io.of('/').adapter
    return c.json({
        redisAdapter: adapter.constructor.name,
        ready: adapter.constructor.name.includes('Redis'),
    })
})

# Then curl:
curl https://your-app/socketio-test
# Expected: {"redisAdapter":"RedisAdapter","ready":true}
```

### Test 3: Check Railway Logs
```bash
# Terminal
railway logs --tail 100

# Look for:
# ✅ Redis client connected
# ✅ Socket.IO Redis adapter initialized
# 🚀 VolSpike Backend running on port 3001
```

---

## 🔄 Alternative: Switch to Native Redis Client

If you want to replace ioredis completely:

### 1. Update package.json
```json
{
  "dependencies": {
    "redis": "^4.6.0"  // Add this
  }
}
```

Run: `npm install`

### 2. Replace redis-client.ts
```typescript
import { createClient } from 'redis'
import { createLogger } from '../lib/logger'

const logger = createLogger()

const redis = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
})

redis.on('error', (err) => logger.error('Redis error:', err))
redis.on('connect', () => logger.info('Redis connected'))

// Auto-connect
redis.connect().catch(err => {
    logger.error('Redis connection failed:', err)
})

export { redis }
```

### 3. Update Dependent Code
```typescript
// Old (ioredis):
await redis.get(key)

// New (redis client):
const result = await redis.get(key)  // Mostly compatible!
```

---

## 📋 Pre-Deployment Checklist

- [ ] REDIS_URL environment variable is set in Railway
- [ ] REDIS_URL starts with `rediss://` (two s's)
- [ ] NODE_ENV is set to `production` in Railway
- [ ] No whitespace in REDIS_URL value
- [ ] You've applied the TLS fix to redis-client.ts
- [ ] You've applied the TLS fix to index.ts Socket.IO setup
- [ ] `npm install` has been run locally
- [ ] `npm run build` completes without errors
- [ ] No compilation errors: `npm run type-check`

---

## 🚢 Deployment Instructions

```bash
# 1. Make code changes locally
# (Apply fixes from above)

# 2. Test locally (optional but recommended)
npm run dev
# Check for Redis connection in logs

# 3. Commit and push
git add .
git commit -m "fix: add TLS support for Upstash Redis"
git push origin main

# 4. Railway auto-deploys
# Watch the logs:
railway logs --follow

# 5. Verify success (wait ~30 seconds for deploy)
curl https://your-app/health
# Should return: {"status":"ok",...}

# 6. Check for Redis errors
railway logs | grep -i redis
# Should show: "Redis client connected" (no errors)
```

---

## ❌ If It Still Doesn't Work

### Gather Diagnostic Info
```bash
# 1. Get full error from logs
railway logs --tail 50 > error.log

# 2. Check your Redis URL format
echo $REDIS_URL
# Should look like: rediss://default:TOKEN@host:6379

# 3. Test Node version
node --version
# Should be >= 18.0.0

# 4. Verify TLS is actually enabled
# Add this temporary debug code:
redis.on('connect', () => {
    const sock = redis.socket || redis._socket
    console.log('Redis TLS:', sock?.encrypted)
})
```

### Quick Fixes
```typescript
// If still getting TLS errors, try:

// Fix #1: Disable cert verification (dev only!)
socket: {
    tls: true,
    rejectUnauthorized: false,  // Risky - dev only!
}

// Fix #2: Use NODE_EXTRA_CA_CERTS
// Set in Railway: NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

// Fix #3: Increase timeout for slow connections
connectTimeout: 20000,  // 20 seconds
commandTimeout: 15000,  // 15 seconds
```

---

## 📞 Getting Help

If you're still stuck, provide:

1. **Full error message** from Railway logs
2. **Your REDIS_URL** (mask the token): `rediss://default:***@host:6379`
3. **Node version**: `node --version`
4. **ioredis version**: `npm list ioredis`
5. **Your current redis-client.ts code**
6. **Error timestamp** so I can correlate with logs

---

## Success Indicators

### After deploying the fix, you should see:

✅ **In Railway logs:**
```
Redis client connected
Socket.IO Redis adapter initialized
🚀 VolSpike Backend running on port 3001
```

✅ **No error messages like:**
- `ECONNRESET`
- `Socket closed unexpectedly`
- `SSL routines`
- `TLS handshake failed`

✅ **Health check works:**
```bash
curl https://your-app/health
# Returns 200 OK with JSON
```

✅ **Redis operations work:**
- Watchlists save/load from cache
- Market data is cached
- Alerts are published correctly
- Socket.IO broadcasts work for multiple server instances

---

## Rollback Plan

If something breaks:

```bash
# Revert to last working commit
git revert HEAD
git push

# Or rollback specific files
git checkout HEAD~1 -- src/services/redis-client.ts
git push

# Railway auto-redeploys
```

---

## Monitoring

After successful deployment, monitor for 24 hours:

```bash
# Watch for new Redis errors
railway logs --follow | grep -i "redis\|error\|econnreset"

# Should be empty (no errors)

# Check every hour for connection drops
railway logs | grep -c "redis.*error"
# Should return 0
```

---

**Good luck! 🚀** You've got this!

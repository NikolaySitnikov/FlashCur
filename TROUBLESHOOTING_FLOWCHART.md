# Redis Troubleshooting Flowchart

## Decision Tree

```
Does your app work locally?
│
├─ YES → Redis works locally
│   │   (uses redis://localhost:6379)
│   │
│   └─ Does it fail on Railway?
│       │
│       ├─ YES → This is a NETWORK/CONFIGURATION issue
│       │   │
│       │   ├─ Is REDIS_URL set in Railway?
│       │   │   ├─ NO → Add REDIS_URL env var
│       │   │   └─ YES → Continue
│       │   │
│       │   ├─ Does REDIS_URL start with rediss://?
│       │   │   ├─ NO → Change to rediss:// (add extra 's')
│       │   │   └─ YES → Continue
│       │   │
│       │   ├─ Is TLS configured in Redis client?
│       │   │   ├─ NO → 🎯 THIS IS YOUR ISSUE - Add tls: {}
│       │   │   └─ YES → Continue
│       │   │
│       │   └─ Error is NOT ECONNRESET?
│       │       ├─ ECONNRESET → TLS mismatch (see above)
│       │       ├─ ECONNREFUSED → Wrong host/port
│       │       ├─ ETIMEDOUT → Network blocked
│       │       └─ AUTH failed → Wrong token
│       │
│       └─ NO → Redis works everywhere (working condition!)
│
└─ NO → Redis doesn't work locally either
    │
    ├─ Is Redis running locally?
    │   ├─ NO → Start Redis: redis-server
    │   └─ YES → Continue
    │
    ├─ Is REDIS_URL correct locally?
    │   └─ For local dev: redis://localhost:6379 (no TLS)
    │
    └─ Try: npm run dev (and check for errors)
```

---

## Error Message → Solution

```
┌─────────────────────────────────────────────────────────────────┐
│ ERROR: read ECONNRESET                                          │
├─────────────────────────────────────────────────────────────────┤
│ Cause: Client not using TLS, server requires TLS               │
│ Solution:                                                        │
│   Add to Redis client config:                                   │
│   tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ERROR: read ECONNREFUSED (or connect ECONNREFUSED)             │
├─────────────────────────────────────────────────────────────────┤
│ Cause: Wrong host/port or service not running                  │
│ Solution:                                                        │
│   1. Check REDIS_URL format: rediss://default:TOKEN@HOST:6379  │
│   2. Verify Upstash Redis instance is running                  │
│   3. Check Railway can reach Upstash (try different region)    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ERROR: read ETIMEDOUT or EHOSTUNREACH                          │
├─────────────────────────────────────────────────────────────────┤
│ Cause: Network firewall/policy blocking connection             │
│ Solution:                                                        │
│   1. Verify Railway can access external services                │
│   2. Check Upstash firewall settings (IP whitelist?)           │
│   3. Try using Upstash REST API instead                        │
│   4. Contact Railway support about network policies            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ERROR: NOAUTH Authentication required                           │
├─────────────────────────────────────────────────────────────────┤
│ Cause: Redis token/password incorrect or missing               │
│ Solution:                                                        │
│   1. Copy REDIS_URL from Upstash console (full URL)           │
│   2. Ensure token is in format: default:TOKEN                  │
│   3. Verify no special characters in URL (copy carefully)      │
│   4. Check for whitespace in environment variable              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ERROR: SSL routines:ssl3_get_record:wrong version number       │
├─────────────────────────────────────────────────────────────────┤
│ Cause: TLS mismatch or connecting to wrong port                │
│ Solution:                                                        │
│   1. Ensure REDIS_URL uses port 6379 (not 6380)               │
│   2. Ensure TLS is enabled: tls: {}                            │
│   3. For Upstash: must use rediss:// and TLS enabled          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ERROR: certificate verify failed                                │
├─────────────────────────────────────────────────────────────────┤
│ Cause: SSL certificate not trusted (rare with Upstash)        │
│ Solution:                                                        │
│   1. Disable cert validation for dev:                          │
│      rejectUnauthorized: process.env.NODE_ENV === 'dev' ? false : true │
│   2. Or update Node.js: npm install -g n && n latest           │
│   3. Or set: NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-bundle.crt │
└─────────────────────────────────────────────────────────────────┘
```

---

## Diagnostic Flow

```
START: Redis not connecting

│
├─→ CHECK: Can you ping Redis?
│   │
│   └─→ redis-cli ping
│       ├─ YES (PONG) → Redis is up ✅
│       └─ NO → Redis is down ❌
│           └─ ACTION: Start Redis or contact Upstash
│
├─→ CHECK: Is REDIS_URL correct?
│   │
│   └─→ Echo the URL (mask token):
│       └─ rediss://default:***@host:6379
│           ├─ Correct format → Continue
│           └─ Missing s in rediss → FIX REDIS_URL
│
├─→ CHECK: Does client have TLS enabled?
│   │
│   └─→ Search your code for: "tls: "
│       ├─ Found and set to {} or true → ✅ Continue
│       └─ Not found → 🎯 ADD TLS CONFIG
│
├─→ CHECK: Is it reaching the server?
│   │
│   └─→ Add debug logging:
│       └─ redis.on('connect', () => log('Connected!'))
│           ├─ Logs "Connected!" → TLS worked! ✅
│           └─ No log → TLS/network issue
│
├─→ CHECK: Network between Railway and Upstash?
│   │
│   └─→ From Railway dashboard:
│       ├─ Change region to US East
│       ├─ Restart deployment
│       └─ Check if that helps
│
└─→ ESCALATE: Contact support
    │
    └─→ Provide:
        - Full error message
        - Redis URL (token masked)
        - Node version
        - Last 50 lines of logs
```

---

## Quick Diagnostic Commands

### 1. Check if Redis is reachable from Railway
```bash
# Add this temporary route
app.get('/test-redis', async (c) => {
    try {
        const ping = await redis.ping()
        const info = await redis.info()
        return c.json({ 
            status: 'connected',
            ping: ping,
            version: info.split('redis_version:')[1]?.split('\r')[0]
        })
    } catch (e) {
        return c.json({ 
            status: 'error', 
            error: e.message,
            code: e.code
        }, 500)
    }
})

# Call it:
curl https://app/test-redis

# Response will tell you:
# - Can connect: {"status":"connected","ping":"PONG"}
# - Cannot connect: {"status":"error","error":"ECONNRESET","code":"ECONNRESET"}
```

### 2. Check if Socket.IO Redis adapter loaded
```bash
app.get('/test-socketio', (c) => {
    const adapter = io.of('/').adapter
    const isRedis = adapter.constructor.name === 'RedisAdapter'
    return c.json({
        adapter: adapter.constructor.name,
        isRedis: isRedis,
        // More details
    })
})
```

### 3. Check TLS is actually enabled
```bash
# Add debug to your Redis client:
console.log('Redis URL protocol:', process.env.REDIS_URL?.split('://')[0])
console.log('TLS should be:', process.env.REDIS_URL?.startsWith('rediss://'))
console.log('TLS config:', redis.options.tls)
```

---

## Step-by-Step Verification

After applying the fix:

```
STEP 1: Deploy code change
   └─→ npm run build ✅
   └─→ git push origin main ✅
   └─→ Wait for Railway to deploy (~2 min)

STEP 2: Check logs appear within 30 seconds
   └─→ railway logs --follow
   └─→ Look for: "Redis client connected" ✅
   └─→ Look for: "Socket.IO Redis adapter initialized" ✅

STEP 3: Test health endpoint
   └─→ curl https://app/health
   └─→ Should get 200 OK ✅

STEP 4: Test Redis operations
   └─→ Create a new watchlist (uses cache write)
   └─→ Fetch watchlist (uses cache read)
   └─→ No errors in logs ✅

STEP 5: Monitor for 24 hours
   └─→ Check logs every few hours
   └─→ Look for any "ECONNRESET" messages ❌
   └─→ Look for stable "Redis client connected" message ✅

RESULT: Fix successful ✅
```

---

## Red Flags (Things That Mean It's Not Fixed)

❌ Still seeing ECONNRESET in logs after applying fix
❌ Logs show "Redis client error" repeatedly
❌ Health check endpoint returns 500 errors
❌ Socket.IO not using Redis adapter (showing as DefaultAdapter)
❌ Error messages include "TLS" or "SSL"
❌ Error messages include "connection refused"
❌ Can connect locally but not on Railway
❌ Redis status is "close" or "reconnecting" instead of "ready"

If you see ANY of these: The TLS config didn't apply correctly.

---

## Green Flags (Signs It Worked)

✅ Logs show "Redis client connected" within 10 seconds
✅ Logs show "Socket.IO Redis adapter initialized" 
✅ Health endpoint returns 200 OK
✅ No error messages for 5+ minutes
✅ Redis status is "ready" when queried
✅ Can retrieve cached data
✅ Socket.IO shows RedisAdapter (not DefaultAdapter)
✅ Multiple simultaneous clients work correctly

---

## If You Get Stuck

Don't keep redeploying hoping it works. Instead:

1. **Read the error message carefully** - it tells you exactly what's wrong
2. **Search this document** for your error message
3. **Check the diagnostic checklist** - follow it step by step
4. **Use the debug routes** to get actual data
5. **Compare your code** with the provided fixed versions

Most issues are:
- Missing `tls: {}`  (80% of cases) → Quick fix
- Wrong REDIS_URL (15% of cases) → Copy correct URL  
- Network/firewall (5% of cases) → Contact support

If you've checked all three, it's probably the network.

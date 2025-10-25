# Critical Diagnosis: Why Redis Still Won't Connect

## Issues Found in Your Current Code

### ❌ ISSUE #1: redis-client.ts - TLS Configuration Wrong

**Your current code:**
```typescript
tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,
```

**Problem:**
- ✅ TLS IS enabled (good!)
- ✅ Empty object `{}` is correct syntax (good!)
- ❌ **BUT:** Missing critical options that Upstash requires:
  - No reconnection strategy
  - No timeout handling
  - No connection logging
  - Missing `enableOfflineQueue`
  - Missing `autoResubscribe`

**Why it fails:**
Connection times out → no retry logic → "Redis not connected" message repeats

---

### ❌ ISSUE #2: index.ts - Socket.IO Redis Adapter Config Wrong

**Your current code:**
```typescript
const pubClient = createClient({ 
    url: process.env.REDIS_URL,
    socket: process.env.REDIS_URL?.startsWith('rediss://') ? {
        tls: true
    } : undefined
})
```

**Problems:**
1. ❌ **TLS syntax wrong!** Should be:
   ```typescript
   socket: {
       tls: true,
       rejectUnauthorized: process.env.NODE_ENV === 'production',
   }
   ```
   
   The condition logic is broken. If `rediss://` is NOT detected, you're passing `undefined` for socket, which breaks TLS!

2. ❌ **Not catching connection errors properly** - Promise chain doesn't propagate errors

3. ❌ **No connection verification** before setting up adapter

---

### ❌ ISSUE #3: Missing Manual Connect Call

**Your redis-client.ts:**
```typescript
const redis = new Redis(..., {
    lazyConnect: true,  // ← This means it won't auto-connect!
    // ...
})

// ← You never call redis.connect()!
```

**Problem:**
- `lazyConnect: true` means the Redis client is created but NOT connected
- You never actually call `.connect()` to establish the connection
- So it's stuck in "closed" state waiting for a manual connect call

---

## The Real Fix Required

### Fix #1: redis-client.ts - Add Connection Logic

```typescript
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        return delay
    },
    enableOfflineQueue: true,
    autoResubscribe: true,
    autoResendUnfulfilledCommands: true,
})

// ✅ YOU MUST CALL connect() for lazyConnect: true
redis.connect().catch((err) => {
    logger.warn('Redis connection failed:', err)
    // Don't crash - app works without Redis
})
```

---

### Fix #2: index.ts - Correct TLS Configuration

```typescript
if (process.env.REDIS_URL) {
    try {
        // ✅ CORRECT SYNTAX
        const pubClient = createClient({
            url: process.env.REDIS_URL,
            // Only add socket config if rediss://
            ...(process.env.REDIS_URL.startsWith('rediss://') && {
                socket: {
                    tls: true,
                    rejectUnauthorized: process.env.NODE_ENV === 'production',
                }
            })
        })
        
        const subClient = pubClient.duplicate()

        pubClient.on('error', (err) => {
            logger.error('Redis pub client error:', err)
        })

        subClient.on('error', (err) => {
            logger.error('Redis sub client error:', err)
        })

        // ✅ PROPER ERROR HANDLING
        Promise.all([
            pubClient.connect(),
            subClient.connect()
        ]).then(() => {
            io.adapter(createAdapter(pubClient, subClient))
            logger.info('Socket.IO Redis adapter initialized')
        }).catch(err => {
            logger.error('Redis adapter setup failed:', err)
            logger.warn('Continuing without Redis adapter')
        })
    } catch (error) {
        logger.error('Redis setup error:', error)
    }
}
```

---

## Why It's Repeating Every 5 Seconds

The "Redis not connected, skipping cache read" message every 5 seconds suggests:

1. **lazyConnect: true** but no manual `.connect()` call
2. Redis client is created but never connects
3. Your app checks `redis.status` and finds it's NOT "ready"
4. Function returns null and logs warning
5. Something calls this function every 5 seconds
6. Loop repeats

---

## Verification Checklist

After applying the fixes:

✅ Check redis-client.ts has `.connect()` call
✅ Check index.ts uses correct socket config syntax
✅ Check both files have proper error handling
✅ Check logs for "Redis client connected" (not "Redis not connected")
✅ Check Socket.IO logs for "adapter initialized"
✅ Wait 30 seconds - messages should NOT repeat
✅ Verify redis.status is "ready" (not "close")

---

## The Root Issue in One Sentence

**You're creating a Redis connection with `lazyConnect: true` but never calling `.connect()` to actually establish the connection.**

This is why:
- Connection never happens
- Status stays "close"
- Every read/write fails
- App logs "Redis not connected" repeatedly

---

## One More Thing to Check

In index.ts, after `setupSocketHandlers()`, add a debug route:

```typescript
app.get('/debug/redis', (c) => {
    // Import redis from services
    const { redis } = require('./services/redis-client')
    return c.json({
        redisConnected: redis.status === 'ready',
        status: redis.status,
        url: process.env.REDIS_URL ? 'configured' : 'not configured',
    })
})
```

Then test: `curl https://app/debug/redis`

Should return: `{"redisConnected":true,"status":"ready",...}`

If it shows `"status":"close"` → redis.connect() was never called

# Redis Connection Fix - Before & After

## Problem Summary
Your Redis client fails with `ECONNRESET` because it's trying to connect to an **SSL-enabled** Upstash Redis (`rediss://` protocol) without explicitly enabling **TLS in the client configuration**.

---

## Issue 1: redis-client.ts - Missing TLS Config

### ❌ BEFORE (Broken)
```typescript
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
    // ❌ NO TLS CONFIGURATION - This is the problem!
    // ❌ ioredis doesn't auto-enable TLS for rediss:// URLs
})
```

**Why it fails:**
- Upstash enforces TLS/SSL on port 6379
- Server expects encrypted connection
- Client sends unencrypted data → Server closes connection (ECONNRESET)

### ✅ AFTER (Fixed)
```typescript
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    // ✅ ENABLE TLS for rediss:// URLs
    tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,
    
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
    
    // ✅ Production-grade reconnection strategy
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        logger.warn(`Redis retry attempt ${times}, delay: ${delay}ms`)
        return delay
    },
    
    // ✅ Keep requests queued while reconnecting
    enableOfflineQueue: true,
    autoResubscribe: true,
    autoResendUnfulfilledCommands: true,
})
```

**Why it works:**
- `tls: {}` explicitly enables TLS
- Uses Node.js default SSL/TLS settings (works with Upstash)
- No custom certificates needed (Upstash uses standard CA-signed certs)
- Auto-detects TLS need based on URL scheme

---

## Issue 2: index.ts - Redis Adapter Setup Missing TLS

### ❌ BEFORE (Broken)
```typescript
if (process.env.REDIS_URL) {
    try {
        const pubClient = createClient({ url: process.env.REDIS_URL })
        const subClient = pubClient.duplicate()

        // ❌ NO TLS CONFIGURATION HERE EITHER
        // ❌ Socket.IO adapter tries to connect without TLS

        pubClient.on('error', (err) => {
            logger.error('Redis pub client error:', err)
        })

        Promise.all([
            pubClient.connect().catch(err => logger.error('Redis pub connect error:', err)),
            subClient.connect().catch(err => logger.error('Redis sub connect error:', err))
        ]).then(() => {
            io.adapter(createAdapter(pubClient, subClient))
            logger.info('Socket.IO Redis adapter initialized')
        }).catch(err => {
            logger.error('Redis adapter setup failed:', err)
            logger.info('Continuing without Redis adapter')
        })
    } catch (error) {
        logger.error('Redis setup error:', error)
        logger.info('Continuing without Redis adapter')
    }
}
```

### ✅ AFTER (Fixed)
```typescript
if (process.env.REDIS_URL) {
    try {
        // ✅ CREATE CLIENTS WITH PROPER TLS CONFIGURATION
        const pubClient = createClient({
            url: process.env.REDIS_URL,
            socket: {
                // ✅ Enable TLS for rediss:// URLs
                tls: process.env.REDIS_URL.startsWith('rediss://'),
                // ✅ Strict cert validation in production
                rejectUnauthorized: process.env.NODE_ENV === 'production',
            },
        })
        
        const subClient = pubClient.duplicate()

        // ✅ BETTER ERROR HANDLING
        pubClient.on('error', (err) => {
            logger.error('Redis pub client error:', err)
        })

        subClient.on('error', (err) => {
            logger.error('Redis sub client error:', err)
        })

        // ✅ LOG CONNECTION SUCCESS
        pubClient.on('connect', () => {
            logger.info('Redis pub client connected')
        })

        subClient.on('connect', () => {
            logger.info('Redis sub client connected')
        })

        // ✅ PROPER ERROR PROPAGATION
        Promise.all([
            pubClient.connect().catch(err => {
                logger.error('Redis pub client connection error:', err)
                throw err  // Re-throw to catch in outer catch block
            }),
            subClient.connect().catch(err => {
                logger.error('Redis sub client connection error:', err)
                throw err  // Re-throw to catch in outer catch block
            })
        ]).then(() => {
            io.adapter(createAdapter(pubClient, subClient))
            logger.info('✅ Socket.IO Redis adapter initialized successfully')
            logger.info(`📊 Redis URL: ${process.env.REDIS_URL?.split('@')[1]}`)
        }).catch(err => {
            logger.error('❌ Redis adapter setup failed:', err)
            logger.warn('⚠️  Continuing without Redis adapter')
        })
    } catch (error) {
        logger.error('Redis initialization error:', error)
        logger.warn('Continuing without Redis adapter')
    }
}
```

**Key improvements:**
- `socket.tls: true` enables TLS explicitly
- `rejectUnauthorized: true` in production (security best practice)
- Better connection logging for debugging
- Clearer error messages distinguishing different failure modes

---

## Deployment Changes

### Environment Variables (Should Already Be Set)
```bash
# ✅ CORRECT FORMAT
REDIS_URL=rediss://default:AXLBAAIncDIzZTY0OGZmMTU5OTg0NzE1OWU1NjUzMWNhYjUyZTQ1M3AyMjkzNzc@hopeful-gorilla-29377.upstash.io:6379

# ❌ WRONG - These won't work
REDIS_URL=redis://default:...@hopeful-gorilla-29377.upstash.io:6379  # Missing extra 's'
REDIS_URL=rediss://default:...@hopeful-gorilla-29377.upstash.io:6380  # Wrong port
```

### Node Version Check
```bash
# Your setup uses Node 18+ - which supports TLS/SSL out of the box ✅
# No version upgrades needed
```

---

## Migration Steps

### Step 1: Update redis-client.ts
Replace your current file with the fixed version:
```bash
cp redis-client-fixed.ts src/services/redis-client.ts
```

### Step 2: Update index.ts
Replace the Redis initialization section in your main server file:
```bash
# Use the provided fixed index.ts, or manually apply these changes:
# 1. Change createClient import source (if using new redis package)
# 2. Add socket.tls configuration
# 3. Add connection event listeners
# 4. Update error handling
```

### Step 3: Rebuild & Deploy
```bash
npm run build
git add .
git commit -m "fix: enable TLS for Upstash Redis on Railway"
git push origin main

# Railway auto-deploys from git push
# Check logs: railway logs
```

### Step 4: Verify Connection
```bash
# In Railway logs, you should see:
# ✅ Redis client connected
# ✅ Socket.IO Redis adapter initialized successfully
```

---

## Debugging: How to Verify the Fix

### Check Redis Status in Your App
```typescript
// Add this route temporarily to debug
app.get('/api/debug/redis', async (c) => {
    const redisStatus = redis.status  // From redis-client.ts
    return c.json({
        redisConnected: redisStatus === 'ready',
        status: redisStatus,
        url: process.env.REDIS_URL ? 'Configured' : 'Not configured',
    })
})

// Then check: curl https://your-app/api/debug/redis
// Expected response:
// {
//   "redisConnected": true,
//   "status": "ready",
//   "url": "Configured"
// }
```

### Check Socket.IO Connection
```typescript
// Add this route to verify Socket.IO adapter
app.get('/api/debug/socketio', (c) => {
    const adapterIsRedis = io.of('/').adapter.constructor.name.includes('Redis')
    return c.json({
        socketIOReady: true,
        usingRedisAdapter: adapterIsRedis,
        connections: io.engine.clientsCount,
    })
})
```

### Watch Railway Logs
```bash
# Terminal command
railway logs --follow

# Expected success logs:
# [ioredis] Redis client connected
# [socket.io] Redis adapter initialized
# 🚀 VolSpike Backend running on port 3001
# ✅ Redis configured: TLS enabled
```

---

## Common Issues & Solutions

### Issue: Still Getting ECONNRESET
**Cause:** TLS config not applied to all Redis clients
**Solution:** 
- Verify EVERY Redis client initialization has `tls: {}` or `socket.tls: true`
- Check that you're using the latest versions of ioredis/redis
- Ensure REDIS_URL hasn't been accidentally modified

### Issue: "Certificate verification failed"
**Cause:** `rejectUnauthorized: true` but Upstash cert not trusted
**Solution:**
```typescript
// Temporarily relax cert validation (development only!)
socket: {
    tls: true,
    rejectUnauthorized: process.env.NODE_ENV === 'development' ? false : true,
}

// Better: Update Node.js CA bundle
// This usually fixes it: npm install --no-save node@latest
```

### Issue: Connection Timeouts
**Cause:** Railway network policy or Upstash rate limiting
**Solution:**
```typescript
socket: {
    tls: true,
    connectTimeout: 15000,  // Increase from 10s
    commandTimeout: 10000,  // Increase from 5s
}
```

---

## Next Steps

1. ✅ Apply the fixes from `/mnt/user-data/outputs/`
2. ✅ Rebuild and deploy to Railway
3. ✅ Monitor logs for 24 hours for any lingering issues
4. ✅ Test cache operations in production:
   - Create watchlist (saves to Redis)
   - Fetch market data (reads from Redis)
   - Check alert notifications (Redis pub/sub)
5. ✅ If all works, remove debug routes and commit

---

## Related Documentation

- **Upstash TLS Troubleshooting:** https://upstash.com/docs/redis/troubleshooting/econn_reset
- **ioredis TLS:** https://github.com/luin/ioredis#ioredis
- **Node.js Redis Client:** https://github.com/redis/node-redis#tls-support
- **Railway Networking:** https://docs.railway.app/guides/networking

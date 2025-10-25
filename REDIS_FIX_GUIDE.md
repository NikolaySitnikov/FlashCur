# Redis ECONNRESET Fix Guide - Railway + Upstash

## Root Cause
Your Redis client is missing **TLS configuration** for the `rediss://` protocol. Upstash requires TLS/SSL, but your ioredis client isn't explicitly enabling it.

---

## Solution 1: Fix ioredis TLS Configuration (RECOMMENDED)

### The Problem
```typescript
// ❌ WRONG - Missing TLS config
const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
})
```

### The Fix
```typescript
// ✅ CORRECT - TLS enabled for rediss://
const redis = new Redis(process.env.REDIS_URL, {
    // Auto-enable TLS if using rediss:// URL
    tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,
    
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
    
    // Production-grade reconnection strategy
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        return delay
    },
    
    // Keep data queued while reconnecting
    enableOfflineQueue: true,
    autoResubscribe: true,
    autoResendUnfulfilledCommands: true,
})
```

### Why This Works
- `tls: {}` tells ioredis to use Node.js default TLS/SSL settings
- Upstash's `rediss://` URL is properly validated
- No need for custom certificates - Upstash uses standard CA-signed certs

---

## Solution 2: Use the Native `redis` Package (ALTERNATIVE)

If you continue having issues, try the native `redis` client which has better TLS support:

### Installation
```bash
npm install redis
# Remove ioredis if no longer needed
npm remove ioredis
```

### Implementation
```typescript
import { createClient } from 'redis'
import { createLogger } from '../lib/logger'

const logger = createLogger()

const redis = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
})

redis.on('error', (err) => {
    logger.error('Redis client error:', err)
})

redis.on('connect', () => {
    logger.info('Redis connected')
})

// Connect immediately
await redis.connect()

export { redis }
```

**Advantages:**
- Official Redis client library
- Better TLS/SSL support out of the box
- Simpler configuration
- Better compatibility with Upstash

---

## Solution 3: Use Upstash REST API (BACKUP OPTION)

If direct Redis connection continues failing, use Upstash's REST API:

### Installation
```bash
npm install @upstash/redis
```

### Implementation
```typescript
import { Redis } from '@upstash/redis'
import { createLogger } from '../lib/logger'

const logger = createLogger()

// Extract REST URL and token from rediss:// URL
// Format: rediss://default:TOKEN@HOSTNAME:6379
// REST API: https://HOSTNAME/rest/v1/

const redisUrl = process.env.REDIS_URL || ''
const match = redisUrl.match(/rediss:\/\/default:(.+)@(.+):/)
const token = match?.[1]
const hostname = match?.[2]

const redis = new Redis({
    url: `https://${hostname}/rest/v1/`,
    token: token || '',
})

logger.info('Using Upstash REST API for Redis')

export { redis }
```

**When to use:**
- REST API has ~50ms higher latency than direct connection
- Good for serverless functions
- Better error handling in some scenarios
- Useful if network policies block direct Redis connections

---

## Solution 4: Switch to Railway's Built-in Redis (SIMPLEST)

Instead of external Upstash, use Railway's Redis template:

1. In Railway dashboard: Add service → Select "Redis"
2. Railway auto-creates connection variables
3. Update your config:

```typescript
// Railway's Redis is already TLS-compatible
const redis = new Redis(process.env.REDIS_PRIVATE_URL, {
    // Railway handles TLS internally
    tls: process.env.NODE_ENV === 'production' ? {} : undefined,
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
})
```

**Why consider this:**
- No external provider needed
- Private networking (faster, more secure)
- Zero configuration for TLS
- Same region as your app (lower latency)

---

## Immediate Troubleshooting Steps

### 1. Verify Redis is Running
```bash
# Check Redis logs in Railway
# Look for "connected" messages
```

### 2. Test Connection Locally
```typescript
// Add to your dev environment
const testRedis = new Redis('rediss://default:YOUR_TOKEN@HOST:6379', {
    tls: {},
    connectTimeout: 5000,
})

testRedis.on('connect', () => console.log('✅ Connected'))
testRedis.on('error', (err) => console.error('❌ Error:', err))
```

### 3. Check Environment Variables
```bash
# In Railway dashboard, verify:
# - REDIS_URL starts with rediss://
# - No whitespace or special characters
# - Token is correct
```

### 4. Update package.json (if switching to native redis)
```json
{
  "dependencies": {
    "redis": "^4.7.0"  // Use latest version
  }
}
```

---

## Implementation Checklist

- [ ] Replace `src/services/redis-client.ts` with the fixed version
- [ ] Ensure `REDIS_URL` starts with `rediss://`
- [ ] Verify `NODE_ENV` is set to "production" on Railway
- [ ] Restart your Railway deployment
- [ ] Check logs for "Redis client connected"
- [ ] Monitor error rate for 1-2 hours
- [ ] Test cache operations (set/get)

---

## Debugging Tips

### Check ioredis connection status
```typescript
console.log('Redis status:', redis.status)
// Should be 'ready' when connected
```

### Add connection timeout logs
```typescript
const connectionTimeout = setTimeout(() => {
    logger.error('Redis connection timeout after 15s')
}, 15000)

redis.on('connect', () => {
    clearTimeout(connectionTimeout)
    logger.info('✅ Redis connected successfully')
})
```

### Monitor Socket.IO Redis adapter
In your `index.ts`, add:
```typescript
if (process.env.REDIS_URL) {
    logger.info(`Using Redis for Socket.IO: ${process.env.REDIS_URL.split('@')[1]}`)
    // Rest of adapter setup...
}
```

---

## Common Mistakes to Avoid

❌ **Don't:** Use `redis://` instead of `rediss://`
❌ **Don't:** Pass full certificates in TLS config (Upstash doesn't need it)
❌ **Don't:** Set `lazyConnect: true` without manual `.connect()` call
❌ **Don't:** Ignore Redis errors (they're usually important!)
❌ **Don't:** Use same Redis client instance across multiple processes

---

## Expected Behavior After Fix

1. **Startup logs:**
   ```
   🚀 VolSpike Backend running on port 3001
   ✅ Redis client connected
   📊 Socket.IO Redis adapter initialized
   ```

2. **Health check:**
   ```bash
   curl https://your-app/health
   # Should return 200 OK with timestamp
   ```

3. **No error messages:**
   - No "ECONNRESET" errors
   - No "Socket closed unexpectedly"
   - No "TLS handshake" failures

---

## Support Resources

- [Upstash Redis TLS Troubleshooting](https://upstash.com/docs/redis/troubleshooting/econn_reset)
- [ioredis GitHub Issues](https://github.com/luin/ioredis/issues)
- [Railway Community Help](https://community.railway.app)
- [Node.js Redis Client Docs](https://github.com/redis/node-redis)

---

## Questions?

If this doesn't work, gather:
1. Railway deployment logs (copy full error message)
2. Your `REDIS_URL` (with token masked for security)
3. Output of `redis.status` during connection attempt
4. Node.js version: `node --version`
5. ioredis version: `npm list ioredis`

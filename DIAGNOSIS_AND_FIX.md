# VolSpike Backend - 499 Timeout Issue DIAGNOSIS & FIX

## 🔴 Critical Issue Found

**Symptom**: HTTP 499 errors with timeouts (43s, 14s) in Railway HTTP logs
**Root Cause**: Your backend server crashes immediately after startup
**Evidence**: Deploy logs show Socket.IO initializing, then... nothing. The process dies silently.

---

## 🎯 What's Actually Happening

Your current `src/index.ts` has a **fatal server conflict**:

```typescript
// This creates ONE HTTP server and returns
serve({
    fetch: app.fetch,
    port: Number(process.env.PORT) || 3001,
    createServer: () => server  // ← Returns a server
})

// Then you try to attach Socket.IO to a DIFFERENT server object
const io = new SocketIOServer(server, {
    // ...
})

// Result: TWO SERVERS FIGHTING FOR THE SAME PORT
// One crashes, and the HTTP requests timeout waiting for a response
```

The `@hono/node-server` `serve()` function creates and binds its own HTTP server. Your manual `createServer()` is never used by Hono, but you're trying to attach Socket.IO to it. This causes the Socket.IO server to start on one port/interface while Hono is on another, leading to crashes.

---

## ✅ The Solution

Use **ONE HTTP server** for both Hono and Socket.IO:

### Key Changes:

1. **Create a single HTTP server**:
```typescript
const httpServer = createServer(async (req, res) => {
    // Handle HTTP requests here
})
```

2. **Attach Hono to it manually**:
```typescript
const request = new Request(url, { method, headers, body })
const response = await app.fetch(request)
// Convert response and send
```

3. **Attach Socket.IO to the SAME server**:
```typescript
const io = new SocketIOServer(httpServer, { ... })
```

4. **Listen once**:
```typescript
httpServer.listen(port, '0.0.0.0', () => {
    logger.info('Server ready')
})
```

---

## 📋 Step-by-Step Fix

### 1. Replace Your `src/index.ts`

Delete your current `src/index.ts` and copy the contents of `index-FINAL-FIXED.ts` into it.

**Critical changes**:
- ❌ Removed: `import { serve } from '@hono/node-server'`
- ❌ Removed: `serve({ ... })` function call
- ✅ Added: Manual HTTP server creation
- ✅ Added: Explicit request/response conversion
- ✅ Added: Server startup logging
- ✅ Added: Binding to `0.0.0.0` (all interfaces)

### 2. Test Locally

```bash
cd volspike-nodejs-backend

# Build
npm run build

# Start
npm start
```

**Expected output** (MUST see this):
```
🚀 VolSpike Backend running on port 3001
📊 Environment: development
🔗 Frontend URL: http://localhost:3000
✅ Server ready to accept requests
```

**Test it**:
```bash
# In another terminal
curl http://localhost:3001/health
```

**Expected response**:
```json
{"status":"ok","timestamp":"2025-10-25T...","version":"1.0.0"}
```

### 3. Commit and Deploy

```bash
git add src/index.ts
git commit -m "Fix: Single HTTP server for Hono and Socket.IO"
git push
```

Railway will automatically redeploy.

### 4. Verify Deployment

Watch the Railway deploy logs. You should see:
```
Starting Container
> volspike-backend@1.0.0 start
> node dist/index.js

🚀 VolSpike Backend running on port 3001
📊 Environment: production
🔗 Frontend URL: https://volspike.com
✅ Server ready to accept requests
```

Then test:
```bash
curl https://volspike-production.up.railway.app/health
```

**Expected response** (IMMEDIATE, no timeout):
```json
{"status":"ok","timestamp":"2025-10-25T...","version":"1.0.0"}
```

---

## 🔍 Technical Details

### Why `0.0.0.0` binding matters

Your original code might have been binding to `localhost` (127.0.0.1) by default, which only accepts local connections. Railway's edge proxy needs to connect from outside the container.

```typescript
// WRONG - only accepts localhost
httpServer.listen(port)

// CORRECT - accepts connections from anywhere
httpServer.listen(port, '0.0.0.0')
```

### Why the request conversion is necessary

Hono's `app.fetch()` expects Web API `Request`/`Response` objects, but Node.js HTTP servers provide Node-specific request/response objects:

```typescript
// Convert Node.js IncomingMessage → Web API Request
const request = new Request(url, {
    method: req.method,
    headers: req.headers as Record<string, string>,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req,
})

// Call Hono
const response = await app.fetch(request)

// Convert Web API Response → Node.js response
res.writeHead(response.status, Object.fromEntries(response.headers))
// Stream the body...
```

### Why Socket.IO needs the same server

Socket.IO uses HTTP upgrade events to establish WebSocket connections. It needs to attach to the actual HTTP server instance that's listening on the port:

```typescript
// WRONG - two separate servers
const honoServer = createServer()
const socketServer = createServer()  // Different instance!
serve({ fetch: app.fetch, createServer: () => honoServer })
new SocketIOServer(socketServer)  // Never gets the requests

// CORRECT - one server for both
const httpServer = createServer()
// Route HTTP requests to Hono
// Attach Socket.IO to the same instance
new SocketIOServer(httpServer)
httpServer.listen(port)
```

---

## 📊 Expected Results

### Before Fix
```
Deploy Logs:
✅ VolSpike Backend running on port 3001
✅ Socket.IO Redis adapter initialized
(then silence - server crashes)

HTTP Logs:
GET /health → 499 with 43 second timeout
GET /health → 499 with 14 second timeout
```

### After Fix
```
Deploy Logs:
✅ VolSpike Backend running on port 3001
✅ Socket.IO Redis adapter initialized
✅ Server ready to accept requests

HTTP Logs:
GET /health → 200 OK in 50ms
GET /api/market/data → 200 OK in 120ms
GET / (unmatched route) → 404 in 20ms
```

---

## 🆘 If It Still Doesn't Work

### 1. Check the logs immediately after deployment

```bash
railway logs -s volspike-production --follow
```

Look for:
- ❌ Error messages after "Server ready"
- ❌ Uncaught exceptions
- ✅ Should show requests coming in

### 2. Verify environment variables

In Railway dashboard, check that these are set:
- `PORT=3001` (or Railway sets it automatically)
- `NODE_ENV=production`
- `FRONTEND_URL=https://volspike.com`
- Database URL (Prisma should connect)
- Redis URL (if using Redis)

### 3. Test with HTTP instead of HTTPS

```bash
curl -v http://volspike-production.up.railway.app/health
```

HTTP should work without SSL issues.

### 4. Check if there's a Prisma migration issue

If Prisma can't connect to the database, the server might crash:

```bash
railway run npm run db:push
```

Then redeploy.

---

## ✨ Additional Improvements in This Fix

1. **Better error handling** - Catches and logs all errors
2. **Proper shutdown** - Closes server and Prisma on signals
3. **Consistent logging** - Shows server is ready
4. **Binding to all interfaces** - Works with Railway's networking
5. **Redis error resilience** - Falls back to in-memory if Redis fails
6. **Socket.IO disconnection logging** - Tracks connection lifecycle

---

## 📝 Files

- **`index-FINAL-FIXED.ts`** - Copy this to `src/index.ts`
- **This document** - Complete explanation

---

## ⏱️ Expected Timeline

- Apply fix: 5 minutes
- Local test: 5 minutes
- Deploy: 3-5 minutes (Railway redeploys automatically)
- Verify: 1 minute
- **Total: ~20 minutes**

Your backend should be fully functional after these changes! 🚀

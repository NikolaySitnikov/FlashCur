# VolSpike Backend Build Fix Guide

## Problem
Railway build failing with error: `failed to receive status: rpc error: code = Unavailable desc = error reading from server: EOF`

This is typically caused by:
1. Network interruption during Docker build
2. Build timeout
3. Memory constraints
4. npm install failing due to network issues

## Solutions (Try in Order)

### Solution 1: Use Multi-Stage Dockerfile (RECOMMENDED)
Replace your current Dockerfile with `Dockerfile.multistage`. This approach:
- Separates build and runtime stages
- Reduces final image size
- More reliable dependency installation
- Better caching

**Steps:**
1. Replace `volspike-nodejs-backend/Dockerfile` with the `Dockerfile.multistage` content
2. Add the `.dockerignore` file to `volspike-nodejs-backend/`
3. Commit and push to trigger Railway rebuild

### Solution 2: Use Optimized Single-Stage Dockerfile
If multi-stage doesn't work, use the optimized `Dockerfile`:
- Includes retry logic for npm install
- Uses `npm ci` instead of `npm install` for faster, more reliable builds
- Better error handling

### Solution 3: Use Nixpacks (Railway Native)
Railway's native Nixpacks builder is often more reliable than Docker.

**Steps:**
1. Add `nixpacks.toml` to your `volspike-nodejs-backend/` directory
2. In Railway dashboard, remove the Dockerfile build setting to let Railway auto-detect nixpacks
3. Commit and push

### Solution 4: Railway Settings
In your Railway project settings, check:

1. **Build Settings:**
   - Build command: `npm run build`
   - Start command: `node dist/index.js`

2. **Environment Variables:**
   Make sure these are set:
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `REDIS_URL` - Your Redis connection string (if using Redis)
   - `NODE_ENV=production`

3. **Resource Allocation:**
   - Ensure you have enough memory (at least 512MB for build)
   - Check if you're hitting any limits

### Solution 5: Fix TypeScript Path Aliases
Your tsconfig.json uses path aliases (`@/*`) which TypeScript doesn't resolve in output.

**Option A: Install tsconfig-paths (Runtime)**
Add to package.json dependencies:
```json
"tsconfig-paths": "^4.2.0"
```

Then modify your start script:
```json
"start": "node -r tsconfig-paths/register dist/index.js"
```

**Option B: Use tsc-alias (Build Time)**
Install as dev dependency:
```bash
npm install --save-dev tsc-alias
```

Modify build script in package.json:
```json
"build": "tsc && tsc-alias"
```

### Solution 6: Prisma Issues
If Prisma is causing issues:

1. Make sure `DATABASE_URL` is set in Railway
2. Add to your Dockerfile BEFORE prisma generate:
```dockerfile
ENV DATABASE_URL="postgresql://dummy:dummy@dummy:5432/dummy"
```

This gives Prisma a dummy URL for build time (it will use the real one at runtime).

## Debugging Steps

1. **Check Railway Logs:**
   - Look for the exact line where build fails
   - Check for out-of-memory errors
   - Look for network timeout messages

2. **Test Locally:**
   ```bash
   cd volspike-nodejs-backend
   docker build -t volspike-backend .
   ```

3. **Verify Dependencies:**
   ```bash
   npm ci
   npx prisma generate
   npm run build
   ```

## Quick Commands

**Replace Dockerfile:**
```bash
cp Dockerfile.multistage volspike-nodejs-backend/Dockerfile
```

**Add .dockerignore:**
```bash
cp .dockerignore volspike-nodejs-backend/.dockerignore
```

**Add nixpacks.toml:**
```bash
cp nixpacks.toml volspike-nodejs-backend/nixpacks.toml
```

**Commit and push:**
```bash
git add .
git commit -m "fix: optimize Docker build for Railway"
git push
```

## Expected Result
After applying fixes, you should see:
- ✅ Build completes successfully
- ✅ Prisma client generates
- ✅ TypeScript compiles to dist/
- ✅ Application starts on port 3001
- ✅ Backend accessible at your Railway URL

## Next Steps After Build Succeeds
Once the backend builds successfully, you'll need to address:
1. Binance API connection issues (500 errors on /api/market/data)
2. Ticker data processing errors in ingestion service
3. Redis configuration (BullMQ warnings)

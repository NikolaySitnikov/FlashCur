# VolSpike - Deployment Quick Reference

## 🚀 QUICK FIX SUMMARY (5 Minutes)

### Critical Issues Found:
1. ❌ **Password verification disabled** → All passwords accepted
2. ❌ **JWT secrets mismatched** → Session creation fails
3. ❌ **TypeScript build errors** → Deployment blocked
4. ❌ **Frontend escape error** → Vercel build fails

### Quick Fixes:
1. ✅ **Enable password auth** (2 code changes)
2. ✅ **Align JWT secrets** (1 env file change)
3. ✅ **Fix function signature** (1 code change)
4. ✅ **Escape apostrophe** (1 code change)

---

## 📝 STEP-BY-STEP DEPLOYMENT

### Step 1: Update Backend (5 minutes)

```bash
cd volspike-nodejs-backend
```

**Edit**: `src/routes/auth.ts`

**Line ~115**: Uncomment password verification
```typescript
// OLD (line 115-120):
// const isValidPassword = await verifyPassword(password, user.passwordHash)
// if (!isValidPassword) {
//     return c.json({ error: 'Invalid credentials' }, 401)
// }

// NEW:
if (!user.passwordHash) {
    return c.json({ error: 'Please use OAuth login' }, 401)
}
const isValidPassword = await verifyPassword(password, user.passwordHash)
if (!isValidPassword) {
    return c.json({ error: 'Invalid email or password' }, 401)
}
```

**Line ~162**: Enable password storage
```typescript
// OLD (line 162):
// passwordHash, // Uncomment when implementing password storage

// NEW:
passwordHash,
```

**Edit**: `src/services/binance-client.ts`

**Change function signature**:
```typescript
// OLD:
export async function getMarketData(): Promise<MarketData[]>

// NEW:
export async function getMarketData(symbol?: string): Promise<MarketData[] | MarketData | null>
```

**Add symbol handling**:
```typescript
if (symbol) {
    const response = await axios.get(
        `https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${symbol}`
    )
    return response.data
}
// ... existing code for all symbols
```

**Test build**:
```bash
npm run build
```

**Deploy to Railway**:
```bash
railway up
```

---

### Step 2: Update Frontend (3 minutes)

```bash
cd volspike-nextjs-frontend
```

**Edit**: `.env.local`

**Change NEXTAUTH_SECRET** (line 3):
```bash
# OLD:
NEXTAUTH_SECRET=PGBj9TbkWz6eah0+U0U2QR2EIM8Q0fwLIcY2Z0m9nqI=

# NEW (must match backend JWT_SECRET):
NEXTAUTH_SECRET=Qr6u7Ty2bcqAzWQySp8z/kSyFVvd6yhz2difFf5qTFno1f/st57lMSsJUJvDAvFsT6mmXPcaBM/o7ENyRCkHjg==
```

**Fix duplicate** (line 14):
```bash
# OLD:
NEXT_PUBLIC_WS_URL=NEXT_PUBLIC_WS_URL=wss://fstream.binance.com/...

# NEW:
NEXT_PUBLIC_WS_URL=wss://fstream.binance.com/stream?streams=!ticker@arr/!markPrice@arr
```

**Edit**: `src/app/dashboard/page.tsx`

**Line 19** - Escape apostrophe:
```typescript
// OLD:
<p>Welcome back! You're successfully logged in.</p>

// NEW:
<p>Welcome back! You&apos;re successfully logged in.</p>
```

**Test build**:
```bash
npm run build
```

**Deploy to Vercel**:
```bash
vercel --prod
```

---

### Step 3: Database Migration (1 minute)

```bash
cd volspike-nodejs-backend
npx prisma db push
```

**Verify `passwordHash` column exists**:
```bash
npx prisma studio
# Check User model has passwordHash field
```

---

### Step 4: Test Authentication (2 minutes)

**Create test user**:
```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!","tier":"free"}'
```

**Test signin**:
```bash
curl -X POST http://localhost:3001/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!"}'
```

**Expected response**:
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "...",
    "email": "test@test.com",
    "tier": "free"
  }
}
```

**Test invalid password**:
```bash
curl -X POST http://localhost:3001/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'
```

**Expected response**:
```json
{
  "error": "Invalid email or password"
}
```

---

## 🔍 TROUBLESHOOTING

### Issue: "Build still fails"

```bash
# Clean and rebuild
rm -rf node_modules dist .next
npm install
npm run build
```

### Issue: "Users can't log in after deployment"

**Reason**: Old users don't have password hashes

**Solution**: Reset user database
```sql
-- Delete all non-OAuth users
DELETE FROM "User" WHERE "walletAddress" IS NULL AND "passwordHash" IS NULL;
```

Users need to re-register.

### Issue: "Session not persisting"

**Check**:
1. NEXTAUTH_SECRET matches JWT_SECRET
2. NEXTAUTH_URL is correct
3. Browser cookies are enabled
4. No CORS errors in console

### Issue: "Market data not loading"

**Check**:
1. Binance API is reachable
2. WebSocket URL is correct
3. No CSP (Content Security Policy) blocking WebSocket
4. Browser console shows WebSocket connection

---

## 📊 VERIFICATION CHECKLIST

After deployment, verify:

- [ ] Backend builds successfully on Railway
- [ ] Frontend builds successfully on Vercel
- [ ] User can sign up with email/password
- [ ] User receives verification email
- [ ] User can sign in with correct password
- [ ] User sees error with incorrect password
- [ ] User redirects to dashboard after login
- [ ] Session persists after page refresh
- [ ] Market data loads in dashboard
- [ ] Google OAuth still works
- [ ] WebSocket connection works (Elite tier)

---

## 🔐 SECURITY NOTES

### Critical Security Fixed:
✅ Password verification now enabled
✅ JWT secrets aligned
✅ Passwords properly hashed

### Remaining Security Tasks:
⚠️ **Rotate API keys** in production (SendGrid, Stripe exposed in docs)
⚠️ **Enable HTTPS** in production (update NEXTAUTH_URL)
⚠️ **Test rate limiting** (configured but needs verification)
⚠️ **Enable 2FA** for admin accounts
⚠️ **Set up monitoring** (Sentry for errors)

---

## 📞 SUPPORT COMMANDS

### Check Backend Status
```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/market/health
```

### Check Frontend Status
```bash
curl http://localhost:3000
# Should return HTML
```

### View Backend Logs
```bash
cd volspike-nodejs-backend
npm run dev
# Watch for authentication logs
```

### View Database
```bash
cd volspike-nodejs-backend
npx prisma studio
# Opens GUI at http://localhost:5555
```

### Reset Everything
```bash
# Backend
cd volspike-nodejs-backend
rm -rf node_modules dist
npm install
npx prisma db push
npm run build

# Frontend
cd volspike-nextjs-frontend
rm -rf node_modules .next
npm install
npm run build
```

---

## 🎯 EXPECTED TIMELINE

- **Step 1** (Backend): 5 minutes
- **Step 2** (Frontend): 3 minutes
- **Step 3** (Database): 1 minute
- **Step 4** (Testing): 2 minutes
- **Total**: ~11 minutes

---

## ✅ SUCCESS INDICATORS

You'll know it's working when:

1. **Build succeeds**:
   - Railway shows "Build Successful"
   - Vercel shows "Build Successful"

2. **Authentication works**:
   - Valid password → Dashboard
   - Invalid password → Error message
   - Error message displays properly

3. **Session persists**:
   - Refresh page → Still logged in
   - Close tab → Open again → Still logged in (if "remember me" checked)

4. **Market data loads**:
   - Dashboard shows Binance data
   - Data updates based on tier (Free: 15min, Pro: 5min, Elite: real-time)

---

**Document Version**: 1.0
**Last Updated**: October 28, 2025
**Estimated Time**: 11 minutes
**Difficulty**: Easy
**Status**: Ready for Deployment

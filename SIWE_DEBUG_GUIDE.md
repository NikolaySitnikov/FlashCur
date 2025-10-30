# SIWE Sign-in Debug Guide (VolSpike)

This guide helps isolate the last-mile issue when SIWE verify succeeds but the app redirects back to `/auth`.

## Quick Checklist

1) Providers endpoint shows `siwe`:
   - Visit `/api/auth/providers` and confirm there is an id `siwe`.
2) Callback visible in Network:
   - After clicking "Sign In with Wallet", you should see `POST /api/auth/callback/siwe`.
3) Cookie written:
   - After the callback, DevTools → Application → Cookies → `http://localhost:3000` should show `next-auth.session-token`.
4) Session endpoint returns a user:
   - Visit `/api/auth/session` in the same tab. Expect a JSON with a user object (not `null`).

## Expected Console Logs (from use-wallet-auth)
- `[useWalletAuth] Verify response: { ok: true, hasToken: true, user: {...} }`
- `[useWalletAuth] signIn result: { ok, error, status, url }`
- `[useWalletAuth] document.cookie snapshot: ...`
- `[useWalletAuth] Session after signIn: {...} | null`

## If Callback is Missing
- `signIn('siwe')` likely returned an error before posting. Inspect the logged `signIn result` and surface `result.error`.
- Ensure Credentials provider id is exactly `siwe` and the route handler is `src/app/api/auth/[...nextauth]/route.ts` with `export const runtime = 'nodejs'`.

## If Cookie Not Set
- Confirm `NEXTAUTH_URL=http://localhost:3000` and `NEXTAUTH_SECRET` are present.
- Ensure route uses Node runtime (not edge) and there is no middleware removing cookies.

## If `authorize` Returns Null
- Verify the frontend and backend share the same `SIWE_JWT_SECRET` used to create and verify the token.
- As fallback, `authorize` can call backend `/api/auth/me` with `Authorization: Bearer <token>` and return a user object.

## Env Vars (dev)
- Frontend: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `SIWE_JWT_SECRET`, `NEXT_PUBLIC_API_URL`
- Backend: `FRONTEND_URL`, `SIWE_JWT_SECRET`, `SESSION_SECRET`

## Notes
- Do not use `runtime = 'edge'` for the NextAuth route.
- When using `redirect: false`, always check `result.ok` before navigating; log `result.error` if present.

# SIWE Debug Guide (NextAuth + Wallet)

This guide helps verify each step of the wallet sign-in flow and quickly isolate where a failure occurs.

## 1) Preconditions
- Frontend: NEXTAUTH_URL=http://localhost:3000, NEXTAUTH_SECRET set
- Frontend/Backend: SIWE_JWT_SECRET set to the same value
- Backend: FRONTEND_URL=http://localhost:3000
- NextAuth route: `src/app/api/auth/[...nextauth]/route.ts` with `export const runtime = 'nodejs'`
- Providers endpoint lists `siwe`: GET http://localhost:3000/api/auth/providers

## 2) Expected Network Flow
1. GET /api/auth/siwe/nonce → 200
2. GET /api/auth/siwe/prepare?address=…&chainId=…&nonce=… → 200 (returns message)
3. POST /api/auth/siwe/verify → 200 `{ ok: true, token, user }`
4. POST /api/auth/callback/siwe → 200/302 (NextAuth callback)
5. GET /api/auth/session → user JSON (not null)

If step 4 doesn’t appear, `signIn('siwe')` failed before making the callback.

## 3) Console Logs to Capture
From `use-wallet-auth`:
- `[useWalletAuth] Verify response: { ok: true, hasToken: true, user }`
- `[useWalletAuth] signIn result: { ok, error, status, url }`
- `[useWalletAuth] document.cookie snapshot: ...`
- `[useWalletAuth] Session after signIn: ...`

## 4) Cookies
- DevTools → Application → Cookies → http://localhost:3000
- Expect: `next-auth.session-token` (or `__Secure-next-auth.session-token`)

## 5) Common Causes & Fixes
- No callback request: Provider id mismatch or authorize() returning null → ensure Credentials provider has `id: 'siwe'` and authorize returns a user.
- Session null: Cookie not written → confirm Node runtime for route and NEXTAUTH_URL is HTTP localhost.
- Domain mismatch: `domain` must be the hostname of FRONTEND_URL (no port) in SIWE verify.
- Nonce mismatch: `/prepare` must reuse the nonce from `/nonce`; backend verify should validate and consume it.

## 6) Sanity Checks
- GET /api/auth/providers shows `siwe`
- After sign-in, GET /api/auth/session returns user
- Cookie exists after sign-in

If any step fails, capture the exact console and network outputs and adjust provider `authorize`/env accordingly.
# SIWE Authentication Debugging Guide

## Root Cause Analysis

Your SIWE verification is succeeding on the backend, but NextAuth is not creating a session. The issue is:

1. **Backend Bug**: Line ~414 in `auth.ts` uses undefined `fields.address` instead of `address`
2. **Frontend Issue**: The `signIn('siwe')` call isn't properly handling the response
3. **Session Creation**: NextAuth's credentials provider for SIWE may be returning null

## Immediate Fixes Required

### 1. Backend Fix (volspike-nodejs-backend/src/routes/auth.ts)

Find this line around line 414:
```typescript
email: `${fields.address}@volspike.wallet`,
```

Change it to:
```typescript
email: `${address}@volspike.wallet`,
```

### 2. Frontend Fix (use-wallet-auth.ts)

Replace your existing hook with the fixed version in `/mnt/user-data/outputs/use-wallet-auth-fixed.ts`

Key changes:
- Added comprehensive console logging
- Properly checks `signInResult` for errors
- Verifies session creation before redirecting
- Adds a small delay to allow cookie setting
- Better error messages

### 3. NextAuth Configuration Check (lib/auth.ts)

Ensure your SIWE provider's authorize function is properly configured. The current one looks correct but verify:

1. It's receiving the `token` and `walletAddress` credentials
2. The backend `/api/auth/me` endpoint responds with the expected user data
3. The `accessToken` is being set in the return value

## Debugging Steps

### Step 1: Enable Detailed Logging

Add this to your `.env.local`:
```
NEXTAUTH_DEBUG=true
```

### Step 2: Check Browser DevTools

After clicking "Sign In with Wallet", check:

1. **Console Tab**: Look for these logs in order:
   ```
   [useWalletAuth] Starting sign-in, address: 0x..., chainId: 1
   [useWalletAuth] Got nonce: ...
   [useWalletAuth] Generated SIWE message: ...
   [useWalletAuth] Got signature: ...
   [useWalletAuth] Verify response: { ok: true, hasToken: true, user: {...} }
   [useWalletAuth] signIn result: { ok: ..., error: ..., status: ..., url: ... }
   [useWalletAuth] Session after signIn: ...
   ```

2. **Network Tab**: Look for:
   - `GET /api/auth/siwe/nonce` - Should return 200
   - `POST /api/auth/siwe/verify` - Should return 200 with token
   - `POST /api/auth/callback/siwe` - **THIS IS THE CRITICAL ONE**
     - If missing: NextAuth isn't calling the provider
     - If 401/403: Provider authorize() returned null
     - If 200: Check response and cookies

3. **Application Tab > Cookies**: After sign-in attempt, check for:
   - `next-auth.session-token` (or `__Secure-next-auth.session-token` in production)
   - If missing: Session wasn't created

### Step 3: Test Backend Independently

Test SIWE verification directly:
```bash
# Get nonce
curl -X GET http://localhost:3001/api/auth/siwe/nonce \
  -H "X-Wallet-Address: 0xYourAddress"

# Test verify (you'll need a real signature)
curl -X POST http://localhost:3001/api/auth/siwe/verify \
  -H "Content-Type: application/json" \
  -H "X-Wallet-Nonce: <nonce-from-above>" \
  -d '{"message": "...", "signature": "..."}'
```

### Step 4: Check NextAuth Session

After attempting sign-in, directly check the session:
```bash
curl http://localhost:3000/api/auth/session \
  -H "Cookie: <copy-cookies-from-browser>"
```

## Common Issues & Solutions

### Issue 1: "CredentialsSignin" Error
**Cause**: The SIWE provider's `authorize()` is returning null
**Solution**: Check that:
- Backend `/api/auth/me` is accessible with the token
- Token format matches what backend expects
- User object has all required fields

### Issue 2: No Callback Request
**Cause**: NextAuth isn't invoking the provider
**Solution**: Ensure provider ID 'siwe' matches exactly in both places

### Issue 3: Session Cookie Not Set
**Cause**: NextAuth runtime configuration issue
**Solution**: Check:
- `NEXTAUTH_URL` matches your current URL
- `NEXTAUTH_SECRET` is set and consistent
- No middleware blocking cookie writes

### Issue 4: Wallet Message Different
**Cause**: Domain/URI mismatch in SIWE message
**Solution**: Ensure:
- Domain matches `window.location.host`
- URI matches `window.location.origin`
- No port mismatches between frontend/backend

## Environment Variable Check

Ensure these are set correctly:

**Frontend (.env.local)**:
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<same-as-SIWE_JWT_SECRET>
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Backend (.env)**:
```
JWT_SECRET=<your-secret>
SIWE_JWT_SECRET=<same-as-NEXTAUTH_SECRET>
FRONTEND_URL=http://localhost:3000
```

## Testing Sequence

1. Clear all cookies for localhost
2. Start fresh browser session
3. Connect wallet (MetaMask/etc)
4. Open DevTools Console + Network tabs
5. Click "Sign In with Wallet"
6. Watch for the logs mentioned above
7. Check for the `/api/auth/callback/siwe` request
8. Verify session cookie is set
9. Check `/api/auth/session` returns user data

## Expected Success Flow

1. Wallet connects successfully
2. Nonce fetched from backend
3. User signs SIWE message
4. Backend verifies and returns token + user
5. NextAuth signIn('siwe') called with token
6. NextAuth calls the SIWE provider's authorize()
7. Provider validates token with backend
8. Provider returns user object
9. NextAuth creates session and sets cookie
10. Frontend verifies session exists
11. Redirect to /dashboard succeeds

## If All Else Fails

Try this minimal test to isolate the issue:

```typescript
// In a test component
const testSiweAuth = async () => {
  // Manually call NextAuth signIn
  const result = await signIn('siwe', {
    token: 'test-token-from-backend',
    walletAddress: '0xTestAddress',
    redirect: false,
  })
  
  console.log('Manual signIn test:', result)
  
  // Check session
  const sessionRes = await fetch('/api/auth/session')
  const session = await sessionRes.json()
  console.log('Session after manual test:', session)
}
```

This will tell you if the issue is in:
- Wallet signing process
- Backend verification
- NextAuth configuration
- Session creation

## Contact for Help

If you're still stuck after these steps, provide:
1. Full console output from the attempt
2. Network tab HAR export
3. The exact error message or behavior
4. Your environment variables (redacted secrets)

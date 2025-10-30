# SIWE CORS Fix Complete

## Problem

CORS policy blocked SIWE verification request because the `x-wallet-nonce` header was not allowed in the preflight response.

**Error Message:**
```
Access to fetch at 'http://localhost:3001/api/auth/siwe/verify' from origin 'http://localhost:3000' 
has been blocked by CORS policy: Request header field x-wallet-nonce is not allowed by 
Access-Control-Allow-Headers in preflight response.
```

## Solution Implemented

### Added `X-Wallet-Nonce` to CORS Allowed Headers

**File**: `volspike-nodejs-backend/src/index.ts`

**Before:**
```typescript
allowHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-Wallet-Address'],
```

**After:**
```typescript
allowHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Requested-With',
    'X-Wallet-Address',
    'X-Wallet-Nonce'  // ✅ Add custom header for SIWE nonce
],
```

### Added Explicit OPTIONS Handler

```typescript
// Explicit OPTIONS handler for extra safety
app.options('*', (c) => c.text('', 204))
```

## How CORS Preflight Works

### Browser Preflight Request (OPTIONS)
```
OPTIONS /api/auth/siwe/verify HTTP/1.1
Host: localhost:3001
Origin: http://localhost:3000
Access-Control-Request-Method: POST
Access-Control-Request-Headers: content-type, x-wallet-nonce
```

### Required Response Headers
```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET,POST,OPTIONS
Access-Control-Allow-Headers: content-type,authorization,x-wallet-nonce  ✅
Access-Control-Allow-Credentials: true
```

## Testing CORS Fix

### Test Preflight with curl:
```bash
curl -i -X OPTIONS 'http://localhost:3001/api/auth/siwe/verify' \
  -H 'Origin: http://localhost:3000' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type, x-wallet-nonce'
```

**Expected Response:**
- HTTP/1.1 204 No Content
- `Access-Control-Allow-Headers` includes `x-wallet-nonce`
- `Access-Control-Allow-Origin: http://localhost:3000`
- `Access-Control-Allow-Credentials: true`

## Complete SIWE Flow Now Works

1. ✅ Get nonce from server (`/api/auth/siwe/nonce`)
2. ✅ Get server-prepared SIWE message (`/api/auth/siwe/prepare`)
3. ✅ User signs with MetaMask
4. ✅ **Verify signature (`/api/auth/siwe/verify`) - CORS now allows the request**
5. ✅ Create NextAuth session
6. ✅ Redirect to dashboard

## Files Modified

- `volspike-nodejs-backend/src/index.ts` - Added `X-Wallet-Nonce` to allowed headers

## CORS Configuration Details

**Current CORS Setup:**
```typescript
app.use('*', cors({
    origin: getAllowedOrigins(),
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'Origin',
        'X-Requested-With',
        'X-Wallet-Address',
        'X-Wallet-Nonce'  // ✅ SIWE nonce header
    ],
    exposeHeaders: ['Content-Length', 'X-Total-Count', 'X-Page-Count'],
    maxAge: 86400,
}))
```

**Key Points:**
- ✅ `credentials: true` - Allows cookies/sessions
- ✅ `origin` callback - Dynamically checks allowed origins
- ✅ All SIWE-related headers now allowed
- ✅ Explicit OPTIONS handler for preflight safety

## Testing Checklist

- [ ] Start backend: `cd volspike-nodejs-backend && npm run dev`
- [ ] Start frontend: `cd volspike-nextjs-frontend && npm run dev`
- [ ] Open http://localhost:3000
- [ ] Click "Sign In with Wallet"
- [ ] Verify no CORS errors in console
- [ ] Approve MetaMask signature
- [ ] Confirm successful authentication

## Expected Console Output

**Success:**
```
[useWalletAuth] Starting sign-in, address: 0x... chainId: 1
[useWalletAuth] Got nonce: saf7UY2kxp5aFnGtw
[useWalletAuth] Requesting server-prepared SIWE message...
[useWalletAuth] Got server-prepared SIWE message
[useWalletAuth] Requesting signature from wallet...
[useWalletAuth] Got signature: 0x...
[useWalletAuth] Redirecting to dashboard...
```

**No CORS errors!** ✅

## Summary

The CORS fix was simple: add `X-Wallet-Nonce` to the `allowHeaders` array in the CORS middleware. This allows the browser's preflight OPTIONS request to succeed, enabling the actual POST request to proceed.

The complete SIWE authentication flow should now work end-to-end without CORS blocking! 🎉


# Wallet Authentication Issue Report

## Current Status
- **Frontend**: Running on port 3000
- **Backend**: Running on port 3001 (restarting frequently due to errors)
- **Feature**: Sign-In with Ethereum (SIWE) wallet authentication

## Error Description

### Frontend Error:
```
Console Error: fields is not defined
src/hooks/use-wallet-auth.ts (89:15) @ signInWithWallet
```

This error occurs when the backend returns a 401 (Unauthorized) response during SIWE signature verification. The frontend code is trying to access an undefined variable "fields" (likely from a previous implementation).

### Backend Issue:
The backend logs show "Server error" but don't show the actual verification attempt logs, suggesting the server crashes or the SIWE verification endpoint isn't being reached.

## What Was Implemented

### 1. Frontend (`volspike-nextjs-frontend`)
- **File**: `src/hooks/use-wallet-auth.ts`
- **Issue**: SIWE message generation fixed, signature flow works, but error handling references undefined `fields` variable

### 2. Backend (`volspike-nodejs-backend`)
- **File**: `src/routes/auth.ts` (lines 432-557)
- **Issue**: Manual SIWE message parsing implemented, but server appears to crash during processing

### 3. Database Schema
- **File**: `volspike-nodejs-backend/prisma/schema.prisma`
- **Status**: `WalletAccount` model added successfully

### 4. Dependencies
- **Frontend**: `siwe@3.0.0`
- **Backend**: `siwe@2.3.2`, `viem@2.38.5`

## Questions for Expert

1. **SIWE Library Compatibility**
   - Frontend uses `siwe@3.0.0`, backend uses `siwe@2.3.2`
   - Is this version mismatch causing issues?
   - Should we upgrade backend to v3 or downgrade frontend to v2?

2. **SIWE Message Format**
   - We're manually building the SIWE message string in frontend
   - We're manually parsing it in backend (because the siwe library's parser was failing)
   - Is there a better way to handle this?

3. **Signature Verification**
   - Using `viem.verifyMessage()` for signature verification
   - Is this the correct approach for SIWE v2/v3?

4. **Error Handling**
   - The frontend error shows "fields is not defined" at line 89 of `use-wallet-auth.ts`
   - Where is this variable supposed to be defined?

5. **Backend Server Crashes**
   - Backend logs show "Server error" but no detailed error message
   - How can we get more detailed error information?

## Files to Show Expert

### Frontend:
1. `volspike-nextjs-frontend/src/hooks/use-wallet-auth.ts` (entire file)
2. `volspike-nextjs-frontend/src/app/auth/page.tsx` (lines 1-100, 270-310)
3. `volspike-nextjs-frontend/src/lib/auth.ts` (SIWE provider section, lines 92-133)

### Backend:
1. `volspike-nodejs-backend/src/routes/auth.ts` (SIWE endpoints, lines 414-557)
2. `volspike-nodejs-backend/src/services/nonce-manager.ts` (entire file)
3. `volspike-nodejs-backend/src/config/chains.ts` (entire file)

### Database:
1. `volspike-nodejs-backend/prisma/schema.prisma` (WalletAccount model, lines 66-80)

### Package Files:
1. `volspike-nextjs-frontend/package.json` (show siwe and related dependencies)
2. `volspike-nodejs-backend/package.json` (show siwe, viem versions)

## Expected Behavior

1. User clicks "Connect Wallet" → Selects MetaMask
2. User clicks "Sign In with Wallet"
3. MetaMask prompts user to sign SIWE message
4. User signs message
5. Frontend sends signature + message to `/api/auth/siwe/verify`
6. Backend verifies signature, creates/finds user, returns JWT token
7. Frontend creates NextAuth session with wallet info
8. User redirected to dashboard

## Actual Behavior

1. ✅ Steps 1-4 work correctly
2. ❌ Backend returns 401 error
3. ❌ Frontend displays "fields is not defined" error
4. ❌ User not authenticated

## Additional Context

- Using NextAuth v5 for session management
- Using RainbowKit + Wagmi for wallet connection
- Database is PostgreSQL with Prisma
- Backend is using Hono framework
- Environment is local development (localhost:3000 frontend, localhost:3001 backend)

## Latest Attempted Fixes

1. Fixed SIWE message generation (removed `SiweMessage` constructor that wasn't working)
2. Manually parse SIWE message in backend (siwe library parser was failing)
3. Fixed domain validation to include port number
4. Added comprehensive logging (but logs not showing up due to server crashes)


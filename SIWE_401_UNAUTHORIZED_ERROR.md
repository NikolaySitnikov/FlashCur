# SIWE Verification 401 Unauthorized Error

## Current Error
**Frontend Error**: "Verification failed" at `use-wallet-auth.ts:94:15`  
**Backend Response**: `401 Unauthorized` from `/api/auth/siwe/verify`

The CORS issue is now resolved, but the SIWE verification endpoint is returning 401 Unauthorized when trying to verify the signed message.

## Authentication Flow

### Successful Steps (Working ✅)
1. Get nonce from server
2. Get server-prepared SIWE message
3. User signs with MetaMask
4. **Verification fails with 401 ❌**

### Error Location
**Backend**: `/api/auth/siwe/verify` endpoint (lines 472-583 in `auth.ts`)  
**Frontend**: `use-wallet-auth.ts` line 94

## Backend Verification Logic

### Current Implementation (lines 472-583):

```typescript
auth.post('/siwe/verify', async (c) => {
  try {
    const { message, signature } = await c.req.json()
    
    // Parse SIWE message
    const siweMessage = new SiweMessage(message)
    
    // Get nonce from header
    const expectedNonce = c.req.header('X-Wallet-Nonce')  // ❌ PROBLEM: Nonce not sent in header!
    
    // Verify signature
    const result = await siweMessage.verify({
      signature,
      domain: (c.req.header('host') || '').split(':')[0],
      nonce: expectedNonce,  // ❌ This will be undefined
      time: new Date(),
    })
    
    if (!result.success) {
      return c.json({ error: result.error?.type || 'SIWE verification failed' }, 401)
    }
    
    // ... rest of the code
  }
})
```

### Frontend Request (Current):

```typescript
// Line 82-91 in use-wallet-auth.ts
const verifyRes = await fetch(`${API_URL}/api/auth/siwe/verify`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'X-Wallet-Nonce': nonce,  // ✅ Nonce is sent in header
  },
  credentials: 'include',
  body: JSON.stringify({ message: messageToSign, signature }),
})
```

## Problem Identified

The frontend is sending `X-Wallet-Nonce` in the header, but there's a critical issue:

**The nonce from `/siwe/prepare` is different from the nonce stored in nonceManager!**

### Flow Analysis:
1. Frontend calls `/siwe/nonce` → Gets nonce1
2. Frontend calls `/siwe/prepare?address=X&chainId=1` → Backend creates **NEW nonce2** internally, embeds it in message, but doesn't return it
3. Frontend signs message with nonce2
4. Frontend verifies with nonce1 (the wrong nonce!) → **401 Unauthorized**

## Key Issue: Nonce Mismatch

The `/siwe/prepare` endpoint generates a **new nonce** for the message but doesn't return it to the frontend. The frontend then sends the **old nonce** (from `/siwe/nonce`) to `/siwe/verify`, causing verification to fail.

**Line 444 in `/siwe/prepare` endpoint:**
```typescript
const nonce = nonceManager.generate(address, 'evm')  // Creates NEW nonce
// ... creates message with this nonce
return c.json({ message })  // ❌ Doesn't return the nonce!
```

**Then at verification:**
```typescript
const expectedNonce = c.req.header('X-Wallet-Nonce')  // Gets OLD nonce from frontend
// Tries to verify with wrong nonce → FAILS
```

## Expert Questions

### 1. Nonce Management in Server-Prepared Flow
**Q**: In a server-prepared SIWE message flow, where should the nonce be stored and how should it be validated? Should the `/siwe/prepare` endpoint:
- Return the nonce in the response so the frontend can send it back?
- Store it in a session/server state that's accessible to `/siwe/verify`?
- Extract the nonce from the parsed SIWE message at verification time?

### 2. Nonce Extraction from SIWE Message
**Q**: Since the SIWE message already contains the nonce, should we extract it from `siweMessage.nonce` during verification instead of requiring it as a header? Is this secure, or does it introduce replay attack vulnerabilities?

### 3. Session-Based Nonce Storage
**Q**: Should we use server-side session storage for the nonce instead of in-memory nonceManager? This would ensure the nonce persists between the `/prepare` and `/verify` calls.

### 4. Single Nonce vs Multiple Nonces
**Q**: Should `/siwe/nonce` and `/siwe/prepare` share the same nonce, or is it acceptable for `/siwe/prepare` to generate a new one (requiring the server to track it differently)?

### 5. Nonce Validation Timing
**Q**: At what point should the nonce be consumed (marked as used)? Should it happen immediately after verification succeeds, or is there a better pattern?

### 6. Alternative Flow
**Q**: Should we simplify to a two-step flow:
- Frontend gets nonce and prepares message locally?
- Or should prepare always return the nonce it used?

## Files to Show Expert

### 1. **Frontend SIWE Flow**
- `volspike-nextjs-frontend/src/hooks/use-wallet-auth.ts` (lines 54-120)
- Shows how nonce is requested, used in prepare, and sent for verification

### 2. **Backend SIWE Endpoints**
- `volspike-nodejs-backend/src/routes/auth.ts` (lines 414-583)
- Shows `/siwe/nonce`, `/siwe/prepare`, and `/siwe/verify` implementations

### 3. **Nonce Manager**
- `volspike-nodejs-backend/src/services/nonce-manager.ts`
- Shows how nonces are generated, stored, and validated

### 4. **Backend Logs**
- Need to check what nonce value is being used during verification
- What error type is returned from `result.error?.type`

## Hypothesis

The most likely issue is that `/siwe/prepare` generates a new nonce, embeds it in the SIWE message, but doesn't return it or store it in a way that `/siwe/verify` can access it. When verification happens, the backend tries to use a different nonce (or undefined) than what was in the signed message, causing verification to fail.

## Expected Behavior

### Option 1: Return Nonce from Prepare
```typescript
// In /siwe/prepare
const nonce = nonceManager.generate(address, 'evm')
// ... create message with nonce
return c.json({ message, nonce })  // ✅ Return the nonce

// In frontend
const { message, nonce } = await prepRes.json()
// Send nonce in verify request
```

### Option 2: Extract Nonce from Message
```typescript
// In /siwe/verify
const siweMessage = new SiweMessage(message)
const nonce = siweMessage.nonce  // ✅ Extract from message instead of header
const result = await siweMessage.verify({ nonce, ... })
```

### Option 3: Session-Based Nonce
```typescript
// Store nonce in session in /siwe/prepare
req.session.siweNonce = nonce

// Retrieve from session in /siwe/verify
const nonce = req.session.siweNonce
```

## Need Expert Input

Please advise on:
1. **Best practice for nonce management** in server-prepared SIWE flow
2. **Where the nonce should be stored** between prepare and verify
3. **How to extract/validate the nonce** during verification
4. **Security implications** of each approach


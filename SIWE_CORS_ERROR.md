# SIWE CORS Error - Expert Consultation

## Current Error
**Frontend Error**: "Failed to fetch" at `use-wallet-auth.ts:82:31`

The error is a CORS (Cross-Origin Resource Sharing) policy violation. The backend is blocking the request because the `x-wallet-nonce` header is not allowed in the preflight response.

## CORS Policy Error Message
```
Access to fetch at 'http://localhost:3001/api/auth/siwe/verify' from origin 'http://localhost:3000' 
has been blocked by CORS policy: Request header field x-wallet-nonce is not allowed by 
Access-Control-Allow-Headers in preflight response.
```

## Request Flow

**Successful Steps:**
1. ✅ Get nonce from `/api/auth/siwe/nonce` - works fine
2. ✅ Get server-prepared SIWE message from `/api/auth/siwe/prepare` - works fine
3. ✅ Request signature from wallet (MetaMask) - works fine
4. ❌ **Verify signature at `/api/auth/siwe/verify` - blocked by CORS**

## Error Location

**Frontend (`use-wallet-auth.ts` line 82):**
```typescript
const verifyRes = await fetch(`${API_URL}/api/auth/siwe/verify`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'X-Wallet-Nonce': nonce,  // ❌ This header is being blocked
  },
  credentials: 'include',
  body: JSON.stringify({ message: messageToSign, signature }),
})
```

## Investigation Needed

### Current CORS Configuration

We need to check the backend's CORS configuration to see:
1. What headers are currently allowed in `Access-Control-Allow-Headers`
2. What methods are allowed in `Access-Control-Allow-Methods`
3. What origins are allowed in `Access-Control-Allow-Origin`
4. Whether credentials are properly configured

### Backend SIWE Verification Endpoint

The `/api/auth/siwe/verify` endpoint expects:
- `X-Wallet-Nonce` header (for nonce validation)
- `Content-Type: application/json` header
- Request body with `{ message, signature }`

## Expert Questions

### 1. CORS Header Configuration
**Q**: The backend is blocking the `x-wallet-nonce` header. Where is the CORS configuration in our Hono backend? What headers should we explicitly allow in `Access-Control-Allow-Headers` to support SIWE authentication?

### 2. Custom Header Requirements
**Q**: Do we need to modify the CORS middleware to allow custom headers like `x-wallet-nonce`? What's the recommended pattern for Hono?

### 3. Preflight Request Handling
**Q**: The error mentions "preflight response" - is our backend properly handling OPTIONS requests for `/api/auth/siwe/verify`? Should we add explicit OPTIONS handling or update CORS middleware?

### 4. Alternative Approaches
**Q**: Should we:
- Pass the nonce in the request body instead of headers? (current approach uses header)
- Remove the header requirement and validate nonce differently?
- Use a different CORS configuration approach?

### 5. Hono CORS Middleware
**Q**: Are we using Hono's built-in CORS middleware or a third-party CORS library? What configuration options should we use for development vs production?

## Files to Show Expert

### 1. **Backend CORS Configuration**
We need to find where CORS is configured in the backend. This could be in:
- `volspike-nodejs-backend/src/index.ts` (main entry point)
- A middleware file
- Route-specific CORS settings

### 2. **Backend SIWE Verification Endpoint**
- `volspike-nodejs-backend/src/routes/auth.ts` - The `/api/auth/siwe/verify` endpoint
- Show how it currently reads the nonce from headers

### 3. **Frontend Request Configuration**
- `volspike-nextjs-frontend/src/hooks/use-wallet-auth.ts` - The failing fetch request
- Line 82-91 showing headers and request configuration

### 4. **Backend Package.json**
- `volspike-nodejs-backend/package.json` - To see if there's a CORS library installed

## Expected Backend Configuration

We likely need something like this in the backend:

```typescript
// Allow custom headers for SIWE
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Wallet-Nonce',  // ✅ Need to add this
    // ... other headers
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
}

app.use('*', cors(corsOptions))
```

## Current Request Details

**Request URL**: `http://localhost:3001/api/auth/siwe/verify`  
**Request Method**: `POST`  
**Request Headers**:
- `Content-Type: application/json`
- `X-Wallet-Nonce: saf7UY2kxp5aFnGtw`
- `credentials: include` (cookies)

**Response**: Blocked by CORS policy (never reaches backend)

## Alternative Solution Ideas

### Option 1: Pass nonce in request body
Instead of `X-Wallet-Nonce` header:
```typescript
body: JSON.stringify({ 
  message: messageToSign, 
  signature,
  nonce  // ✅ Pass nonce in body instead
})
```

### Option 2: Remove nonce header requirement
Backend could read nonce from the SIWE message itself (it's embedded in the message).

### Option 3: Update CORS configuration
Add `X-Wallet-Nonce` to allowed headers.

## Status

The SIWE flow works perfectly up until the verification step, where CORS blocks the request. We need to either:
1. Configure CORS to allow the custom header
2. Change how the nonce is passed to the backend
3. Use a different approach for nonce validation

All the SIWE logic is working - it's just a CORS configuration issue preventing the final verification request.


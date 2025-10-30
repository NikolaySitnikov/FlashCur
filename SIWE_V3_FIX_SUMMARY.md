# SIWE v3 Fix Summary

## Problem
The "invalid message: max line number was 9" error was caused by hidden newlines (CR/LF) in the SIWE message parameters, which made the parser think it was trying to parse a malformed multi-line message string instead of an object.

## Root Causes
1. **Domain included port**: Using `window.location.host` (e.g., `localhost:3000`) instead of `window.location.hostname` (e.g., `localhost`)
2. **Nonce had hidden characters**: Nonce from backend could contain carriage returns or line feeds
3. **ChainId type mismatch**: Passing chainId as string instead of number
4. **Statement with newlines**: Potential newlines in statement field

## Solution Implemented

### Frontend (`volspike-nextjs-frontend/src/hooks/use-wallet-auth.ts`)

**Changes made:**
1. Changed `domain: window.location.host` → `domain: window.location.hostname` (removes `:3000` port)
2. Added `chainId: Number(chainId)` to ensure numeric type
3. Added `nonce: String(nonce).trim()` to remove CR/LF characters
4. Added safety guard to check for newlines in statement
5. Removed unnecessary `(msg as any)` casting from `prepareMessage()`
6. Added debug logging to show:
   - All SIWE field values
   - Line-by-line breakdown of the generated message string

**Key code:**
```typescript
const msg = new SiweMessage({
  domain: window.location.hostname,        // ✅ NO port
  address,
  statement: 'Sign in with Ethereum to VolSpike.',  // ✅ single-line
  uri: window.location.origin,
  version: '1',
  chainId: Number(chainId),                // ✅ number
  nonce: String(nonce).trim(),             // ✅ no CR/LF
})

// Safety check
if (/\r|\n/.test(msg.statement ?? '')) {
  throw new Error('SIWE statement must be single-line (no newlines).')
}

const messageToSign = msg.prepareMessage() // ✅ v3 API (no casts)
```

### Backend (`volspike-nodejs-backend/src/routes/auth.ts`)

**Changes made:**
1. Changed `time: new Date().toISOString()` → `time: new Date()` (correct v3 format)
2. Domain extraction already correct: `(c.req.header('host') || '').split(':')[0]`

**Key code:**
```typescript
const result = await siweMessage.verify({
  signature,
  domain: (c.req.header('host') || '').split(':')[0], // ✅ no port
  nonce: expectedNonce,
  time: new Date(), // ✅ v3 format (not ISO string)
})
```

## Testing Checklist

1. **Connect MetaMask** to localhost:3000
2. **Click "Sign In with Wallet"**
3. **Check browser console** for:
   - `[SIWE fields]` object with all parameters
   - `[SIWE string lines]` array showing line-by-line message
   - Should see ~9 lines maximum (not including Resources)
4. **Approve signature** in MetaMask
5. **Verify successful login** to dashboard

## Expected Behavior

**Before fix:**
- Error: "invalid message: max line number was 9"
- Wallet authentication fails immediately

**After fix:**
- SIWE message generated successfully
- Line count confirms ~9 lines (standard EIP-4361 format)
- MetaMask signature prompt appears
- Authentication succeeds and redirects to dashboard

## Debug Output

**SIWE fields:**
```javascript
{
  domain: "localhost",
  address: "0x79F7b7776E44c06C2F6721D65AFba10B10147807",
  uri: "http://localhost:3000",
  version: "1",
  chainId: 1,
  nonce: "bdec91ae-3e97-4637-a96b-2fd53c04d7d6",
  statement: "Sign in with Ethereum to VolSpike."
}
```

**SIWE string lines:**
```javascript
[
  "1: localhost wants you to sign in with your Ethereum account:",
  "2: 0x79F7b7776E44c06C2F6721D65AFba10B10147807",
  "3: ",
  "4: Sign in with Ethereum to VolSpike.",
  "5: ",
  "6: URI: http://localhost:3000",
  "7: Version: 1",
  "8: Chain ID: 1",
  "9: Nonce: bdec91ae-3e97-4637-a96b-2fd53c04d7d6",
  "10: Issued At: 2025-10-30T00:04:19.929Z"
]
```

## Files Modified
- `volspike-nextjs-frontend/src/hooks/use-wallet-auth.ts`
- `volspike-nodejs-backend/src/routes/auth.ts`
- `SIWE_V3_ISSUE_REPORT.md` (created)

## Next Steps
1. Test wallet authentication locally
2. Verify line count in console (should be ~10 lines including "Issued At")
3. Confirm successful sign-in to dashboard
4. Deploy to production once testing passes


# SIWE v3 Persistent Error - Expert Consultation

## Current Error
**Frontend Error**: "invalid message: max line number was 9" at `use-wallet-auth.ts:58:19`

The error is still occurring when calling `new SiweMessage({...})` despite implementing all previous fixes. The `siwe-parser` library appears to be interpreting the input as a malformed multi-line string, even though we're passing an object.

## Call Stack
```
at new ParsedMessage (node_modules/@spruceid/siwe-parser/dist/abnf.js:92:1)
at new SiweMessage (node_modules/siwe/dist/client.js:53:1)
at signInWithWallet (src/hooks/use-wallet-auth.ts:58:19)
```

## Error Details (JSON)
```json
{
  "success": false,
  "state": 103,
  "length": 268,
  "matched": 0,
  "maxMatched": 204,
  "maxTreeDepth": 18,
  "nodeHits": 686,
  "inputLength": 268,
  "subBegin": 0,
  "subEnd": 268,
  "subLength": 268
}
```

## Previous Fixes Already Implemented ✅

### Frontend (`use-wallet-auth.ts` lines 58-73):
```typescript
const msg = new SiweMessage({
  domain: window.location.hostname,        // ✅ hostname only (NO port)
  address,
  statement: 'Sign in with Ethereum to VolSpike.',  // ✅ single-line (no \n)
  uri: window.location.origin,
  version: '1',
  chainId: Number(chainId),                // ✅ ensure number
  nonce: String(nonce).trim(),             // ✅ strip CR/LF
})

// Safety guard
if (/\r|\n/.test(msg.statement ?? '')) {
  throw new Error('SIWE statement must be single-line (no newlines).')
}

const messageToSign = msg.prepareMessage() // v3 ✅ (no casts)
```

### Backend (`auth.ts` line 447-452):
```typescript
const result = await siweMessage.verify({
  signature,
  domain: (c.req.header('host') || '').split(':')[0], // ✅ no port
  nonce: expectedNonce,
  time: new Date(), // ✅ v3 format
})
```

## Current State

**Console Logs Sequence:**
1. `[useWalletAuth] Starting sign-in, address: 0x79F7b7776E44c06C2F6721D65AFba10B10147807 chainId: 1`
2. `[useWalletAuth] Got nonce: bdec91ae-3e97-4637-a96b-2fd53c04d7d6`
3. **Error occurs immediately after nonce retrieval**
4. `[useWalletAuth] Error: Error: invalid message: max line number was 9`

**Note:** The debug logs (`[SIWE fields]` and `[SIWE string lines]`) that were added in the previous fix are **NOT appearing**, which means the error is occurring **before** `msg.prepareMessage()` is called. This indicates the error is happening **inside the SiweMessage constructor itself**, not when generating the message string.

## Key Observation

The error is occurring **inside the `SiweMessage` constructor** at line 58, which means:
- One or more of the object properties is being interpreted as a raw SIWE message string
- There might be hidden characters or unexpected values in the parameters
- The parser's ABNF grammar is failing to parse the input at the lexical level

## Expert Questions

### 1. Constructor Behavior with Objects
**Q**: The error "invalid message: max line number was 9" is still occurring at `new SiweMessage({...})` despite our fixes. Could the constructor be misinterpreting one of the properties (e.g., `address`, `statement`, `uri`, `domain`, `nonce`) as a raw SIWE message string if it contains certain characters or patterns? What triggers the constructor to parse object properties as strings?

### 2. Hidden Characters in Parameters
**Q**: Even after trimming the nonce and ensuring a single-line statement, could there be hidden unicode characters, zero-width spaces, or non-printable characters in the `address`, `chainId`, `uri`, `version`, or `nonce` parameters that are causing the parser to fail at the lexical level? How can we detect and sanitize these?

### 3. Property Name Conflicts
**Q**: The previous guidance warned against passing a property named `message` to the constructor. While we're not explicitly doing this, is it possible that one of the other property names (`statement`, `uri`, `domain`, `nonce`) or their values could be triggering the parser to expect a raw message string instead of an object?

### 4. Parser Sensitivity
**Q**: Given the call stack points to `@spruceid/siwe-parser/dist/abnf.js` and the error state is `103`, are there specific characters, patterns, or data types that this ABNF parser is known to be highly sensitive to? What does error state `103` specifically indicate in the siwe parser?

### 5. Next.js/Wagmi Environment Issues
**Q**: Are there any known compatibility issues with `siwe` v3 in Next.js environments or when used with `wagmi`, particularly related to:
- How `window.location.hostname` or `window.location.origin` are resolved
- How `chainId` is provided by wagmi (could it have unexpected type or value?)
- How the nonce is handled between frontend and backend (base64url vs hex)?

### 6. Constructor Parameter Type Checking
**Q**: What are the exact expected types for each parameter in the `SiweMessage` constructor object? Could type mismatches (e.g., chainId not being a pure number, domain containing special characters) cause the constructor to fail with this specific error?

### 7. Debug Logging Before Constructor
**Q**: Should we log each parameter individually before constructing the `SiweMessage` to inspect for hidden characters? What's the best way to sanitize and validate each field before passing it to the constructor?

## Files to Show Expert

### 1. **`volspike-nextjs-frontend/src/hooks/use-wallet-auth.ts`**
   - Lines 54-90 (the entire SIWE message construction block)
   - Shows current implementation with all fixes applied

### 2. **`volspike-nodejs-backend/src/routes/auth.ts`**
   - Lines 415-430 (nonce generation endpoint)
   - Lines 433-470 (SIWE verification endpoint)
   - To check if backend nonce generation is introducing issues

### 3. **`volspike-nextjs-frontend/package.json`**
   - To confirm exact `siwe` version on frontend
   - To check `wagmi` and related dependency versions

### 4. **`volspike-nodejs-backend/package.json`**
   - To confirm exact `siwe` version on backend
   - To check `viem` version

### 5. **Console Debug Output (if available)**
   - Raw parameter values before passing to `new SiweMessage({...})`
   - Hex dumps or character inspection of each parameter
   - Browser console showing the exact error and call stack

## Diagnostic Data Needed

Please provide:
1. **Exact SIWE version** from both frontend and backend package.json
2. **Output of pre-constructor logging** for each parameter:
   ```javascript
   console.log('domain type:', typeof domain, 'value:', JSON.stringify(domain))
   console.log('address type:', typeof address, 'value:', JSON.stringify(address))
   console.log('chainId type:', typeof chainId, 'value:', JSON.stringify(chainId))
   console.log('nonce type:', typeof nonce, 'value:', JSON.stringify(nonce))
   ```
3. **Character inspection** of nonce (to detect hidden unicode/CR/LF)
4. **wagmi version** and how it provides `chainId` to `useAccount()`

## Expected Behavior vs Actual

**Expected:**
- `new SiweMessage({...})` creates the object successfully
- `msg.prepareMessage()` generates the SIWE message string
- Debug logs show SIWE fields and line count

**Actual:**
- `new SiweMessage({...})` throws "invalid message: max line number was 9"
- Error occurs inside the constructor, before `prepareMessage()` is called
- Debug logs never appear

## Hypothesis

The siwe v3 `SiweMessage` constructor may have changed behavior or expects a different object shape. The error suggests the constructor is receiving something that makes it think it's parsing a malformed message string (268 characters long, max line 9) rather than processing an object with valid fields.


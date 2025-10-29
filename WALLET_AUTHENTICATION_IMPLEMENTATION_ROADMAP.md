# Web3 Wallet Authentication Implementation Roadmap
## VolSpike - Crypto Wallet Sign-In/Sign-Up Plan

---

## Current State Analysis

### What's Already Implemented

**Infrastructure (✅ Good)**
- **RainbowKit + Wagmi**: Latest versions configured with dark theme matching VolSpike branding
- **WalletConnect v2**: Configured with project ID for cross-wallet compatibility
- **Supported Chains**: Ethereum (Mainnet, Polygon, Optimism, Arbitrum, Base)
- **ConnectButton**: Present but not fully integrated with authentication flow
- **Backend SIWE Endpoint**: `/api/auth/siwe` exists but not fully implemented (no signature verification)

**Current Issues (⚠️ Critical)**

1. **ConnectButton is present but doesn't trigger authentication**
   - Button renders in header when not logged in
   - Connects wallet but doesn't create NextAuth session
   - User remains unauthenticated after wallet connection

2. **No SIWE (Sign-In with Ethereum) implementation**
   - Backend has a `/siwe` endpoint but:
     - Doesn't verify signatures
     - Creates temporary email (`${address}@volspike.local`)
     - Not integrated with NextAuth

3. **No wallet address in session**
   - `useUserIdentity` hook sets `address: null` (line 26)
   - No Wagmi hooks integrated for wallet address retrieval

4. **Missing Solana/Phantom support**
   - Only EVM chains configured (Ethereum ecosystem)
   - No Solana support = no Phantom wallet support

**What Works**
- Wallet connection UI (RainbowKit modal)
- Wallet switching and network selection
- WalletConnect deep links for mobile wallets
- Branding matches VolSpike design

---

## Recommendations & Best Practices (2025)

### 1. Multi-Chain Support Strategy

**Current State**: EVM-only (Ethereum, Polygon, Optimism, Arbitrum, Base)

**Recommendation**: **Hybrid Approach**

- **Phase 1 (MVP)**: Implement **EVM-only** wallet auth (Metamask, WalletConnect)
  - Solana can come later (different ecosystem, additional complexity)
  - EVM covers 80%+ of crypto users
  - Smaller code surface area = fewer bugs

- **Phase 2 (Future)**: Add Solana with separate integration
  - Use `@solana/wallet-adapter-react`
  - Requires additional backend support for Solana signatures
  - Different signing patterns (not SIWE-compatible)

**Best Practice for MVP**: Focus on EVM ecosystem first. Add Solana later when user demand is proven.

### 2. Sign-In with Ethereum (SIWE) Implementation

**Best Practice (2025)**: Implement **proper SIWE** instead of simplified wallet auth.

**Why SIWE?**
- **Industry Standard**: EIP-4361 is the accepted standard for Web3 authentication
- **Security**: Message signing proves wallet ownership without exposing private keys
- **User Experience**: Users sign a message once, get authenticated seamlessly
- **Compatibility**: Works with all EVM wallets (Metamask, WalletConnect, Coinbase Wallet, etc.)

**SIWE Flow:**
1. User clicks "Connect Wallet"
2. RainbowKit modal opens, user connects wallet
3. App generates SIWE message with domain, timestamp, nonce, wallet address
4. User signs message with wallet
5. Frontend sends signature + message to backend `/api/auth/siwe`
6. Backend verifies signature against message and address
7. Backend returns JWT token + user data
8. Frontend creates NextAuth session with wallet data
9. User is authenticated

**Library Choice**:
- Use `siwe` npm package for message generation and verification
- Backend: Verify signatures server-side for security
- Frontend: Use Wagmi's `useSignMessage` hook for signing

### 3. Wallet Address in Session

**Best Practice**: Store wallet address in NextAuth session.

**Implementation**:
- Backend returns `walletAddress` in JWT payload
- NextAuth callback adds `walletAddress` to session token
- Session type includes `walletAddress: string | null`
- `useUserIdentity` retrieves from session (no Wagmi dependency)

**Benefits**:
- Works on server-side rendered pages
- Persists across page refreshes
- No hydration issues
- Clean separation: Wagmi for wallet connection, NextAuth for auth state

### 4. User Account Linking

**Best Practice**: Allow users to link multiple wallets to same account.

**Implementation**:
- Wallet address stored in `users.walletAddress` (first wallet)
- Additional wallets stored in separate table (e.g., `linkedWallets`)
- Allow users to add/remove linked wallets from settings
- All linked wallets can authenticate the same account

**User Experience**:
- First wallet: Create account with that wallet
- Additional wallets: Link via settings page with a signing step
- Sign in: Any linked wallet authenticates the account

### 5. UI/UX Best Practices

**Connect Button Placement**:
- Current: Shows when not logged in (good)
- Add: Show in user dropdown menu when authenticated (for wallet management)

**Wallet Indicator**:
- Display wallet address in profile dropdown (truncated format)
- Show network/chain in header (optional)
- Display wallet balance in settings (optional, nice-to-have)

**Error Handling**:
- Handle wallet not installed (show install prompt)
- Handle wrong network (show network switch prompt)
- Handle signature rejection (graceful handling)
- Handle connection timeout (retry mechanism)

**Loading States**:
- Show spinner during connection
- Show "Signing message..." during SIWE signature
- Disable UI while processing

### 6. Phantom Wallet Consideration

**Important**: Phantom is Solana-only, not EVM.

**Options**:
1. **Add Solana support** (significant work)
   - Requires separate authentication flow (not SIWE)
   - Different signature format
   - Separate backend endpoint

2. **Recommend EVM wallet** (easier for MVP)
   - Many users have both MetaMask and Phantom
   - Can support Phantom in Phase 2

**Recommendation for MVP**: **Focus on EVM ecosystem** (MetaMask, WalletConnect) and add Phantom later if there's demand.

---

## Detailed Implementation Plan

### Phase 1: EVM Wallet Authentication (Metamask, WalletConnect)

#### Step 1: Install Dependencies

**Packages to Add**:
```bash
cd volspike-nextjs-frontend
npm install siwe
```

**Backend Packages**:
```bash
cd volspike-nodejs-backend
npm install siwe ethereumjs-util  # For signature verification
```

#### Step 2: Create Wallet Authentication Hook

**File**: `volspike-nextjs-frontend/src/hooks/use-wallet-auth.ts` (new)

**Purpose**: Handle wallet connection and SIWE signing flow

**Implementation**:
```typescript
'use client'

import { useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { signIn } from 'next-auth/react'
import { generateNonce, generateMessage, verifyMessage } from 'siwe'
import { SiweMessage } from 'siwe'

interface UseWalletAuthResult {
    isConnecting: boolean
    isSigning: boolean
    isAuthenticating: boolean
    error: string | null
    connect: () => Promise<void>
}

export function useWalletAuth(): UseWalletAuthResult {
    const { address, isConnected } = useAccount()
    const { signMessageAsync } = useSignMessage()
    const [isConnecting, setIsConnecting] = useState(false)
    const [isSigning, setIsSigning] = useState(false)
    const [isAuthenticating, setIsAuthenticating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const connect = async () => {
        try {
            setError(null)
            setIsConnecting(true)

            // Step 1: Check if wallet is connected
            if (!isConnected || !address) {
                throw new Error('Please connect your wallet first')
            }

            // Step 2: Get nonce from backend
            const nonceResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/siwe/nonce`, {
                method: 'GET',
            })
            const { nonce } = await nonceResponse.json()

            // Step 3: Generate SIWE message
            const message = generateMessage({
                domain: window.location.host,
                address,
                statement: 'Sign in to VolSpike',
                uri: window.location.origin,
                version: '1',
                chainId: 1, // Mainnet, or detect from wagmi
                nonce,
            })

            // Step 4: Sign message with wallet
            setIsSigning(true)
            setIsConnecting(false)

            const signature = await signMessageAsync({
                message,
            })

            // Step 5: Send to backend for verification
            setIsSigning(false)
            setIsAuthenticating(true)

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/siwe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    signature,
                    address,
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Authentication failed')
            }

            const { token, user } = await response.json()

            // Step 6: Create NextAuth session
            await signIn('credentials', {
                redirect: false,
                email: user.email,
                walletAddress: user.walletAddress,
                token,
            })

            // Step 7: Redirect to dashboard
            window.location.href = '/dashboard'
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to authenticate')
        } finally {
            setIsConnecting(false)
            setIsSigning(false)
            setIsAuthenticating(false)
        }
    }

    return {
        isConnecting,
        isSigning,
        isAuthenticating,
        error,
        connect,
    }
}
```

#### Step 3: Update Backend SIWE Endpoint

**File**: `volspike-nodejs-backend/src/routes/auth.ts`

**Changes Required**:

1. **Add nonce endpoint** (before existing `/siwe` route):
```typescript
// Generate nonce for SIWE
auth.get('/siwe/nonce', async (c) => {
    const nonce = generateNonce()
    
    // Store nonce in memory or database (with TTL)
    // For production, use Redis or database
    nonceStore.set(nonce, Date.now())
    
    return c.json({ nonce })
})
```

2. **Update existing `/siwe` endpoint** with proper signature verification:

```typescript
auth.post('/siwe', async (c) => {
    try {
        const body = await c.req.json()
        const { message, signature, address } = siweSchema.parse(body)

        // Verify signature using siwe library
        const siweMessage = new SiweMessage(message)
        const fields = await siweMessage.validate(signature)

        if (fields.nonce === nonceStore.get(fields.nonce) || /* check age */) {
            // Remove used nonce
            nonceStore.delete(fields.nonce)

            // Verify domain matches
            if (fields.domain !== process.env.FRONTEND_URL) {
                return c.json({ error: 'Invalid domain' }, 401)
            }

            // Find or create user by wallet address
            let user = await prisma.user.findUnique({
                where: { walletAddress: address },
            })

            if (!user) {
                // Create new user with wallet
                user = await prisma.user.create({
                    data: {
                        walletAddress: address,
                        email: `${address}@volspike.local`,
                        tier: 'free',
                        emailVerified: new Date(), // Wallet users are auto-verified
                    },
                })
            } else if (!user.emailVerified) {
                // Update existing user if needed
                await prisma.user.update({
                    where: { id: user.id },
                    data: { emailVerified: new Date() },
                })
            }

            const token = await generateToken(user.id)

            logger.info(`User ${address} authenticated with wallet`)

            return c.json({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    tier: user.tier,
                    emailVerified: user.emailVerified,
                    refreshInterval: user.refreshInterval,
                    theme: user.theme,
                    walletAddress: user.walletAddress,
                    role: user.role,
                    status: user.status,
                    twoFactorEnabled: user.twoFactorEnabled,
                },
            })
        } else {
            return c.json({ error: 'Invalid nonce' }, 401)
        }
    } catch (error) {
        logger.error('SIWE error:', error)
        return c.json({ error: 'Invalid signature' }, 401)
    }
})
```

3. **Add nonce storage** (simple in-memory for MVP):

```typescript
// Simple in-memory nonce store (use Redis in production)
const nonceStore = new Map<string, number>()

// Cleanup expired nonces periodically
setInterval(() => {
    const now = Date.now()
    for (const [nonce, timestamp] of nonceStore.entries()) {
        if (now - timestamp > 60000) { // 1 minute TTL
            nonceStore.delete(nonce)
        }
    }
}, 30000) // Run every 30 seconds
```

#### Step 4: Integrate with NextAuth

**File**: `volspike-nextjs-frontend/src/lib/auth.ts`

**Add SIWE provider** (add to providers array):

```typescript
CredentialsProvider({
    name: 'siwe',
    credentials: {
        email: { label: 'Email', type: 'text' },
        walletAddress: { label: 'Wallet Address', type: 'text' },
        token: { label: 'Token', type: 'text' },
    },
    async authorize(credentials) {
        if (!credentials?.walletAddress || !credentials?.token) {
            return null
        }

        // Token is already verified by backend
        // Just return user data for session
        try {
            const response = await fetch(`${BACKEND_API_URL}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${credentials.token}`,
                },
            })

            if (!response.ok) {
                return null
            }

            const user = await response.json()

            return {
                id: user.id,
                email: user.email || credentials.email,
                name: credentials.walletAddress,
                walletAddress: user.walletAddress,
                tier: user.tier,
                emailVerified: user.emailVerified,
                role: user.role,
                status: user.status,
                twoFactorEnabled: user.twoFactorEnabled,
                accessToken: credentials.token,
            }
        } catch (error) {
            console.error('[NextAuth] SIWE authorization error:', error)
            return null
        }
    }
})
```

**Update session callback** to include wallet address:

```typescript
async session({ session, token }: any) {
    if (token && session.user) {
        session.user.id = token.id
        session.user.email = token.email
        session.user.name = session.user.name || token.email?.split('@')[0] || 'VolSpike User'
        session.user.tier = token.tier
        session.user.emailVerified = token.emailVerified
        session.user.role = token.role
        session.user.status = token.status
        session.user.twoFactorEnabled = token.twoFactorEnabled
        session.user.walletAddress = token.walletAddress // Add this
        session.accessToken = token.accessToken
    }
    return session
}
```

**Update JWT callback** to include wallet address:

```typescript
async jwt({ token, user, account }: any) {
    if (user) {
        token.id = user.id
        token.email = user.email
        token.tier = user.tier
        token.emailVerified = user.emailVerified
        token.role = user.role
        token.status = user.status
        token.twoFactorEnabled = user.twoFactorEnabled
        token.accessToken = user.accessToken
        token.walletAddress = user.walletAddress // Add this
    }
    return token
}
```

#### Step 5: Update User Identity Hook

**File**: `volspike-nextjs-frontend/src/hooks/use-user-identity.ts`

**Changes**: Get wallet address from session instead of Wagmi

```typescript
export function useUserIdentity(): UserIdentity {
    const { data: session, status: sessionStatus } = useSession()
    const isLoading = sessionStatus === 'loading'

    const identity = useMemo(() => {
        const email = session?.user?.email || null
        const walletAddress = (session?.user as any)?.walletAddress || null // Get from session

        let displayName = 'User'
        if (session?.user?.name) {
            displayName = session.user.name
        } else if (email) {
            displayName = email
        } else if (walletAddress) {
            displayName = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
        }

        return {
            displayName,
            email,
            address: walletAddress,
            ens: null, // TODO: Add ENS resolution if needed
            role: session?.user?.role || null,
            tier: session?.user?.tier || null,
            image: session?.user?.image || null,
            isLoading,
        }
    }, [session, isLoading])

    return identity
}
```

#### Step 6: Update TypeScript Types

**File**: `volspike-nextjs-frontend/src/types/next-auth.d.ts`

**Add walletAddress to Session and User interfaces**:

```typescript
interface Session {
    user: {
        id: string
        email: string
        name?: string
        image?: string
        tier?: 'free' | 'pro' | 'elite'
        role?: 'USER' | 'ADMIN'
        status?: 'ACTIVE' | 'SUSPENDED' | 'BANNED'
        twoFactorEnabled?: boolean
        walletAddress?: string  // Add this
    }
    accessToken?: string
}
```

#### Step 7: Update UserMenu to Show Wallet Address

**File**: `volspike-nextjs-frontend/src/components/user-menu.tsx`

**Add wallet address display in dropdown** (after email, before tier badge):

```typescript
{/* Add after email display, before tier badge */}
{identity.address && (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Wallet className="h-3 w-3" />
        <span className="font-mono">{identity.address.slice(0, 6)}...{identity.address.slice(-4)}</span>
    </div>
)}
```

**Add copy wallet address action** (in menu items):

```typescript
{identity.address && (
    <DropdownMenuItem onClick={() => handleCopy(identity.address!, 'Wallet address')}>
        <Wallet className="h-4 w-4 mr-2" />
        Copy wallet address
    </DropdownMenuItem>
)}
```

#### Step 8: Update Auth Page to Integrate Wallet Auth

**File**: `volspike-nextjs-frontend/src/app/auth/page.tsx`

**Import and use `useWalletAuth` hook**:

```typescript
import { useWalletAuth } from '@/hooks/use-wallet-auth'

// Inside AuthPageContent component:
const { isConnecting, isSigning, isAuthenticating, error: walletError, connect } = useWalletAuth()
const { isConnected } = useAccount()

// Update DynamicConnectButton section:
<div className="space-y-3">
    <DynamicConnectButton />
    
    {/* Show authenticate button after wallet connects */}
    {isConnected && (
        <Button
            onClick={connect}
            disabled={isConnecting || isSigning || isAuthenticating}
            className="w-full bg-gradient-to-r from-green-500 via-emerald-400 to-green-500 text-white"
        >
            {isAuthenticating ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                </>
            ) : isSigning ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sign message in wallet...
                </>
            ) : (
                'Sign In with Wallet'
            )}
        </Button>
    )}
    
    {/* Show wallet error if any */}
    {walletError && (
        <p className="text-xs text-red-400">{walletError}</p>
    )}
</div>
```

#### Step 9: Update Header to Show Wallet Info When Authenticated

**File**: `volspike-nextjs-frontend/src/components/header.tsx`

**Add wallet address display in header** (optional, keep minimal):

```typescript
{/* Show wallet address if user authenticated with wallet */}
{session?.user && (session.user as any).walletAddress && (
    <span className="hidden text-xs text-muted-foreground sm:inline font-mono">
        {(session.user as any).walletAddress.slice(0, 6)}...{(session.user as any).walletAddress.slice(-4)}
    </span>
)}
```

---

### Phase 2: Solana/Phantom Support (Future)

**This is a separate implementation** when there's proven demand.

**Requirements**:
- Install `@solana/wallet-adapter-react` and related packages
- Add Solana RPC endpoint configuration
- Create separate Solana authentication endpoint (not SIWE)
- Implement Solana signature verification in backend
- Add Solana chain detection and handling
- Update UI to support both EVM and Solana wallets

**Estimated Effort**: 2-3 days of development

**Recommendation**: Defer until Phase 1 (EVM) is proven and stable.

---

## Testing Plan

### Test 1: Connect Wallet

**Steps**:
1. Navigate to `https://volspike.com/auth`
2. Scroll down to "Connect Wallet" button
3. Click button
4. Wallet modal should open

**Expected Results**:
- ✅ RainbowKit modal opens
- ✅ Lists available wallets (MetaMask, WalletConnect, Coinbase, etc.)
- ✅ User can select wallet
- ✅ Connection prompts appear in wallet

### Test 2: Sign In with New Wallet

**Steps**:
1. Connect wallet (MetaMask or WalletConnect)
2. Click "Sign In with Wallet" button (appears after connection)
3. Sign the SIWE message in wallet
4. Wait for authentication

**Expected Results**:
- ✅ "Sign message in wallet..." loading state appears
- ✅ Wallet prompts for message signing
- ✅ After signing, "Authenticating..." state appears
- ✅ User redirected to dashboard
- ✅ Session created successfully
- ✅ User email shows as `${walletAddress}@volspike.local`
- ✅ Wallet address visible in profile dropdown

### Test 3: Sign In with Existing Wallet

**Steps**:
1. Sign out if already logged in
2. Connect the same wallet used previously
3. Click "Sign In with Wallet"
4. Sign message

**Expected Results**:
- ✅ No new user account created
- ✅ Sign in to existing account
- ✅ Dashboard loads correctly
- ✅ User tier/personalization persists

### Test 4: Connect Button State Management

**Steps**:
1. Connect wallet but don't sign in
2. Refresh page
3. Check wallet connection state
4. Sign in
5. Check header shows wallet info

**Expected Results**:
- ✅ Wallet connection persists across refresh
- ✅ "Sign In with Wallet" button appears when connected
- ✅ After sign-in, ConnectButton hides
- ✅ Profile menu shows wallet address

### Test 5: Multiple Wallets

**Steps**:
1. Sign in with Wallet A
2. Sign out
3. Connect different Wallet B
4. Sign in

**Expected Results**:
- ✅ Creates separate account for Wallet B
- ✅ Accounts are independent
- ✅ Can switch between wallets seamlessly

### Test 6: Error Handling - Wallet Not Installed

**Steps**:
1. Open auth page in browser without any wallet installed
2. Click "Connect Wallet"
3. Check behavior

**Expected Results**:
- ✅ RainbowKit shows "Get Wallet" prompt
- ✅ Provides download links for MetaMask, etc.
- ✅ No errors or crashes

### Test 7: Error Handling - Signature Rejection

**Steps**:
1. Connect wallet
2. Click "Sign In with Wallet"
3. Reject signature in wallet popup
4. Check error handling

**Expected Results**:
- ✅ Error message: "Signature rejected"
- ✅ Can retry signing
- ✅ No crash or broken state

### Test 8: Error Handling - Network Switch

**Steps**:
1. Connect wallet on one network (e.g., Polygon)
2. Switch to different network (e.g., Mainnet)
3. Try to sign in

**Expected Results**:
- ✅ Handles network switching gracefully
- ✅ Possibly detects network and adjusts accordingly
- ✅ No errors on network mismatch (if supporting multiple networks)

### Test 9: Database Verification

**Steps**:
1. Sign in with new wallet
2. Check database records

**Expected Results**:
- ✅ User created in `users` table
- ✅ `walletAddress` field populated
- ✅ `emailVerified` set to current timestamp
- ✅ `email` is `${address}@volspike.local`
- ✅ No password hash (wallet-only user)

### Test 10: Session Persistence

**Steps**:
1. Sign in with wallet
2. Close browser
3. Reopen and navigate to dashboard

**Expected Results**:
- ✅ Session persists (JWT token in httpOnly cookie)
- ✅ Dashboard loads without re-authentication
- ✅ Wallet address available in session

### Test 11: Sign Out and Reconnect

**Steps**:
1. Sign in with wallet
2. Sign out
3. Connect same wallet again
4. Sign in

**Expected Results**:
- ✅ No duplicate user created
- ✅ Signs in to same account as before
- ✅ Tier and settings preserved

### Test 12: Mobile Wallet Connection

**Steps**:
1. Open auth page on mobile device
2. Click "Connect Wallet"
3. Select WalletConnect
4. Scan QR code with mobile wallet
5. Sign in

**Expected Results**:
- ✅ QR code displays correctly
- ✅ Deep link opens wallet app
- ✅ Connection established successfully
- ✅ Sign in flow works on mobile

### Test 13: Concurrent Sessions

**Steps**:
1. Sign in with wallet on Device A
2. Open different browser/Device B
3. Connect same wallet
4. Sign in

**Expected Results**:
- ✅ Both devices authenticated
- ✅ Both sessions active simultaneously
- ✅ No conflicts or logout from first device

### Test 14: Profile Menu with Wallet

**Steps**:
1. Sign in with wallet
2. Click profile icon
3. Check wallet address display

**Expected Results**:
- ✅ Wallet address shown (truncated: `0xAbC...XyZ`)
- ✅ "Copy wallet address" menu item available
- ✅ Copy functionality works
- ✅ Toast notification confirms copy

### Test 15: Settings Page with Wallet

**Steps**:
1. Sign in with wallet
2. Navigate to settings page
3. Check wallet address display

**Expected Results**:
- ✅ Wallet address displayed prominently
- ✅ No email (or shows temp email)
- ✅ Can add/link additional wallets (future feature)

### Test 16: Wallet Auth + Email Auth in Same Session

**Steps**:
1. Sign in with email/password
2. Navigate to dashboard
3. Connect wallet (should this work?)

**Expected Results**:
- ✅ TBD: Decide if we allow linking wallets to email accounts
- ✅ For now: Maybe show message "Already authenticated" and don't allow wallet connection

### Test 17: Responsive Design

**Steps**:
1. Test wallet connection on mobile (375x667)
2. Test on tablet (768x1024)
3. Test on desktop (1920x1080)

**Expected Results**:
- ✅ Wallet modal responsive on all screen sizes
- ✅ Sign message flow works on mobile
- ✅ Profile menu shows wallet address correctly
- ✅ Touch targets adequate on mobile

### Test 18: No Regression Testing

**Steps**:
1. Test all existing authentication flows (email, Google)
2. Test dashboard functionality
3. Test admin panel (if applicable)

**Expected Results**:
- ✅ Email/password login still works
- ✅ Google OAuth still works
- ✅ Dashboard loads correctly
- ✅ Market data displays
- ✅ No existing functionality broken

### Test 19: Performance Testing

**Steps**:
1. Measure time from wallet connection to dashboard
2. Check bundle size impact of SIWE library

**Expected Results**:
- ✅ Sign in completes within 3-5 seconds
- ✅ No significant bundle size increase (<50KB)
- ✅ No memory leaks on repeated connections

### Test 20: Security Testing

**Steps**:
1. Test with invalid signature (modify signature in request)
2. Test with expired nonce
3. Test with wrong domain
4. Test with replay attack (same signature twice)

**Expected Results**:
- ✅ Invalid signatures rejected
- ✅ Expired nonces rejected
- ✅ Domain verification works
- ✅ Replay attacks prevented (nonce used once only)

---

## Implementation Checklist

### Phase 1: Setup and Core Functionality

- [ ] Install `siwe` package in frontend
- [ ] Install `siwe` and `ethereumjs-util` in backend
- [ ] Create `use-wallet-auth.ts` hook
- [ ] Add nonce endpoint to backend (`/api/auth/siwe/nonce`)
- [ ] Update backend `/api/auth/siwe` with signature verification
- [ ] Add nonce storage (in-memory for MVP)
- [ ] Add SIWE provider to NextAuth config
- [ ] Update NextAuth session callback to include walletAddress
- [ ] Update NextAuth JWT callback to include walletAddress
- [ ] Update TypeScript types for walletAddress in session
- [ ] Update `use-user-identity` to get address from session
- [ ] Integrate `useWalletAuth` in auth page
- [ ] Add "Sign In with Wallet" button after connection
- [ ] Update header to show wallet info when authenticated
- [ ] Update UserMenu to display wallet address
- [ ] Add "Copy wallet address" functionality

### Phase 2: Error Handling

- [ ] Handle wallet not installed case
- [ ] Handle signature rejection
- [ ] Handle network switching
- [ ] Handle connection timeout
- [ ] Handle nonce expiration
- [ ] Display error messages to user

### Phase 3: UI Polish

- [ ] Add loading states (connecting, signing, authenticating)
- [ ] Style ConnectButton to match VolSpike branding
- [ ] Add wallet icon in profile menu
- [ ] Update settings page to show wallet address
- [ ] Add visual indicator for wallet-connected users
- [ ] Ensure responsive design on mobile/tablet

### Phase 4: Testing

- [ ] Test with MetaMask
- [ ] Test with WalletConnect
- [ ] Test with Coinbase Wallet
- [ ] Test on mobile devices
- [ ] Test error scenarios
- [ ] Test concurrent sessions
- [ ] Test security (signature verification)
- [ ] Test no regressions (email, Google auth)

### Phase 5: Documentation

- [ ] Update AGENTS.md with wallet auth details
- [ ] Update OVERVIEW.md with wallet auth flow
- [ ] Add wallet auth to testing guide
- [ ] Document environment variables needed

---

## Environment Variables Needed

### Frontend (.env.local)
```bash
# Already have these:
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id

# No new variables needed
```

### Backend (.env)
```bash
# Already have these:
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-secret

# No new variables needed
```

---

## Files to Modify

1. **Frontend**:
   - `src/hooks/use-wallet-auth.ts` - NEW FILE
   - `src/lib/auth.ts` - Add SIWE provider and session updates
   - `src/types/next-auth.d.ts` - Add walletAddress type
   - `src/hooks/use-user-identity.ts` - Get wallet from session
   - `src/app/auth/page.tsx` - Integrate wallet auth hook
   - `src/components/user-menu.tsx` - Display wallet address
   - `src/components/header.tsx` - Show wallet info (optional)

2. **Backend**:
   - `src/routes/auth.ts` - Add nonce endpoint, update SIWE endpoint
   - `src/index.ts` - Add nonce cleanup interval (if needed)

---

## Risk Assessment

**Low Risk**:
- Changes are isolated to authentication flow
- Using proven libraries (siwe, RainbowKit)
- Following industry standards (EIP-4361)

**Medium Risk**:
- Signature verification must be correct
- Nonce management must prevent replay attacks
- Error handling must be comprehensive

**Mitigation**:
- Use `siwe` library for signature verification (tested code)
- Store nonces with TTL (time-to-live)
- Implement comprehensive error handling
- Test with multiple wallets before production

---

## Success Criteria

1. ✅ Users can sign in/sign up with MetaMask
2. ✅ Users can sign in/sign up with WalletConnect
3. ✅ Wallet address displayed in profile menu
4. ✅ Session persists across page refreshes
5. ✅ No duplicate accounts created for same wallet
6. ✅ Error handling works for all failure cases
7. ✅ UI is polished and matches VolSpike branding
8. ✅ Mobile wallet connection works
9. ✅ No regressions in existing auth flows
10. ✅ Security: Signatures verified server-side

---

## Future Enhancements (Post-MVP)

1. **Wallet Linking**: Allow users to link multiple wallets to one account
2. **ENS Support**: Resolve ENS names for wallet addresses
3. **Wallet Balance Display**: Show token balances in settings
4. **Transaction History**: Display recent transactions
5. **Solana Support**: Add Phantom wallet support
6. **Multi-Chain Switcher**: Allow users to switch networks easily
7. **Gas Estimation**: Show estimated gas for operations (if needed)

---

## Summary

**Current State**: Wallet connection UI exists but doesn't authenticate users.

**Recommended Approach**: Implement proper SIWE (Sign-In with Ethereum) flow with EVM wallets (MetaMask, WalletConnect) first. Add Solana/Phantom support in Phase 2 if there's demand.

**Key Benefits**:
- Industry standard authentication (EIP-4361)
- Works with all EVM wallets
- Secure (signature verification)
- Good UX (sign once, authenticated seamlessly)
- Scalable (can add more chains later)

**Estimated Effort**: 1-2 days of development for Phase 1 (EVM only)

**Priority**: High (wallet auth is a key differentiator for crypto-native users)


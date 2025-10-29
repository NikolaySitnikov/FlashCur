# Web3 Wallet Authentication Implementation Roadmap V2
## VolSpike - Modular SIWE + SIWS Implementation

---

## Executive Summary

This roadmap implements a **modular, production-ready** wallet authentication system for VolSpike that:

1. **Adds EVM wallet authentication (SIWE)** - Works with MetaMask, WalletConnect, and all EVM wallets
2. **Adds Solana wallet authentication (SIWS)** - Works with Phantom and Solana wallets  
3. **Preserves all existing auth flows** - Email/password and OAuth remain unchanged
4. **Follows current best practices** - EIP-4361 (SIWE), SIP-3-style (SIWS), proper signature verification
5. **Includes comprehensive security** - Anti-replay, chain allowlists, rate limiting, audit logging
6. **Beautiful, accessible UI** - Unified modal with EVM/Solana tabs, proper error handling

**Key Decision**: Start with **EVM-only (Phase 1)** for MVP, add **Solana (Phase 2)** after validation.

---

## Current State Analysis

### What Works ✅

- RainbowKit + Wagmi configured with proper theme
- ConnectButton renders in UI
- Backend has basic `/api/auth/siwe` endpoint (incomplete)
- NextAuth v5 with email/password and Google OAuth working
- Session management operational
- User profile menu recently implemented

### What's Missing ❌

1. **No SIWE signature verification** - Backend doesn't verify signatures
2. **No wallet address in session** - Can't access wallet from `useSession()`
3. **No integration** - ConnectButton doesn't authenticate users
4. **No Solana support** - Only EVM chains configured
5. **No nonce management** - Replay attack vulnerability
6. **No wallet linking** - Can't link multiple wallets to one account

### Architecture Goals

- **Modular**: Each wallet ecosystem can be added/removed independently
- **Secure**: Server-side signature verification, nonce management, audit logs
- **Non-breaking**: All existing auth flows remain untouched
- **Scalable**: Easy to add more wallets in future

---

## Recommendations & Best Practices

### 1. Authentication Standards

**EVM**: EIP-4361 (Sign-In with Ethereum)
- Widely adopted industry standard
- Message-based authentication (no transaction costs)
- Works with all EVM wallets
- Library: `siwe` package

**Solana**: SIP-3-style message signing
- Similar to SIWE but for Solana
- Ed25519 signature verification
- Works with Phantom and other Solana wallets
- Library: `@solana/wallet-adapter` + `tweetnacl`

### 2. Data Model Strategy

**Current Schema**: `User.walletAddress` is a single field

**Recommendation**: Add separate `WalletAccount` table for multi-wallet support

```prisma
model WalletAccount {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider    String   // 'evm' | 'solana'
  caip10      String   // EIP-4361 compliant identifier: 'eip155:1:0x...' or 'solana:101:...'
  address     String   // Wallet address or public key
  chainId     String?  // Network ID for chain allowlist
  lastLoginAt DateTime @default(now())
  createdAt   DateTime @default(now())
  
  @@unique([provider, caip10])
  @@index([userId])
  @@map("wallet_accounts")
}

// Add relation to User model
model User {
  // ... existing fields ...
  walletAccounts WalletAccount[] // Add this
}
```

**Why**: 
- Supports multiple wallets per user
- Clean CAIP-10 identifiers
- Future-proof for more chains
- Non-destructive migration

### 3. Nonce Management Strategy

**Requirements**:
- One-time use
- Time-bounded (5-minute expiry)
- Scoped per address and provider
- Stored securely (in-memory for dev, Redis for prod)

**Implementation**:
```typescript
// Simple in-memory store for MVP (use Redis in production)
const nonceStore = new Map<string, { timestamp: number, address: string }>()

// Cleanup expired nonces every 30 seconds
setInterval(() => {
  const now = Date.now()
  for (const [nonce, data] of nonceStore.entries()) {
    if (now - data.timestamp > 300000) { // 5 minutes
      nonceStore.delete(nonce)
    }
  }
}, 30000)

// Nonce endpoint
auth.get('/siwe/nonce', async (c) => {
  const nonce = crypto.randomUUID()
  nonceStore.set(nonce, { timestamp: Date.now(), address: 'unknown' })
  return c.json({ nonce })
})

// Verify and consume nonce
auth.post('/siwe/verify', async (c) => {
  // ... verify signature ...
  // Consume nonce
  if (!nonceStore.has(message.nonce)) {
    return c.json({ error: 'Invalid or expired nonce' }, 401)
  }
  nonceStore.delete(message.nonce) // One-time use
  // ... continue ...
})
```

### 4. Signature Verification Strategy

**EVM (EOA)**:
```typescript
import { SiweMessage } from 'siwe'
import { verifyMessage } from 'viem'

// Parse and validate SIWE message
const siweMessage = new SiweMessage(message)
const fields = await siweMessage.validate(signature)

// Verify signature matches message
const isValid = verifyMessage({
  address: fields.address,
  message: message,
  signature: signature,
})
```

**EVM (Smart Contract Wallets)** - EIP-1271:
```typescript
// If EOA verification fails, try EIP-1271
const isContract = await provider.getCode(address)
if (isContract !== '0x') {
  // Call isValidSignature on contract
  const isValid = await checkWalletSignature(address, message, signature)
}
```

**Solana (Ed25519)**:
```typescript
import nacl from 'tweetnacl'
import { PublicKey } from '@solana/web3.js'

// Build canonical message string
const messageString = buildSIWSLikeMessage(params)

// Verify Ed25519 signature
const publicKey = new PublicKey(publicKeyBase58)
const isValid = nacl.sign.detached.verify(
  new TextEncoder().encode(messageString),
  Buffer.from(signatureBase64, 'base64'),
  publicKey.toBytes()
)
```

### 5. Session Management

**Add wallet claims to NextAuth JWT**:
```typescript
// In lib/auth.ts - JWT callback
async jwt({ token, user, account }) {
  if (user) {
    token.id = user.id
    token.email = user.email
    token.walletAddress = user.walletAddress // Add wallet address
    token.walletProvider = user.walletProvider // 'evm' | 'solana' | null
    // ... other fields ...
  }
  return token
}

// Session callback
async session({ session, token }) {
  if (session.user) {
    session.user.walletAddress = token.walletAddress
    session.user.walletProvider = token.walletProvider
  }
  return session
}
```

### 6. UI/UX Strategy

**Unified Modal with Tabs**:
- Single "Connect Wallet" button opens modal
- Modal has tabs: "EVM" | "Solana" (tabs only visible if both supported)
- Each tab shows wallet options (MetaMask, WalletConnect, Phantom, etc.)
- After connection, show "Sign In" button
- After signing, authenticate and close modal

**Error Handling**:
- Clear error messages for each failure scenario
- Toast notifications for success/failure
- Graceful degradation if wallet not installed

**Loading States**:
- "Connecting wallet..." → "Waiting for signature..." → "Authenticating..." → "Success!"

---

## Detailed Implementation Plan

### Phase 0: Prerequisites & Audit (30 minutes)

**Goals**: Verify current setup, install dependencies, audit security

**Tasks**:

1. **Verify versions**:
```bash
cd volspike-nextjs-frontend
npm list next-auth @rainbow-me/rainbowkit wagmi viem

cd volspike-nodejs-backend  
npm list siwe viem
```

2. **Install required packages**:
```bash
# Frontend
cd volspike-nextjs-frontend
npm install siwe # For SIWE message generation

# Backend
cd volspike-nodejs-backend
npm install siwe viem tweetnacl # SIWE verification, EVM utilities, Ed25519
```

3. **Audit environment variables**:
```bash
# Frontend (.env.local)
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-id

# Backend (.env)
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
FRONTEND_URL=http://localhost:3000
```

4. **Define allowed chains** (for production):
```typescript
// volspike-nodejs-backend/src/config/chains.ts (new file)
export const ALLOWED_EVM_CHAINS = ['eip155:1', 'eip155:8453'] // Ethereum, Base
export const ALLOWED_SOLANA_NETWORKS = ['solana:101'] // Mainnet
```

---

### Phase 1: EVM Wallet Authentication (SIWE) - MVP (4-6 hours)

**Goal**: Enable MetaMask and WalletConnect sign-in with proper SIWE flow

#### Step 1.1: Update Database Schema (Non-destructive)

**File**: `volspike-nodejs-backend/prisma/schema.prisma`

**Changes**: Add `WalletAccount` model and relation

```prisma
model User {
  // ... existing fields ...
  walletAccounts WalletAccount[] // Add this line
}

model WalletAccount {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider    String   // 'evm' | 'solana'
  caip10      String   // EIP-4361 compliant
  address     String   // Wallet address
  chainId     String?  // Network ID
  lastLoginAt DateTime @default(now())
  createdAt   DateTime @default(now())
  
  @@unique([provider, caip10])
  @@index([userId])
  @@map("wallet_accounts")
}
```

**Migration**:
```bash
cd volspike-nodejs-backend
npx prisma migrate dev --name add_wallet_accounts
npx prisma generate
```

#### Step 1.2: Create Nonce Management

**File**: `volspike-nodejs-backend/src/services/nonce-manager.ts` (new)

**Purpose**: Manage nonce lifecycle (issuance, validation, expiry)

```typescript
import { randomUUID } from 'crypto'

interface NonceData {
  timestamp: number
  address: string
  provider: 'evm' | 'solana'
}

class NonceManager {
  private store = new Map<string, NonceData>()
  private ttl = 5 * 60 * 1000 // 5 minutes

  constructor() {
    // Cleanup expired nonces every 30 seconds
    setInterval(() => this.cleanup(), 30000)
  }

  generate(address: string, provider: 'evm' | 'solana'): string {
    const nonce = randomUUID()
    this.store.set(nonce, {
      timestamp: Date.now(),
      address: address.toLowerCase(),
      provider,
    })
    return nonce
  }

  validate(nonce: string): NonceData | null {
    const data = this.store.get(nonce)
    if (!data) return null

    const now = Date.now()
    if (now - data.timestamp > this.ttl) {
      this.store.delete(nonce)
      return null
    }

    return data
  }

  consume(nonce: string): boolean {
    if (!this.store.has(nonce)) return false
    this.store.delete(nonce)
    return true
  }

  private cleanup() {
    const now = Date.now()
    for (const [nonce, data] of this.store.entries()) {
      if (now - data.timestamp > this.ttl) {
        this.store.delete(nonce)
      }
    }
  }
}

export const nonceManager = new NonceManager()
```

#### Step 1.3: Create SIWE Endpoints

**File**: `volspike-nodejs-backend/src/routes/auth.ts`

**Add endpoints**:

```typescript
import { SiweMessage } from 'siwe'
import { verifyMessage } from 'viem'
import { nonceManager } from '../services/nonce-manager'
import { ALLOWED_EVM_CHAINS } from '../config/chains'

// Nonce issuance
auth.get('/siwe/nonce', async (c) => {
  const address = c.req.header('X-Wallet-Address') || 'unknown'
  const nonce = nonceManager.generate(address, 'evm')
  
  logger.info(`Nonce issued for EVM address: ${address}`)
  
  return c.json({ nonce })
})

// SIWE verification
auth.post('/siwe/verify', async (c) => {
  try {
    const { message, signature } = await c.req.json()

    // Parse SIWE message
    const siweMessage = new SiweMessage(message)
    const fields = await siweMessage.validate(signature)

    // Validate domain
    if (fields.domain !== process.env.FRONTEND_URL?.replace('http://', '').replace('https://', '')) {
      logger.warn(`Domain mismatch: ${fields.domain} vs ${process.env.FRONTEND_URL}`)
      return c.json({ error: 'Invalid domain' }, 401)
    }

    // Validate chain
    const chainId = `eip155:${fields.chainId}`
    if (!ALLOWED_EVM_CHAINS.includes(chainId)) {
      logger.warn(`Disallowed chain: ${chainId}`)
      return c.json({ error: `Chain not allowed. Allowed chains: ${ALLOWED_EVM_CHAINS.join(', ')}` }, 401)
    }

    // Validate and consume nonce
    const nonceData = nonceManager.validate(fields.nonce)
    if (!nonceData) {
      logger.warn(`Invalid or expired nonce: ${fields.nonce}`)
      return c.json({ error: 'Invalid or expired nonce' }, 401)
    }
    
    nonceManager.consume(fields.nonce) // One-time use

    // Verify signature
    const isValid = await verifyMessage({
      address: fields.address,
      message: message,
      signature: signature,
    })

    if (!isValid) {
      logger.warn(`Invalid signature for address: ${fields.address}`)
      return c.json({ error: 'Invalid signature' }, 401)
    }

    const caip10 = `eip155:${fields.chainId}:${fields.address}`
    
    // Find or create wallet account
    let walletAccount = await prisma.walletAccount.findUnique({
      where: {
        provider_caip10: {
          provider: 'evm',
          caip10: caip10,
        },
      },
      include: { user: true },
    })

    let user

    if (walletAccount) {
      // Existing wallet, sign in to associated user
      user = walletAccount.user
      await prisma.walletAccount.update({
        where: { id: walletAccount.id },
        data: { lastLoginAt: new Date() },
      })
      logger.info(`Existing wallet signed in: ${caip10}`)
    } else {
      // New wallet, create user
      user = await prisma.user.create({
        data: {
          email: `${fields.address}@volspike.wallet`,
          tier: 'free',
          emailVerified: new Date(),
        },
      })

      await prisma.walletAccount.create({
        data: {
          userId: user.id,
          provider: 'evm',
          caip10: caip10,
          address: fields.address,
          chainId: String(fields.chainId),
          lastLoginAt: new Date(),
        },
      })
      
      logger.info(`New wallet created and linked: ${caip10}`)
    }

    // Generate token
    const token = await generateToken(user.id)

    return c.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        tier: user.tier,
        emailVerified: user.emailVerified,
        walletAddress: fields.address,
        walletProvider: 'evm',
        role: user.role,
        status: user.status,
      },
    })
  } catch (error: any) {
    logger.error('SIWE verification error:', error)
    return c.json({ error: error.message || 'Verification failed' }, 401)
  }
})
```

#### Step 1.4: Create Frontend Wallet Auth Hook

**File**: `volspike-nextjs-frontend/src/hooks/use-wallet-auth.ts` (new)

**Purpose**: Handle wallet connection, SIWE signing, and authentication

```typescript
'use client'

import { useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { signIn } from 'next-auth/react'
import { SiweMessage } from 'siwe'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface UseWalletAuthResult {
  isConnecting: boolean
  isSigning: boolean
  isAuthenticating: boolean
  error: string | null
  signInWithWallet: () => Promise<void>
}

export function useWalletAuth(): UseWalletAuthResult {
  const { address, chainId, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSigning, setIsSigning] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signInWithWallet = async () => {
    try {
      setError(null)

      // Step 1: Check wallet connected
      if (!isConnected || !address || !chainId) {
        throw new Error('Please connect your wallet first')
      }

      setIsConnecting(true)

      // Step 2: Get nonce from backend
      const nonceRes = await fetch(`${API_URL}/api/auth/siwe/nonce`, {
        headers: { 'X-Wallet-Address': address },
      })
      const { nonce } = await nonceRes.json()

      setIsConnecting(false)
      setIsSigning(true)

      // Step 3: Generate SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to VolSpike',
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce,
        issuedAt: new Date().toISOString(),
      })

      const messageString = message.prepareMessage()

      // Step 4: Sign message with wallet
      const signature = await signMessageAsync({
        message: messageString,
      })

      setIsSigning(false)
      setIsAuthenticating(true)

      // Step 5: Verify signature and get token
      const verifyRes = await fetch(`${API_URL}/api/auth/siwe/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageString, signature }),
      })

      if (!verifyRes.ok) {
        const errorData = await verifyRes.json()
        throw new Error(errorData.error || 'Authentication failed')
      }

      const { token, user } = await verifyRes.json()

      // Step 6: Create NextAuth session
      await signIn('siwe', {
        redirect: false,
        token,
        walletAddress: user.walletAddress,
      })

      // Step 7: Redirect to dashboard
      window.location.href = '/dashboard'
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate')
      console.error('[useWalletAuth] Error:', err)
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
    signInWithWallet,
  }
}
```

#### Step 1.5: Add SIWE Provider to NextAuth

**File**: `volspike-nextjs-frontend/src/lib/auth.ts`

**Add credentials provider**:

```typescript
CredentialsProvider({
  name: 'siwe',
  credentials: {
    token: { label: 'Token', type: 'text' },
    walletAddress: { label: 'Wallet Address', type: 'text' },
  },
  async authorize(credentials) {
    if (!credentials?.token) return null

    try {
      // Verify token with backend
      const res = await fetch(`${BACKEND_API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${credentials.token}` },
      })

      if (!res.ok) return null

      const user = await res.json()

      return {
        id: user.id,
        email: user.email,
        name: user.walletAddress || user.email,
        walletAddress: user.walletAddress,
        walletProvider: user.walletProvider,
        tier: user.tier,
        emailVerified: user.emailVerified,
        role: user.role,
        status: user.status,
        accessToken: credentials.token,
      }
    } catch (error) {
      console.error('[NextAuth] SIWE authorization error:', error)
      return null
    }
  },
})
```

**Update callbacks**:

```typescript
async jwt({ token, user }) {
  if (user) {
    token.id = user.id
    token.email = user.email
    token.walletAddress = user.walletAddress
    token.walletProvider = user.walletProvider
    token.tier = user.tier
    token.role = user.role
    token.status = user.status
    token.accessToken = user.accessToken
  }
  return token
}

async session({ session, token }) {
  if (session.user) {
    session.user.id = token.id
    session.user.walletAddress = token.walletAddress
    session.user.walletProvider = token.walletProvider
    session.user.tier = token.tier
    session.user.role = token.role
    session.user.status = token.status
    session.accessToken = token.accessToken
  }
  return session
}
```

#### Step 1.6: Update TypeScript Types

**File**: `volspike-nextjs-frontend/src/types/next-auth.d.ts`

**Add wallet fields**:

```typescript
interface User {
  id: string
  email: string
  name?: string
  image?: string
  tier?: 'free' | 'pro' | 'elite'
  role?: 'USER' | 'ADMIN'
  status?: 'ACTIVE' | 'SUSPENDED' | 'BANNED'
  twoFactorEnabled?: boolean
  walletAddress?: string      // Add this
  walletProvider?: 'evm' | 'solana' | null // Add this
  accessToken?: string
}

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
    walletAddress?: string      // Add this
    walletProvider?: 'evm' | 'solana' | null // Add this
  }
  accessToken?: string
}
```

#### Step 1.7: Update User Identity Hook

**File**: `volspike-nextjs-frontend/src/hooks/use-user-identity.ts`

**Get wallet from session**:

```typescript
const walletAddress = (session?.user as any)?.walletAddress || null
const walletProvider = (session?.user as any)?.walletProvider || null
```

#### Step 1.8: Integrate in Auth Page

**File**: `volspike-nextjs-frontend/src/app/auth/page.tsx`

**Add wallet sign-in UI**:

```typescript
import { useWalletAuth } from '@/hooks/use-wallet-auth'

// Inside component:
const { isSigning, isAuthenticating, error: walletError, signInWithWallet } = useWalletAuth()
const { isConnected } = useAccount()

// In JSX, add after DynamicConnectButton:
{isConnected && (
  <Button
    onClick={signInWithWallet}
    disabled={isSigning || isAuthenticating}
    className="w-full bg-green-500 hover:bg-green-600 text-white"
  >
    {isSigning && <>Signing message in wallet...</>}
    {isAuthenticating && <>Authenticating...</>}
    {!isSigning && !isAuthenticating && <>Sign In with Wallet</>}
  </Button>
)}
```

#### Step 1.9: Update User Menu to Show Wallet

**File**: `volspike-nextjs-frontend/src/components/user-menu.tsx`

**Add wallet address display**:

```typescript
{identity.address && (
  <div className="flex items-center gap-2 px-2 py-1">
    <Wallet className="h-3 w-3 text-muted-foreground" />
    <span className="text-xs font-mono">{identity.address.slice(0, 6)}...{identity.address.slice(-4)}</span>
  </div>
)}
```

---

### Phase 2: Solana Wallet Authentication (SIWS) - Post-MVP (4-6 hours)

**Goal**: Enable Phantom wallet sign-in with proper Ed25519 verification

#### Step 2.1: Install Solana Dependencies

```bash
cd volspike-nextjs-frontend
npm install @solana/wallet-adapter-base @solana/wallet-adapter-react @solana/wallet-adapter-wallets @solana/wallet-adapter-react-ui @solana/web3.js
```

```bash
cd volspike-nodejs-backend
npm install @solana/web3.js tweetnacl
```

#### Step 2.2: Add Solana Wallet Provider

**File**: `volspike-nextjs-frontend/src/components/web3-providers.tsx`

**Wrap with Solana provider**:

```typescript
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets'

const network = WalletAdapterNetwork.Mainnet // or Devnet
const endpoint = `https://api.mainnet-beta.solana.com` // or devnet endpoint

const wallets = [new PhantomWalletAdapter()]

export default function Web3Providers({ children }) {
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WagmiProvider config={config}>
            {/* existing providers */}
            {children}
          </WagmiProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
```

#### Step 2.3: Create SIWS Endpoints (Similar to SIWE)

**File**: `volspike-nodejs-backend/src/routes/auth.ts`

**Add Solana endpoints** (mirror SIWE pattern with Ed25519 verification)

---

### Phase 3: Testing (2-3 hours)

**See comprehensive testing plan below**

---

## Comprehensive Testing Plan

### Test Category 1: EVM Wallet Connection

**Test 1.1: Connect MetaMask**
- Install MetaMask extension
- Click "Connect Wallet"
- Select MetaMask
- Verify connection success
- Expected: MetaMask popup, connection confirmed

**Test 1.2: Connect WalletConnect (Mobile)**
- Click "Connect Wallet"
- Select WalletConnect
- Scan QR with mobile wallet
- Verify connection
- Expected: QR code, mobile connection, deep link

**Test 1.3: Connect Coinbase Wallet**
- Click "Connect Wallet"
- Select Coinbase Wallet
- Verify connection
- Expected: Coinbase popup, connection confirmed

### Test Category 2: SIWE Sign-In

**Test 2.1: Sign In with New Wallet**
- Connect MetaMask with new address
- Click "Sign In with Wallet"
- Sign message in MetaMask
- Expected: Authentication success, redirect to dashboard

**Test 2.2: Sign In with Existing Wallet**
- Connect previously used wallet
- Sign message
- Expected: Sign in to existing account (no duplicate)

**Test 2.3: Signature Rejection**
- Connect wallet
- Click "Sign In"
- Reject signature in MetaMask
- Expected: Error toast: "Signature rejected"

**Test 2.4: Wrong Network**
- Switch to unsupported network (e.g., BSC)
- Try to sign in
- Expected: Error: "Chain not allowed"

### Test Category 3: Nonce Security

**Test 3.1: Replay Attack Prevention**
- Get nonce
- Sign message
- Submit signature twice
- Expected: First succeeds, second rejected

**Test 3.2: Expired Nonce**
- Get nonce
- Wait 6 minutes
- Sign and submit
- Expected: Error: "Expired nonce"

### Test Category 4: Session & Persistence

**Test 4.1: Session Persistence**
- Sign in with wallet
- Close browser
- Reopen and navigate to dashboard
- Expected: Still authenticated

**Test 4.2: Wallet Display in Profile**
- Sign in with wallet
- Open profile menu
- Expected: Wallet address visible

**Test 4.3: Multiple Wallets**
- Sign in with Wallet A
- Sign out
- Sign in with Wallet B
- Expected: Different accounts

### Test Category 5: Error Handling

**Test 5.1: Wallet Not Installed**
- Open auth page without MetaMask
- Click "Connect Wallet"
- Expected: Shows "Get Wallet" prompt

**Test 5.2: Connection Timeout**
- Start connecting
- Close wallet popup
- Expected: Clear error message

### Test Category 6: No Regressions

**Test 6.1: Email/Password Still Works**
- Sign in with email/password
- Expected: Works as before

**Test 6.2: Google OAuth Still Works**
- Sign in with Google
- Expected: Works as before

**Test 6.3: Admin Routes Protected**
- Access admin routes
- Expected: Access control unchanged

### Test Category 7: Database Integrity

**Test 7.1: User Creation**
- Sign in with new wallet
- Check database
- Expected: User and WalletAccount created

**Test 7.2: Wallet Linking (Future)**
- Link second wallet to account
- Expected: Both wallets accessible

### Test Category 8: Performance

**Test 8.1: Sign-In Latency**
- Measure end-to-end sign-in time
- Expected: < 5 seconds

**Test 8.2: Nonce Cleanup**
- Monitor nonce store size
- Expected: Stays small (< 100 items)

---

## Implementation Checklist

### Phase 1: EVM (SIWE) - MVP

- [ ] Step 1.1: Update database schema with WalletAccount
- [ ] Step 1.2: Create nonce manager service
- [ ] Step 1.3: Add SIWE endpoints (nonce, verify)
- [ ] Step 1.4: Create useWalletAuth hook
- [ ] Step 1.5: Add SIWE provider to NextAuth
- [ ] Step 1.6: Update TypeScript types
- [ ] Step 1.7: Update useUserIdentity hook
- [ ] Step 1.8: Integrate in auth page UI
- [ ] Step 1.9: Update user menu to show wallet
- [ ] Step 1.10: Test with MetaMask (Test Category 1 & 2)
- [ ] Step 1.11: Test security (Test Category 3)
- [ ] Step 1.12: Test no regressions (Test Category 6)

### Phase 2: Solana (SIWS) - Post-MVP

- [ ] Step 2.1: Install Solana dependencies
- [ ] Step 2.2: Add Solana wallet provider
- [ ] Step 2.3: Create SIWS endpoints
- [ ] Step 2.4: Create useSolanaWalletAuth hook
- [ ] Step 2.5: Add Solana provider to NextAuth
- [ ] Step 2.6: Update UI for Solana tab
- [ ] Step 2.7: Test with Phantom

### Phase 3: Documentation

- [ ] Update AGENTS.md with wallet auth details
- [ ] Update OVERVIEW.md with SIWE/SIWS flows
- [ ] Document environment variables
- [ ] Add troubleshooting guide

---

## Files to Create/Modify

### Backend Files

**New**:
- `volspike-nodejs-backend/src/services/nonce-manager.ts`
- `volspike-nodejs-backend/src/config/chains.ts`

**Modified**:
- `volspike-nodejs-backend/prisma/schema.prisma` (add WalletAccount model)
- `volspike-nodejs-backend/src/routes/auth.ts` (add SIWE/SIWS endpoints)

### Frontend Files

**New**:
- `volspike-nextjs-frontend/src/hooks/use-wallet-auth.ts`
- `volspike-nextjs-frontend/src/hooks/use-solana-wallet-auth.ts` (Phase 2)

**Modified**:
- `volspike-nextjs-frontend/src/lib/auth.ts` (add SIWE provider, update callbacks)
- `volspike-nextjs-frontend/src/types/next-auth.d.ts` (add wallet fields)
- `volspike-nextjs-frontend/src/hooks/use-user-identity.ts` (get wallet from session)
- `volspike-nextjs-frontend/src/app/auth/page.tsx` (add wallet sign-in UI)
- `volspike-nextjs-frontend/src/components/user-menu.tsx` (display wallet address)
- `volspike-nextjs-frontend/src/components/web3-providers.tsx` (add Solana provider in Phase 2)

---

## Risk Assessment

**Low Risk**:
- Non-breaking changes (existing auth flows untouched)
- Using proven libraries (`siwe`, `viem`)
- Following industry standards (EIP-4361)
- Modular architecture (can disable if issues arise)

**Medium Risk**:
- Signature verification must be correct
- Nonce management security critical
- Database migration (test in dev first)

**Mitigation**:
- Use battle-tested libraries for signature verification
- Implement comprehensive nonce validation
- Test migration on dev database first
- Feature flag for gradual rollout

**Success Criteria**:
1. ✅ Users can sign in with MetaMask
2. ✅ Users can sign in with WalletConnect  
3. ✅ Signature verification works
4. ✅ Replay attacks prevented
5. ✅ Session persistence works
6. ✅ No regressions in existing auth
7. ✅ Beautiful, accessible UI
8. ✅ Comprehensive error handling

---

## Summary

This roadmap provides a **modular, production-ready** implementation of wallet authentication for VolSpike:

- **EVM first** (Phase 1) for MVP validation
- **Solana later** (Phase 2) after proving value
- **Non-breaking** - all existing flows preserved
- **Secure** - proper signature verification, nonce management
- **Beautiful** - polished UI with clear error handling
- **Scalable** - easy to add more wallets in future

**Estimated Timeline**:
- Phase 1 (EVM SIWE): 4-6 hours
- Phase 2 (Solana SIWS): 4-6 hours  
- Testing: 2-3 hours
- Documentation: 1 hour

**Total**: ~12-16 hours for complete implementation


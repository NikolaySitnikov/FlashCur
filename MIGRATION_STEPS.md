# VolSpike Frontend - Web3 Stack Migration Guide

## Quick Start (5 Minutes)

### 1. Update Dependencies
```bash
npm install @rainbow-me/rainbowkit@^2.1.0 next-auth@^5.0.0 @auth/prisma-adapter@^1.0.0
```

### 2. Replace providers.tsx
Copy content from `providers.tsx.fixed` to `src/components/providers.tsx`

### 3. Update layout.tsx
Add this line after imports in `src/app/layout.tsx`:
```typescript
import '@rainbow-me/rainbowkit/styles.css'
```

### 4. Clear Cache and Restart
```bash
rm -rf .next node_modules/.cache
npm run dev
```

---

## Detailed Migration Steps

### Step 1: Update package.json

**Current (Broken):**
```json
{
  "@rainbow-me/rainbowkit": "^1.3.0",  // ❌ Incompatible with wagmi v2
  "next-auth": "^5.0.0-beta.4",        // ❌ Beta version
}
```

**Fixed:**
```json
{
  "@rainbow-me/rainbowkit": "^2.1.0",  // ✅ Wagmi v2 compatible
  "next-auth": "^5.0.0",               // ✅ Stable v5
  "@auth/prisma-adapter": "^1.0.0",    // ✅ New scope for auth.js v5
}
```

**Run:**
```bash
npm install
```

### Step 2: Update src/components/providers.tsx

**Key Changes:**
1. Remove `import { WagmiConfig } from 'wagmi'` (v1 API)
2. Change to `import { WagmiProvider, http } from 'wagmi'` (v2 API)
3. Replace manual chain configuration with `getDefaultConfig()`
4. Remove `wagmiQueryClient` - use single QueryClient only
5. Add explicit transports for each chain
6. Remove chains prop from RainbowKitProvider
7. Add RainbowKit CSS import

**Complete replacement:**
```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { SessionProvider } from 'next-auth/react'
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { WagmiProvider, http } from 'wagmi'
import { mainnet, polygon, arbitrum, optimism } from 'wagmi/chains'
import { useState } from 'react'
import { ThemeProvider } from '@/components/theme-provider'
import '@rainbow-me/rainbowkit/styles.css'

// NEW: Wagmi v2 configuration with getDefaultConfig
const config = getDefaultConfig({
  appName: 'VolSpike',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
  chains: [mainnet, polygon, arbitrum, optimism],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
  },
  ssr: true,
})

export function Providers({ children }: { children: React.ReactNode }) {
  // SINGLE QueryClient instance (not multiple)
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,     // Changed from cacheTime
        retry: (failureCount) => failureCount < 3,
      },
    },
  }))

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <RainbowKitProvider>
            {/* No chains prop! */}
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <ReactQueryDevtools initialIsOpen={false} />
            </ThemeProvider>
          </RainbowKitProvider>
        </SessionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

### Step 3: Update src/app/layout.tsx

Add after other imports:
```typescript
import '@rainbow-me/rainbowkit/styles.css'
```

Full example:
```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import '@rainbow-me/rainbowkit/styles.css'  // ← ADD THIS
import { Providers } from '@/components/providers'
import { Toaster } from 'react-hot-toast'

// ... rest of layout.tsx
```

### Step 4: (Optional) Setup NextAuth v5

If using NextAuth for authentication:

**1. Create `src/auth.ts`:**
```typescript
import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import prisma from '@/lib/prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id as string
      return session
    },
  },
})
```

**2. Create `src/app/api/auth/[...nextauth]/route.ts`:**
```typescript
import { handlers } from '@/auth'
export const { GET, POST } = handlers
export const runtime = 'nodejs'
```

**3. Update `.env.local`:**
```bash
AUTH_SECRET=$(openssl rand -hex 32)
AUTH_URL=http://localhost:3000
```

### Step 5: Clear Cache and Test

```bash
# Clear Next.js cache
rm -rf .next

# Clear npm cache (if needed)
npm cache clean --force

# Reinstall dependencies
npm install

# Start development server
npm run dev
```

---

## Verification Checklist

### ✅ Installation Success
- [ ] `npm install` completes without errors
- [ ] `node_modules/@rainbow-me/rainbowkit/package.json` shows version 2.x.x
- [ ] `node_modules/wagmi/package.json` shows version 2.x.x
- [ ] No "peer dependency" warnings

### ✅ Runtime Success
- [ ] `npm run dev` starts without errors
- [ ] No "Element type is invalid" error
- [ ] No "getDefaultConfig is not a function" error
- [ ] No hydration warnings about SSR mismatch

### ✅ Functionality
- [ ] RainbowKit connect button appears
- [ ] Clicking connect button shows wallet options
- [ ] MetaMask connection works
- [ ] `useAccount()` hook returns address when connected
- [ ] No console errors in browser DevTools

### ✅ Test Component

Create `src/app/test-wallet.tsx`:
```typescript
'use client'

import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function TestWallet() {
  const { address, isConnected } = useAccount()

  return (
    <div className="p-8">
      <ConnectButton />
      {isConnected && (
        <p className="mt-4 text-green-600">
          ✅ Connected: {address}
        </p>
      )}
    </div>
  )
}
```

Add to `src/app/page.tsx`:
```typescript
import TestWallet from './test-wallet'

export default function Home() {
  return (
    <main>
      <TestWallet />
      {/* Your other content */}
    </main>
  )
}
```

Visit `http://localhost:3000` and test the connect button.

---

## Troubleshooting

### ❌ "Element type is invalid"

**Cause:** RainbowKit v1 still installed  
**Fix:**
```bash
npm ls @rainbow-me/rainbowkit
npm install @rainbow-me/rainbowkit@^2.1.0 --force
```

### ❌ "Cannot find module '@rainbow-me/rainbowkit/styles.css'"

**Cause:** CSS import missing or old version  
**Fix:**
1. Verify v2.1.0 is installed: `npm ls @rainbow-me/rainbowkit`
2. Add import to layout.tsx: `import '@rainbow-me/rainbowkit/styles.css'`
3. Restart dev server

### ❌ "getDefaultConfig is not a function"

**Cause:** Importing from old RainbowKit  
**Fix:**
```bash
rm -rf node_modules
npm install
npm run dev
```

### ❌ "Multiple QueryClient instances"

**Cause:** Creating both queryClient and wagmiQueryClient  
**Fix:** Use only one instance:
```typescript
const [queryClient] = useState(() => new QueryClient({...}))
// Don't create wagmiQueryClient
```

### ❌ "Hydration mismatch error"

**Cause:** Wagmi hooks in server components  
**Fix:** Add `'use client'` to top of component using Wagmi:
```typescript
'use client'
import { useAccount } from 'wagmi'
// ...
```

### ❌ NextAuth SessionProvider issues

**Cause:** Multiple Session contexts  
**Fix:** Ensure SessionProvider is only in one Providers component:
```typescript
// Keep it in providers.tsx, don't duplicate elsewhere
<SessionProvider>
  {children}
</SessionProvider>
```

### ❌ RainbowKit SIWE not working with NextAuth v5

**Status:** Known compatibility issue  
**Workaround:** Don't use `RainbowKitSiweNextAuthProvider` with v5 yet

Use basic integration instead:
```typescript
<SessionProvider>
  <WagmiProvider>
    <RainbowKitProvider>
      {children}
    </RainbowKitProvider>
  </WagmiProvider>
</SessionProvider>
```

---

## Environment Variables

Update `.env.local`:

```bash
# WalletConnect (required)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_from_walletconnect_cloud

# NextAuth v5 (if using authentication)
AUTH_SECRET=$(openssl rand -hex 32)
AUTH_URL=http://localhost:3000

# Optional: RPC endpoints (for production)
NEXT_PUBLIC_ALCHEMY_KEY=your_alchemy_key
NEXT_PUBLIC_INFURA_KEY=your_infura_key
```

Generate AUTH_SECRET:
```bash
openssl rand -hex 32
```

---

## Production Build Testing

```bash
# Build
npm run build

# Check for errors
# If successful, start production server:
npm run start

# Visit http://localhost:3000
```

---

## Rollback Plan (if needed)

If something breaks:

```bash
# View version history
npm ls @rainbow-me/rainbowkit

# Revert specific package
npm install @rainbow-me/rainbowkit@1.3.0

# Revert all to package-lock.json state
rm -rf node_modules
npm ci
```

---

## Support Resources

- **RainbowKit v2 Migration:** https://rainbowkit.com/guides/rainbowkit-wagmi-v2
- **Wagmi v2 Docs:** https://wagmi.sh
- **NextAuth v5 Docs:** https://authjs.dev
- **GitHub Issues:** Check RainbowKit and Wagmi GitHub issues for known problems

---

## Timeline

- **Current State:** Frontend failing with Web3 provider errors
- **After Step 1-3:** Basic wallet connection working
- **After Step 4 (optional):** Full authentication enabled
- **After testing:** Ready for production deployment

**Estimated time:** 15-30 minutes

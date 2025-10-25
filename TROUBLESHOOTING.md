# Troubleshooting Guide: Web3 Hydration Issues

## 🎯 Quick Diagnosis

Run this command to check your setup:

```bash
# Check versions
npm list next wagmi rainbowkit viem @auth/prisma-adapter
```

Expected output for production setup:
- ✅ next@15.0.0 or higher
- ✅ wagmi@2.0.0 or higher  
- ✅ rainbowkit@2.1.0 or higher
- ✅ viem@2.0.0 or higher

---

## Common Issues & Fixes

### Issue 1: "Hydration mismatch" Warning in Console

**Symptoms:**
```
⚠️ Warning: Hydration failed because the initial UI does not match 
what was rendered on the server
```

**Root Cause:** Web3 providers render during server hydration

**Fix:**
```tsx
// In web3-providers.tsx - Add these lines:

const [mounted, setMounted] = useState(false)

useEffect(() => {
    setMounted(true)
}, [])

if (!mounted) return <>{children}</>  // Critical!

return (
    <WagmiProvider config={config}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
    </WagmiProvider>
)
```

**Verify:**
1. Clear cache: `rm -rf .next`
2. Restart: `npm run dev`
3. Check console: No warnings ✓

---

### Issue 2: Wallet Button Not Appearing

**Symptoms:**
- Page loads but no wallet connect button
- Loading indicator stays

**Root Cause:** Dynamic import not loading or wrong configuration

**Diagnosis:**
```javascript
// In browser console:
console.log('Check: Do you see loading spinner?')
// Wait 3 seconds...
console.log('Still there? Web3Providers not loading')
```

**Fixes:**

**Fix A: Check Environment Variables**
```bash
# Verify .env.local has these
cat .env.local | grep -E "NEXT_PUBLIC_WALLETCONNECT|NEXTAUTH"

# Should show:
# NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<valid_id>
# NEXTAUTH_URL=http://localhost:3000
```

**Fix B: Check Dynamic Import**
```tsx
// Verify in providers.tsx:
const Web3Providers = dynamic(
    () => import('./web3-providers'),
    {
        ssr: false,  // ✅ Must be false
        loading: () => <LoadingSpinner />
    }
)
```

**Fix C: Check File Paths**
```bash
# Verify file exists:
ls -la src/components/web3-providers.tsx

# Should exist ✓
```

**Fix D: Restart Everything**
```bash
# Nuclear option:
rm -rf .next node_modules/.cache
npm run dev
# Hard refresh browser: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
```

---

### Issue 3: Wallet Connection Fails

**Symptoms:**
```
Error connecting to wallet
MetaMask connection rejected
WalletConnect fails
```

**Diagnosis Steps:**

```javascript
// In browser console - Step 1:
console.log('Check network tab for WalletConnect requests')
// Look for requests to https://relay.walletconnect.com
// If 403/401 → Invalid Project ID
```

**Fix 1: Verify WalletConnect Project ID**

```bash
# Check if ID is valid format (should be hex string, ~30 chars)
echo $NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
# Output should look like: abcb0dcbc07f7524c16a4e3df252d18e
```

If invalid:
1. Go to https://cloud.walletconnect.com
2. Create new project
3. Copy Project ID
4. Update `.env.local`
5. Restart dev server

**Fix 2: Clear Wagmi Cache**

```bash
# Remove Wagmi's localStorage cache
# In browser console:
localStorage.removeItem('wagmi')
localStorage.removeItem('wagmi.cache')
location.reload()
```

**Fix 3: Check CORS for Wallet Providers**

```javascript
// In console - these should work:
fetch('https://relay.walletconnect.com/history')
  .then(r => console.log('WalletConnect:', r.status))
  .catch(e => console.log('WalletConnect Error:', e))
```

---

### Issue 4: Theme Switching Broken

**Symptoms:**
- Theme provider loads after Web3
- Dark/light mode toggle doesn't work
- Components have wrong colors initially

**Root Cause:** Theme provider inside Web3 delayed component

**Fix 1: Verify Provider Order**
```tsx
// In providers.tsx - should be:
<QueryClientProvider>          {/* First */}
  <SessionProvider>            {/* Second */}
    <ThemeProvider>            {/* Third */}
      <Web3Providers>          {/* Last */}
        {children}
      </Web3Providers>
    </ThemeProvider>
  </SessionProvider>
</QueryClientProvider>
```

**Fix 2: Add Theme Persistence**
```tsx
// In web3-providers.tsx:
useEffect(() => {
    // Theme already loaded by ThemeProvider
    // Just mark as ready
    setMounted(true)
}, [])
```

**Verify:**
```javascript
// In console:
const html = document.documentElement
console.log('Current theme class:', html.className)
// Should show: 'light' or 'dark'
```

---

### Issue 5: Slow Initial Load

**Symptoms:**
- Page loads fine but feels sluggish
- Long loading spinner duration

**Root Cause:** Web3 initialization takes too long

**Diagnosis:**
```javascript
// In browser console:
performance.mark('web3-start')
// Then after wallet button appears:
performance.mark('web3-end')
performance.measure('web3-init', 'web3-start', 'web3-end')
console.log(performance.getEntriesByName('web3-init')[0])
// If > 2 seconds, there's an issue
```

**Optimization:**

```tsx
// Add lazy loading to web3-providers.tsx:
const config = getDefaultConfig({
    // ... existing config
    batch: {
        multicall: true,  // ✅ Combine multiple calls
    },
    // Add polling interval optimization
    pollingInterval: 30000, // Check wallet every 30s instead of 4s
})
```

**Verify:**
```bash
# Check bundle size
npm run build
# Look for Web3 size in build output
```

---

### Issue 6: Multiple Hydration Errors on Refresh

**Symptoms:**
```
Hydration error on first load
Disappears on second refresh
Works fine after that
```

**Root Cause:** Race condition between dynamic import and hydration

**Fix: Add Explicit Delay**

```tsx
// In web3-providers.tsx:
export default function Web3Providers({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        // Small delay to ensure hydration is complete
        const timer = setTimeout(() => {
            setMounted(true)
        }, 0) // Next tick

        return () => clearTimeout(timer)
    }, [])

    if (!mounted) return <>{children}</>

    return (
        <WagmiProvider config={config}>
            <RainbowKitProvider>{children}</RainbowKitProvider>
        </WagmiProvider>
    )
}
```

---

### Issue 7: "Cannot read property 'ethereumProvider'" Error

**Symptoms:**
```
TypeError: Cannot read property 'ethereumProvider' of undefined
Cannot read property 'request' of null
```

**Root Cause:** Accessing wallet before mounted

**Fix: Ensure Hydration Check**

```tsx
// Make sure you have this in every component using Web3:
import { useEffect, useState } from 'react'

export function YourComponent() {
    const [mounted, setMounted] = useState(false)
    
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    // Now safe to use Web3 hooks
    return <YourWebComponent />
}
```

---

## Advanced Diagnostics

### Enable Wagmi Debug Mode

```tsx
// Add to web3-providers.tsx:
import { createPublicClient, http } from 'viem'

// In browser console:
localStorage.debug = '*'
location.reload()
// Will show detailed Wagmi logs
```

### Check Hydration Status

```javascript
// In console:
// After page loads, run:
document.documentElement.innerHTML === sessionStorage.getItem('ssr-html')
// Should return true if hydration matched
```

### Monitor Provider Lifecycle

```tsx
// Add logging to web3-providers.tsx:
export default function Web3Providers({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        console.log('[Web3] Initializing...')
        setMounted(true)
        console.log('[Web3] Ready')
        
        return () => console.log('[Web3] Cleaning up')
    }, [])

    console.log('[Web3] mounted:', mounted)
    
    if (!mounted) return <>{children}</>
    
    return (
        <WagmiProvider config={config}>
            <RainbowKitProvider>{children}</RainbowKitProvider>
        </WagmiProvider>
    )
}
```

---

## Prevention Checklist

Before deploying to production:

- [ ] No console warnings in development
- [ ] No warnings on page refresh
- [ ] Wallet connects smoothly
- [ ] Wallet disconnects cleanly
- [ ] Theme toggle works
- [ ] Network switching works (if testing multiple chains)
- [ ] Mobile wallet connection works
- [ ] Works in incognito/private mode
- [ ] Works with browser Back button
- [ ] Works after browser sleep/wake

---

## Getting Help

### Info to Provide if You Get Stuck

1. **Browser console output** (F12 → Console tab)
2. **Your `package.json`** (versions matter!)
3. **Your `web3-providers.tsx`** file
4. **Steps to reproduce** the issue

### Useful Resources

- 🔗 [Wagmi Documentation](https://wagmi.sh)
- 🔗 [RainbowKit Docs](https://www.rainbowkit.com)
- 🔗 [Next.js Hydration Guide](https://nextjs.org/docs/messages/react-hydration-error)
- 🔗 [React 18 Updates](https://react.dev/blog/2022/03/29/react-v18)

---

## Success Indicators ✅

You've fixed the issue when:

- ✅ No hydration warnings in console
- ✅ Wallet button appears within 2 seconds
- ✅ Wallet connection succeeds on first try
- ✅ Theme switching works
- ✅ No errors on page refresh
- ✅ Mobile works smoothly
- ✅ Build completes without warnings

---

## Quick Recovery Checklist

If everything breaks:

```bash
# Step 1: Nuclear reset
rm -rf .next node_modules
npm install

# Step 2: Check environment
cat .env.local | head -5

# Step 3: Restart clean
npm run dev

# Step 4: Hard refresh browser
Ctrl+Shift+R  (Windows/Linux)
Cmd+Shift+R   (Mac)

# Step 5: Check console
# Open F12 → Console tab
# Should see no errors
```

If still broken → Review BEFORE_AND_AFTER.md and copy the FIXED files directly.

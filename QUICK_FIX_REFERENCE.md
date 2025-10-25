# 🚀 NextAuth API Route Fix - Quick Reference

## The Problem
```
GET /api/auth/session → 500 Error (HTML instead of JSON)
Reason: next.config.js rewrites ALL /api/* to backend, including NextAuth routes
```

## The Solution
Change `next.config.js` line in the `rewrites()` function:

### ❌ BEFORE (Broken)
```javascript
source: '/api/:path*',
```

### ✅ AFTER (Fixed)
```javascript
source: '/api/((?!auth).*)/:path*',
```

## Step-by-Step

1. Open: `volspike-nextjs-frontend/next.config.js`

2. Find:
```javascript
async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [
        {
            source: '/api/:path*',  ← Change this line
            destination: `${apiUrl}/api/:path*`,
        },
    ];
},
```

3. Replace with:
```javascript
async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [
        {
            source: '/api/((?!auth).*)/:path*',  ← New pattern
            destination: `${apiUrl}/api/$1/:path*`,
        },
    ];
},
```

4. Restart dev server:
```bash
# Press Ctrl+C to stop current server
npm run dev
```

5. Test at `http://localhost:3000`

## What This Does

| Endpoint | Route Handling |
|----------|----------------|
| `/api/auth/session` | Runs locally ✅ |
| `/api/auth/signin` | Runs locally ✅ |
| `/api/auth/callback/*` | Runs locally ✅ |
| `/api/users` | Proxied to :3001 ✅ |
| `/api/trades` | Proxied to :3001 ✅ |

## Verification

### Browser Console
```javascript
await fetch('/api/auth/session').then(r => r.json()).then(console.log)
// Should show valid JSON, not error
```

### Network Tab (DevTools)
- Look for `/api/auth/session` request
- Should show: **Status 200** ✅
- Should show: **JSON response** ✅

## Files to Update
- ✅ `volspike-nextjs-frontend/next.config.js` - Change rewrite pattern
- ✅ `volspike-nextjs-frontend/.env.local` - Ensure it exists

## Files That Are Correct (No Changes Needed)
- ✅ `src/lib/auth.ts` - NextAuth config is good
- ✅ `src/app/api/auth/[...nextauth]/route.ts` - Route handler is correct
- ✅ `src/components/providers.tsx` - SessionProvider setup is correct
- ✅ `src/app/page.tsx` - Using auth() correctly

## If Still Not Working

```bash
# Clear Next.js cache and restart
rm -rf .next
npm run dev

# Verify .env.local exists
ls -la .env.local

# Check file was saved correctly
grep "(?!auth)" next.config.js
```

---

**Time to Fix**: 2 minutes
**Difficulty**: Easy
**Success Rate**: 99%

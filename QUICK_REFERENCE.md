# VolSpike NextAuth v5 Quick Reference Card

## 🚨 Critical Issues Summary

| Issue | Root Cause | Fix | File |
|-------|-----------|-----|------|
| `getServerSession is not a function` | NextAuth v5 removed this function | Use `auth()` instead | `src/lib/auth.ts`, `src/app/page.tsx` |
| NextAuth 500 error | Missing `handlers` export | Export `{ handlers, auth, ... }` | `src/lib/auth.ts` |
| API route fails | Using old v4 pattern | Import handlers, export directly | `src/app/api/auth/[...nextauth]/route.ts` |
| Missing env variables | No `.env.local` file | Create with NEXTAUTH_SECRET, etc | `.env.local` |
| WalletConnect 403 | Project ID not loading | Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID | `.env.local` |
| Missing components | Button & Card not created | Create UI components | `src/components/ui/` |

---

## 📋 The 4 Key Changes

### Change 1: Update `src/lib/auth.ts`

```diff
- import { NextAuthOptions } from 'next-auth'
+ import NextAuth from 'next-auth'
+ import type { NextAuthConfig } from 'next-auth'

- export const authOptions: NextAuthOptions = {
+ export const authConfig: NextAuthConfig = {
    providers: [ /* ... */ ],
    // ... rest of config
}

+ export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
```

### Change 2: Update `src/app/api/auth/[...nextauth]/route.ts`

```diff
- import NextAuth from 'next-auth'
- import { authOptions } from '@/lib/auth'
- const handler = NextAuth(authOptions)
- export { handler as GET, handler as POST }

+ import { handlers } from '@/lib/auth'
+ export const { GET, POST } = handlers
```

### Change 3: Update `src/app/page.tsx`

```diff
- import { getServerSession } from 'next-auth'
- import { authOptions } from '@/lib/auth'
+ import { auth } from '@/lib/auth'

export default async function HomePage() {
-   const session = await getServerSession(authOptions)
+   const session = await auth()
    // ... rest of code
}
```

### Change 4: Create `.env.local`

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<your-random-secret>
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your-project-id>
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

---

## 🔧 Quick Implementation Checklist

- [ ] Generate NEXTAUTH_SECRET: `openssl rand -hex 32`
- [ ] Get WalletConnect Project ID from https://cloud.walletconnect.com
- [ ] Create `.env.local` with all variables
- [ ] Update `src/lib/auth.ts` with new pattern
- [ ] Update `src/app/api/auth/[...nextauth]/route.ts`
- [ ] Update `src/app/page.tsx` to use `auth()`
- [ ] Create `src/components/ui/button.tsx`
- [ ] Create `src/components/ui/card.tsx`
- [ ] Create `src/lib/utils.ts`
- [ ] Run: `rm -rf .next node_modules && npm install`
- [ ] Restart dev server: `npm run dev`
- [ ] Test: Go to http://localhost:3000
- [ ] Verify no errors in console

---

## ❌ Common Mistakes

| Mistake | Problem | Fix |
|---------|---------|-----|
| Forgetting to restart dev server after `.env.local` changes | Environment variables not loaded | `Ctrl+C` then `npm run dev` |
| Mixing v4 and v5 patterns | Code breaks or throws errors | Use ONLY v5 pattern (auth, handlers) |
| Using `getServerSession` in v5 | "is not a function" error | Replace with `auth()` |
| Not exporting `handlers` from auth.ts | API routes fail | Add `export const { handlers, ... }` |
| Not creating `.env.local` | Authentication fails, WalletConnect 403 | Create file with all required variables |
| Forgetting `@/` path alias | "Module not found" errors | Verify tsconfig.json paths |
| Not creating UI components | Login page won't render | Create button.tsx and card.tsx |

---

## 🧪 How to Verify Everything Works

```bash
# 1. Check for errors
npm run type-check

# 2. Try to build
npm run build

# 3. Start dev server
npm run dev

# 4. Test authentication at http://localhost:3000
# - Should see login page (not error)
# - Try logging in with: test@volspike.com / password
# - Should see dashboard after login

# 5. Check browser console for no errors
# 6. Check /api/auth/session endpoint returns JSON with status 200
```

---

## 📞 Need Help?

**Error: "getServerSession is not a function"**
→ Make sure you updated BOTH auth.ts AND page.tsx  
→ Make sure you're importing `auth` from `@/lib/auth` (not next-auth)  
→ Restart dev server

**Error: "Module not found: Can't resolve '@/components/ui/button'"**
→ Create the file at `src/components/ui/button.tsx`  
→ Check tsconfig.json has correct path aliases  
→ Run `npm install` and restart dev server

**Error: "WalletConnect Project ID is still your-walletconnect-project-id"**
→ Create `.env.local` file  
→ Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID  
→ Restart dev server (IMPORTANT!)  
→ Open in incognito/private mode to clear cache

**Error: "/api/auth/session returns 500"**
→ Make sure handlers are exported from auth.ts  
→ Make sure route.ts imports handlers correctly  
→ Restart dev server

---

## 🎯 NextAuth v5 Key Concepts

### Old Pattern (v4) - ❌ DON'T USE
```typescript
// OLD WAY - BROKEN IN v5
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
const session = await getServerSession(authOptions)
```

### New Pattern (v5) - ✅ USE THIS
```typescript
// NEW WAY - v5 CORRECT
import { auth } from '@/lib/auth'
const session = await auth()
```

### Key Differences
- ✅ `auth()` replaces `getServerSession()`
- ✅ `handlers` replaces `NextAuth(options)` constructor
- ✅ `NextAuthConfig` replaces `NextAuthOptions`
- ✅ Simpler API routes: just export handlers

---

## 📁 File Structure Reference

```
volspike-nextjs-frontend/
├── .env.local                               ← CREATE THIS
├── .gitignore                               ← MUST INCLUDE .env.local
├── package.json                             ✅ Already has v5
├── src/
│   ├── lib/
│   │   ├── auth.ts                          ← UPDATE THIS
│   │   └── utils.ts                         ← CREATE THIS
│   ├── app/
│   │   ├── page.tsx                         ← UPDATE THIS
│   │   └── api/auth/[...nextauth]/
│   │       └── route.ts                     ← UPDATE THIS
│   └── components/
│       ├── ui/
│       │   ├── button.tsx                   ← CREATE THIS
│       │   ├── card.tsx                     ← CREATE THIS
│       │   ├── input.tsx                    ✅ Already exists
│       │   ├── label.tsx                    ✅ Already exists
│       │   └── checkbox.tsx                 ✅ Already exists
│       └── login-page.tsx                   ✅ Already exists
```

---

## 🚀 Final Validation

After all changes, run these commands:

```bash
# Type check
npm run type-check
# Expected: No errors

# Build
npm run build
# Expected: Builds successfully

# Lint
npm run lint
# Expected: No errors

# Dev server
npm run dev
# Expected: Starts on localhost:3000

# Browser test
# Navigate to http://localhost:3000
# Expected: See login page, no errors
```

---

**Last Updated:** October 25, 2025  
**NextAuth Version:** v5.0.0-beta.25  
**Next.js Version:** 15.0.0  
**Status:** Ready to Implement ✅

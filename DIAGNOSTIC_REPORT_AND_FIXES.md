# VolSpike NextAuth v5 + Next.js 15 Diagnostic Report & Fixes

**Report Date:** October 25, 2025  
**Status:** 🔴 Critical Issues Identified - Complete Workarounds Provided  
**NextAuth Version:** v5.0.0-beta.25  
**Next.js Version:** v15.0.0

---

## Executive Summary

Your project has **3 critical blocking issues** and **1 warning**. The primary root cause is that **NextAuth v5 has fundamentally changed its API**, and your code is using the deprecated v4 approach. Additionally, missing environment variables and a `.env.local` file are preventing the application from running.

**Time to Resolution:** 15-30 minutes if you follow these steps exactly.

---

## 🔴 CRITICAL ISSUE #1: NextAuth v5 API Change - getServerSession Deprecation

### Problem
```
TypeError: (0, next_auth__WEBPACK_IMPORTED_MODULE_2__.getServerSession) is not a function
```

### Root Cause
In **NextAuth v5**, the `getServerSession` function was **removed entirely**. The v5 API uses a new `auth()` function instead. Your code is trying to import a function that doesn't exist in v5.

### Impact
- ❌ Server-side session checking fails completely
- ❌ Authentication system cannot determine if user is logged in
- ❌ Cascades to cause 500 errors on API routes

### Solution: Update `src/app/page.tsx`

**Current (BROKEN):**
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function HomePage() {
    const session = await getServerSession(authOptions)
    // ... rest of code
}
```

**Fixed:**
```typescript
import { auth } from '@/lib/auth'

export default async function HomePage() {
    const session = await auth()
    // ... rest of code
}
```

### How This Works
In NextAuth v5, you need to:
1. Add an `auth()` export function to your `lib/auth.ts`
2. Call `auth()` directly in server components (no need to pass authOptions)
3. The `auth()` function automatically uses your NextAuth configuration

---

## 🔴 CRITICAL ISSUE #2: NextAuth Configuration Missing auth() Export

### Problem
Your `src/lib/auth.ts` exports only `authOptions`, but NextAuth v5 requires an `auth()` function.

### Root Cause
NextAuth v5 restructured the library. You need to wrap your configuration with `NextAuth()` to create the `auth()` function.

### Impact
- ❌ No way to call `auth()` from server components
- ❌ Server-side session checking impossible
- ❌ Type safety lost for sessions

### Solution: Update `src/lib/auth.ts`

**Current (INCOMPLETE):**
```typescript
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
    providers: [/* ... */],
    session: { strategy: 'jwt' },
    // ...
}
```

**Fixed:**
```typescript
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                // TODO: Implement actual user authentication
                if (credentials.email === 'test@volspike.com' && credentials.password === 'password') {
                    return {
                        id: '1',
                        email: 'test@volspike.com',
                        name: 'Test User',
                    }
                }

                return null
            }
        })
    ],
    session: {
        strategy: 'jwt',
    },
    pages: {
        signIn: '/auth/signin',
        signUp: '/auth/signup',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
            }
            return token
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id as string
            }
            return session
        },
    },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
```

### Key Changes
- ✅ Renamed `authOptions` to `authConfig` (v5 convention)
- ✅ Changed import from `NextAuthOptions` to `NextAuthConfig`
- ✅ Wrapped config with `NextAuth()` function
- ✅ Export destructured `handlers`, `auth`, `signIn`, `signOut`

---

## 🔴 CRITICAL ISSUE #3: NextAuth API Route Handler - Incorrect Export

### Problem
```
GET http://localhost:3000/api/auth/session 500 (Internal Server Error)
```

### Root Cause
Your API route handler is using the old v4 pattern which doesn't work with v5.

### Impact
- ❌ `/api/auth/session` endpoint crashes with 500 error
- ❌ Returns HTML error page instead of JSON
- ❌ Session endpoints don't work

### Solution: Update `src/app/api/auth/[...nextauth]/route.ts`

**Current (BROKEN):**
```typescript
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
```

**Fixed:**
```typescript
import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers
```

### Why This Works
- In v5, `NextAuth(config)` returns an object with `handlers` property
- `handlers` is an object with `{ GET, POST }` for API routes
- You export these directly - much cleaner!

---

## 🔴 CRITICAL ISSUE #4: Missing .env.local File

### Problem
NextAuth cannot initialize because required environment variables are missing.

### Root Cause
No `.env.local` file in your project root with required secrets.

### Impact
- ❌ NEXTAUTH_SECRET missing → Sessions won't sign/verify
- ❌ NEXTAUTH_URL missing → Redirects won't work
- ❌ NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID missing → Uses fallback "your-walletconnect-project-id"

### Solution: Create `.env.local`

Create a file at **`volspike-nextjs-frontend/.env.local`** with:

```bash
# NextAuth Configuration (REQUIRED)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-change-this-in-production-$(openssl rand -hex 32)

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Stripe (if using)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here

# WalletConnect (IMPORTANT - Get from https://cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_actual_walletconnect_project_id_here
```

### How to Generate NEXTAUTH_SECRET
```bash
# On macOS/Linux:
openssl rand -hex 32

# On Windows (PowerShell):
[System.Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

### Important Notes
- 🔐 **NEXTAUTH_SECRET** must be cryptographically random and >32 characters
- 🌍 **NEXTAUTH_URL** must match your actual domain (localhost for dev, yourdomain.com for production)
- 🚫 **Never commit `.env.local` to Git** - add to `.gitignore`
- 🔑 **Get WalletConnect Project ID** from https://cloud.walletconnect.com (free tier available)

---

## 🟡 WARNING: WalletConnect Environment Variable Not Being Read

### Problem
```
[Reown Config] Failed to fetch remote project configuration. Using local/default values.
GET https://api.web3modal.org/appkit/v1/config?projectId=your-walletconnect-project-id 403
```

### Root Cause
The environment variable `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is not being read. This could be because:
1. `.env.local` doesn't exist (most likely)
2. Variable name is misspelled
3. Next.js dev server wasn't restarted after adding the env file

### Impact
- ⚠️ WalletConnect uses fallback project ID
- ⚠️ 403 Forbidden error from WalletConnect API
- ⚠️ Wallet connection may not work properly

### Solution
1. ✅ Create `.env.local` file (see CRITICAL ISSUE #4)
2. ✅ Add `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_key_here`
3. ✅ **Restart the dev server** (`Ctrl+C` then `npm run dev`)
4. ✅ Verify environment variable loaded by checking browser console

### Verification
In your `src/components/web3-providers.tsx`, you can verify it's loaded:

```typescript
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
console.log('WalletConnect Project ID:', projectId)

if (projectId?.startsWith('your-walletconnect')) {
    console.warn('⚠️ WalletConnect Project ID is not configured!')
}
```

---

## 🟡 WARNING: Missing UI Components Path Resolution

### Problem
```
Module not found: Can't resolve '@/components/ui/input'
Module not found: Can't resolve '@/components/ui/label'
Module not found: Can't resolve '@/components/ui/checkbox'
```

### Root Cause
The UI components were created and look correct, but the path alias `@/` might not be resolving properly, or the components aren't being exported correctly.

### Impact
- ⚠️ Login page won't render
- ⚠️ Build fails
- ⚠️ TypeScript can't find component types

### Solution

#### Step 1: Verify Path Alias in `tsconfig.json`

Make sure your `tsconfig.json` has this configuration:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

#### Step 2: Verify Path Alias in `next.config.js`

Your `next.config.js` looks good, but ensure it exists and has the webpack configuration.

#### Step 3: Check Component Exports

The component files look correct. Make sure they're all in the right location:
- ✅ `src/components/ui/input.tsx`
- ✅ `src/components/ui/label.tsx`
- ✅ `src/components/ui/checkbox.tsx`

#### Step 4: Verify Radix UI Dependencies

Your `package.json` has all required dependencies:
- ✅ `@radix-ui/react-checkbox`: ^1.3.3
- ✅ `@radix-ui/react-label`: ^2.1.7

If you're still getting errors:

```bash
# Clear cache and reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache
rm -rf .next

# Restart dev server
npm run dev
```

#### Step 5: Ensure Utils File Exists

The components import from `@/lib/utils`. Make sure this file exists at `src/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

## 🔴 CRITICAL ISSUE #5: Missing Button Component

### Problem
Your `login-page.tsx` imports `Button` from `@/components/ui/button`, but this file doesn't appear to exist in the provided documents.

### Root Cause
The Button component is referenced but not provided/created.

### Solution: Create `src/components/ui/button.tsx`

```typescript
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

---

## 🔴 CRITICAL ISSUE #6: Missing Card Components

### Problem
Your `login-page.tsx` imports `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle` from `@/components/ui/card`, but this file doesn't exist.

### Solution: Create `src/components/ui/card.tsx`

```typescript
import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
```

---

## 📋 Step-by-Step Implementation Checklist

Follow these steps **in order**:

### Phase 1: Create Environment File (5 minutes)

- [ ] Create `.env.local` in project root with all required variables
- [ ] Generate a random NEXTAUTH_SECRET using `openssl rand -hex 32`
- [ ] Get WalletConnect Project ID from https://cloud.walletconnect.com
- [ ] Update NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env.local
- [ ] Add `.env.local` to `.gitignore` if not already there

### Phase 2: Update NextAuth Configuration (5 minutes)

- [ ] Update `src/lib/auth.ts` to export `auth()` function
- [ ] Change `authOptions` to `authConfig`
- [ ] Add `export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)`
- [ ] Import `NextAuthConfig` type instead of `NextAuthOptions`

### Phase 3: Fix API Route Handler (2 minutes)

- [ ] Update `src/app/api/auth/[...nextauth]/route.ts`
- [ ] Replace `const handler = NextAuth(authOptions)` with `import { handlers } from '@/lib/auth'`
- [ ] Export `handlers` directly: `export const { GET, POST } = handlers`

### Phase 4: Fix Page Component (2 minutes)

- [ ] Update `src/app/page.tsx`
- [ ] Replace `import { getServerSession } from 'next-auth'` with `import { auth } from '@/lib/auth'`
- [ ] Replace `const session = await getServerSession(authOptions)` with `const session = await auth()`

### Phase 5: Create Missing UI Components (10 minutes)

- [ ] Create `src/components/ui/button.tsx` (see above)
- [ ] Create `src/components/ui/card.tsx` (see above)
- [ ] Verify `src/lib/utils.ts` exists with `cn()` function
- [ ] Verify `tsconfig.json` has correct path aliases
- [ ] Verify `src/components/ui/input.tsx` exists ✅
- [ ] Verify `src/components/ui/label.tsx` exists ✅
- [ ] Verify `src/components/ui/checkbox.tsx` exists ✅

### Phase 6: Reinstall Dependencies & Restart (5 minutes)

- [ ] Run `npm install` to ensure all dependencies are installed
- [ ] Run `rm -rf .next` to clear Next.js cache
- [ ] Run `npm run dev` to start dev server
- [ ] Verify no console errors in browser DevTools
- [ ] Check that environment variables loaded: `console.log(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID)`

---

## 🧪 Testing Checklist

Once you've implemented all fixes:

### Authentication Flow
- [ ] Navigate to `http://localhost:3000/`
- [ ] Should see login page (not 500 error)
- [ ] Login form should render without component errors
- [ ] Try logging in with `test@volspike.com` / `password`
- [ ] Should see dashboard after login

### API Routes
- [ ] Check `/api/auth/session` in browser - should return JSON, not 500 error
- [ ] Session should contain user info after login

### Environment Variables
- [ ] Check browser console for WalletConnect initialization
- [ ] Should NOT see "your-walletconnect-project-id" in console
- [ ] Should NOT see 403 Forbidden from WalletConnect APIs

### Build
- [ ] Run `npm run build` - should complete without errors
- [ ] Check for TypeScript errors: `npm run type-check`
- [ ] Verify all UI components resolve correctly

---

## 📚 Additional Resources

### NextAuth v5 Documentation
- [NextAuth.js v5 Migration Guide](https://authjs.dev/getting-started/installation)
- [NextAuth.js API Reference](https://authjs.dev/reference)
- [NextAuth v5 with App Router](https://authjs.dev/guides/upgrade-to-v5)

### Next.js 15 Best Practices
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [App Router Guide](https://nextjs.org/docs/app)
- [Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

### Web3 Integration
- [RainbowKit Documentation](https://www.rainbowkit.com)
- [WalletConnect Cloud](https://cloud.walletconnect.com)
- [Wagmi Documentation](https://wagmi.sh)

---

## 🚨 Common Mistakes to Avoid

1. ❌ **Forgetting to restart dev server after `.env.local` changes**
   - ✅ Always restart with `Ctrl+C` then `npm run dev`

2. ❌ **Mixing NextAuth v4 and v5 patterns**
   - ✅ Use `auth()` not `getServerSession()`
   - ✅ Use `NextAuthConfig` not `NextAuthOptions`

3. ❌ **Committing `.env.local` to Git**
   - ✅ Add `.env.local` to `.gitignore`
   - ✅ Use `.env.example` instead

4. ❌ **Not generating a random NEXTAUTH_SECRET**
   - ✅ Use `openssl rand -hex 32` for production-grade security

5. ❌ **Forgetting to clear Node modules and Next.js cache**
   - ✅ Run `rm -rf node_modules .next && npm install`

6. ❌ **Using incorrect path aliases in tsconfig.json**
   - ✅ Ensure `"@/*": ["./src/*"]` is correct

---

## 🆘 Troubleshooting

### Issue: Still Getting "getServerSession is not a function"
**Solution:**
- Verify you updated BOTH `src/lib/auth.ts` AND `src/app/page.tsx`
- Verify you're importing from `@/lib/auth` (not `next-auth`)
- Restart dev server
- Clear `.next` folder

### Issue: Components Still Not Found
**Solution:**
- Verify components exist in `src/components/ui/`
- Run `npm install` to install dependencies
- Clear `.next` folder
- Check tsconfig.json path aliases
- Verify `src/lib/utils.ts` exists

### Issue: WalletConnect Still Getting 403
**Solution:**
- Verify `.env.local` exists in project root
- Verify `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set correctly
- Restart dev server after adding `.env.local`
- Get new Project ID from https://cloud.walletconnect.com if needed

### Issue: Build Fails with TypeScript Errors
**Solution:**
- Run `npm run type-check` to see all errors
- Verify all imports use correct paths (`@/` not `./`)
- Verify all components are exported correctly
- Check that types are imported correctly

---

## ✅ Success Indicators

When all fixes are implemented correctly, you should see:

1. ✅ Login page renders without errors
2. ✅ No 500 errors on `/api/auth/session`
3. ✅ Environment variables loading correctly
4. ✅ No "Module not found" errors in console
5. ✅ No "getServerSession is not a function" errors
6. ✅ Login form submits without errors
7. ✅ Dashboard shows after successful login
8. ✅ WalletConnect initializes without 403 errors
9. ✅ `npm run build` completes successfully
10. ✅ No TypeScript compilation errors

---

**Created:** October 25, 2025  
**Status:** Ready to Implement  
**Estimated Time:** 25-30 minutes

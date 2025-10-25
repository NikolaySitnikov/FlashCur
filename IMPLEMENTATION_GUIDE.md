# VolSpike NextAuth v5 Implementation Guide
## Exact Steps to Fix All Issues

**Total Time:** 25-30 minutes  
**Difficulty:** Medium  
**Last Updated:** October 25, 2025

---

## 🎯 Quick Reference: What's Wrong & What to Fix

| Issue | Problem | File to Update | Time |
|-------|---------|-----------------|------|
| NextAuth v5 API Change | `getServerSession` is deprecated | `src/lib/auth.ts`, `src/app/page.tsx` | 5 min |
| API Route Handler | Old v4 pattern | `src/app/api/auth/[...nextauth]/route.ts` | 2 min |
| Missing Environment | No `.env.local` | Create new `.env.local` | 5 min |
| Missing UI Components | `Button` & `Card` not found | `src/components/ui/button.tsx`, `src/components/ui/card.tsx` | 5 min |
| Path Resolution | `src/lib/utils.ts` missing | Create `src/lib/utils.ts` | 2 min |
| WalletConnect 403 | Project ID not loading | Already fixed by `.env.local` | 0 min |

---

## 📁 Step 1: Backup Your Current Files (2 minutes)

Before making changes, backup these files just in case:

```bash
# From your project root directory
mkdir -p backups
cp src/lib/auth.ts backups/auth.ts.backup
cp src/app/page.tsx backups/page.tsx.backup
cp src/app/api/auth/[...nextauth]/route.ts backups/route.ts.backup
```

---

## 🔧 Step 2: Create `.env.local` File (5 minutes)

### 2.1 Create the file

In your project root directory (same level as `package.json`), create a new file called `.env.local`:

**File Path:** `volspike-nextjs-frontend/.env.local`

### 2.2 Generate NEXTAUTH_SECRET

**On macOS/Linux:**
```bash
openssl rand -hex 32
```

**On Windows (PowerShell):**
```powershell
[System.Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Copy the output - you'll use it in the next step.

### 2.3 Get WalletConnect Project ID

1. Go to https://cloud.walletconnect.com
2. Sign up for free (or sign in)
3. Create a new project
4. Copy your Project ID

### 2.4 Add content to `.env.local`

Copy and paste this template, replacing the placeholder values:

```bash
# NextAuth Configuration (REQUIRED)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<paste-your-random-hex-string-here>

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Stripe (if using)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here

# WalletConnect (Get from https://cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<paste-your-walletconnect-project-id-here>
```

### 2.5 Add `.env.local` to `.gitignore`

Make sure your `.gitignore` includes:
```
.env.local
.env.*.local
```

**IMPORTANT:** Never commit `.env.local` to version control!

---

## 🔄 Step 3: Update NextAuth Configuration (5 minutes)

### 3.1 Update `src/lib/auth.ts`

**File Path:** `volspike-nextjs-frontend/src/lib/auth.ts`

**OLD CODE (DELETE THIS):**
```typescript
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            // ...
        })
    ],
    // ...
}
```

**NEW CODE (REPLACE WITH THIS):**
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

                // TODO: Implement actual user authentication logic
                // For now, return a mock user for development
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
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    pages: {
        signIn: '/auth/signin',
        signUp: '/auth/signup',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.email = user.email
            }
            return token
        },
        async session({ session, token }) {
            if (session.user && token) {
                session.user.id = token.id as string
                session.user.email = token.email as string
            }
            return session
        },
    },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
```

**What Changed:**
- ✅ `NextAuthOptions` → `NextAuthConfig`
- ✅ `authOptions` → `authConfig`
- ✅ Added `export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)`
- ✅ Import `NextAuth` function

---

## 🔄 Step 4: Update API Route Handler (2 minutes)

### 4.1 Update `src/app/api/auth/[...nextauth]/route.ts`

**File Path:** `volspike-nextjs-frontend/src/app/api/auth/[...nextauth]/route.ts`

**OLD CODE (DELETE THIS):**
```typescript
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
```

**NEW CODE (REPLACE WITH THIS):**
```typescript
import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers
```

**What Changed:**
- ✅ Much simpler! Just import and export handlers
- ✅ No need to create a handler variable

---

## 🔄 Step 5: Update Page Component (2 minutes)

### 5.1 Update `src/app/page.tsx`

**File Path:** `volspike-nextjs-frontend/src/app/page.tsx`

**OLD CODE (DELETE THIS):**
```typescript
import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Dashboard } from '@/components/dashboard'
import { LoginPage } from '@/components/login-page'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default async function HomePage() {
    const session = await getServerSession(authOptions)
    // ...
}
```

**NEW CODE (REPLACE WITH THIS):**
```typescript
import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { Dashboard } from '@/components/dashboard'
import { LoginPage } from '@/components/login-page'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default async function HomePage() {
    const session = await auth()

    if (!session) {
        return <LoginPage />
    }

    return (
        <main className="min-h-screen bg-background">
            <Suspense fallback={<LoadingSpinner />}>
                <Dashboard />
            </Suspense>
        </main>
    )
}
```

**What Changed:**
- ✅ `import { getServerSession } from 'next-auth'` → `import { auth } from '@/lib/auth'`
- ✅ `import { authOptions }` removed
- ✅ `await getServerSession(authOptions)` → `await auth()`

---

## 📦 Step 6: Create Missing UI Components (8 minutes)

### 6.1 Create `src/lib/utils.ts`

**File Path:** `volspike-nextjs-frontend/src/lib/utils.ts`

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### 6.2 Create `src/components/ui/button.tsx`

**File Path:** `volspike-nextjs-frontend/src/components/ui/button.tsx`

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

### 6.3 Create `src/components/ui/card.tsx`

**File Path:** `volspike-nextjs-frontend/src/components/ui/card.tsx`

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

## 🚀 Step 7: Clean & Restart (5 minutes)

### 7.1 Clean up and reinstall dependencies

```bash
# From your project root directory (volspike-nextjs-frontend/)

# Clear Node modules and lock file
rm -rf node_modules
rm package-lock.json

# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
npm install
```

### 7.2 Start the development server

```bash
npm run dev
```

### 7.3 Verify in browser

1. Go to `http://localhost:3000`
2. You should see the login page (not a 500 error)
3. Open browser DevTools (F12)
4. Check the Console tab for errors
5. You should NOT see:
   - ❌ "getServerSession is not a function"
   - ❌ "Module not found" errors
   - ❌ 500 errors

---

## ✅ Step 8: Testing

### 8.1 Test Authentication Flow

```
1. Navigate to http://localhost:3000
2. You should see login page
3. Login form should render without errors
4. Try logging in with:
   - Email: test@volspike.com
   - Password: password
5. After login, you should see dashboard
```

### 8.2 Test API Routes

```
1. Open browser DevTools (F12)
2. Go to Network tab
3. Check if /api/auth/session request returns:
   - ✅ Status: 200 (not 500)
   - ✅ Response: JSON (not HTML error)
   - ✅ Contains: user session info
```

### 8.3 Test Environment Variables

```
1. Open browser console
2. Type: console.log(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID)
3. Should show your actual Project ID (not "your-walletconnect-project-id")
```

### 8.4 Test Build

```bash
npm run build
npm run type-check
```

Should complete without errors.

---

## 🆘 Troubleshooting

### Problem: Still getting "getServerSession is not a function"

**Solution:**
1. Verify you updated `src/lib/auth.ts` with the new code
2. Verify you updated `src/app/page.tsx` to import `auth` from `@/lib/auth`
3. Make sure you're NOT importing from `next-auth` directly
4. Restart dev server: `Ctrl+C` then `npm run dev`
5. Clear cache: `rm -rf .next` then restart

### Problem: Components still not found

**Solution:**
1. Verify you created all UI component files
2. Verify path: `src/components/ui/button.tsx` (not `components/ui/button.tsx`)
3. Verify `src/lib/utils.ts` exists
4. Run: `npm install` to ensure dependencies
5. Clear cache: `rm -rf .next && npm run dev`

### Problem: WalletConnect still shows 403 error

**Solution:**
1. Verify `.env.local` exists in project root
2. Verify `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set correctly
3. IMPORTANT: Restart dev server after adding `.env.local`
4. Clear browser cache (or open in incognito mode)
5. Check: `console.log(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID)`

### Problem: Build fails with TypeScript errors

**Solution:**
1. Run `npm run type-check` to see all errors
2. Verify imports use `@/` not `./`
3. Verify all components exported correctly
4. Verify types imported correctly

---

## 📝 File Checklist

After implementing all steps, verify these files exist and are updated:

### Files Updated
- [ ] `src/lib/auth.ts` - Updated with new NextAuth v5 pattern
- [ ] `src/app/page.tsx` - Updated to use `auth()` instead of `getServerSession()`
- [ ] `src/app/api/auth/[...nextauth]/route.ts` - Updated to export handlers

### Files Created
- [ ] `.env.local` - Environment variables (DO NOT COMMIT)
- [ ] `src/lib/utils.ts` - Helper functions
- [ ] `src/components/ui/button.tsx` - Button component
- [ ] `src/components/ui/card.tsx` - Card component
- [ ] `.gitignore` - Contains `.env.local` entry

### Files Already Exist (No Changes)
- [ ] `src/components/ui/input.tsx` ✅
- [ ] `src/components/ui/label.tsx` ✅
- [ ] `src/components/ui/checkbox.tsx` ✅
- [ ] `src/components/login-page.tsx` ✅
- [ ] `package.json` ✅

---

## 🎉 Success Indicators

When everything is working correctly, you should see:

✅ Login page renders without errors  
✅ No "Module not found" errors in console  
✅ No "getServerSession is not a function" errors  
✅ `/api/auth/session` returns JSON with status 200  
✅ WalletConnect Project ID loads correctly  
✅ Login form submits without errors  
✅ Dashboard shows after successful login  
✅ `npm run build` completes successfully  
✅ `npm run type-check` shows no errors  

---

## 📚 Additional Resources

- [NextAuth v5 Migration Guide](https://authjs.dev/getting-started/installation)
- [NextAuth v5 API Reference](https://authjs.dev/reference)
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Environment Variables in Next.js](https://nextjs.org/docs/basic-features/environment-variables)

---

## ⏱️ Time Summary

| Step | Task | Time |
|------|------|------|
| 1 | Backup files | 2 min |
| 2 | Create `.env.local` | 5 min |
| 3 | Update `src/lib/auth.ts` | 3 min |
| 4 | Update API route | 2 min |
| 5 | Update page component | 2 min |
| 6 | Create UI components | 8 min |
| 7 | Clean & restart | 5 min |
| 8 | Testing & verification | 5 min |
| **Total** | **All steps** | **32 min** |

---

**Ready to implement?** Start with Step 1: Create `.env.local`!

Questions? Check the troubleshooting section above.

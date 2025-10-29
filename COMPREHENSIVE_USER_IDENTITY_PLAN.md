# Comprehensive User Identity & Profile Menu Implementation Plan

## Overview

This plan merges best practices from modern SaaS applications with a pragmatic, non-breaking implementation approach. It adds user identity display and a proper profile dropdown menu while maintaining all existing functionality.

## Current State Analysis

**Existing Infrastructure:**
- ✅ NextAuth session types already include `role` and `tier` (`src/types/next-auth.d.ts`)
- ✅ `SessionProvider` already wraps app (`src/components/providers.tsx`)
- ✅ Wagmi/RainbowKit configured for Web3 wallet integration
- ✅ Admin dashboard has working dropdown pattern (`admin-header.tsx`)
- ✅ Basic dropdown menu components exist (`src/components/ui/dropdown-menu.tsx`)
- ✅ Avatar component exists (`src/components/ui/avatar.tsx`)

**Issues to Fix:**
1. User icon in `header.tsx` (line 42) directly calls `signOut()` - immediate logout on click
2. No visible user identity (email/wallet) anywhere on dashboard
3. Settings button exists but doesn't navigate anywhere
4. No Settings page for regular users (only admin settings exist)

## Recommendations & Best Practices

### 1. User Identity Display Strategy

**Primary Location: Profile Dropdown Menu Header**
- Display avatar/initials, email/ENS name, shortened wallet address
- Show tier badge and role chip
- Most visible when user opens menu - keeps dashboard clean

**Secondary Location: Settings → Account Page**
- Full identity details with copy buttons
- Email verification status
- Wallet connection management
- Connected accounts overview

**Optional: Dashboard "Signed in as" Banner**
- Subtle line near page title: "Signed in as john@... • Elite"
- Clicking opens same profile menu
- Useful for clarity without cluttering header

**Reasoning:**
- Matches industry standards (Linear, Notion, Vercel, GitHub)
- Keeps dashboard clean while making identity accessible
- Prevents PII leakage in static HTML (client-side only)
- Scales well for future features

### 2. Profile Menu Implementation

**Structure:**
- **Header Section:** Avatar + name/email/ENS + tier badge + role chip
- **Menu Items:**
  - Settings → `/settings`
  - Billing / Manage Subscription → Stripe portal (if available)
  - Copy email (if email exists)
  - Copy address (if wallet connected)
  - Connected accounts (future)
  - Theme toggle (optional)
  - **Separator**
  - Log out → `signOut({ callbackUrl: '/' })`

**Behavior:**
- Dropdown opens on click (not immediate logout)
- Keyboard accessible (Tab, Enter, Arrow keys, Escape)
- Click outside closes menu
- Proper ARIA roles and labels

## Implementation Steps

### Step 1: Verify Session Context Setup

**File:** `volspike-nextjs-frontend/src/app/layout.tsx` ✅ Already correct
- Already has `export const dynamic = 'force-dynamic'`
- Already wrapped with `SessionProvider` via `Providers` component

**File:** `volspike-nextjs-frontend/src/app/dashboard/page.tsx` ✅ Already correct
- Already has `export const dynamic = 'force-dynamic'`
- Already wraps Dashboard with `SessionProvider`

**Action:** No changes needed - verified current setup is correct.

### Step 2: Enhance NextAuth Types (if needed)

**File:** `volspike-nextjs-frontend/src/types/next-auth.d.ts`

**Current State:** Types already include `tier`, `role`, `name`, `image` (optional)

**Optional Enhancement:** Add wallet address to session if stored:
```typescript
// Add to User interface if wallet address is stored in session:
walletAddress?: string | null
```

**Action:** Review if wallet address should be in session. If not, skip this step.

### Step 3: Create useUserIdentity Hook

**File:** `volspike-nextjs-frontend/src/hooks/use-user-identity.ts` (NEW)

**Purpose:** Centralize identity resolution from NextAuth + Wagmi

**Implementation:**
```typescript
'use client'

import { useSession } from 'next-auth/react'
import { useAccount, useEnsName } from 'wagmi'
import { useMemo } from 'react'

export interface UserIdentity {
    displayName: string
    email: string | null
    address: string | null
    ens: string | null
    role: 'USER' | 'ADMIN' | null
    tier: 'free' | 'pro' | 'elite' | null
    image: string | null
    isLoading: boolean
}

export function useUserIdentity(): UserIdentity {
    const { data: session, status: sessionStatus } = useSession()
    const { address, isConnected } = useAccount()
    const { data: ensName } = useEnsName({ address, enabled: !!address && isConnected })

    const isLoading = sessionStatus === 'loading'

    const identity = useMemo(() => {
        const email = session?.user?.email || null
        const walletAddress = address || null
        const ens = ensName || null

        // Determine display name priority: ENS > name > masked email > shortened address
        let displayName = 'User'
        if (ens) {
            displayName = ens
        } else if (session?.user?.name) {
            displayName = session.user.name
        } else if (email) {
            // Mask email: john@example.com -> john@ex...
            const [local, domain] = email.split('@')
            displayName = domain ? `${local}@${domain.slice(0, 2)}...` : email
        } else if (walletAddress) {
            // Shorten address: 0x1234...5678
            displayName = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
        }

        return {
            displayName,
            email,
            address: walletAddress,
            ens,
            role: session?.user?.role || null,
            tier: session?.user?.tier || null,
            image: session?.user?.image || null,
            isLoading,
        }
    }, [session, address, ensName, isLoading])

    return identity
}
```

**Key Features:**
- Combines NextAuth session + Wagmi wallet data
- Smart display name resolution (ENS > name > masked email > address)
- Memoized for performance
- Client-side only (no SSR issues)

### Step 4: Enhance Dropdown Menu Component (if needed)

**File:** `volspike-nextjs-frontend/src/components/ui/dropdown-menu.tsx`

**Current State:** Basic implementation exists

**Action:** 
1. First, verify admin dropdown works correctly
2. If admin dropdown works, current implementation is sufficient
3. If not working, enhance with:
   - `useState` for open/close state
   - Click-outside handler
   - Keyboard handlers (Escape to close)
   - Focus management

**Note:** Check `admin-header.tsx` dropdown functionality first before making changes.

### Step 5: Create UserMenu Component

**File:** `volspike-nextjs-frontend/src/components/user-menu.tsx` (NEW)

**Purpose:** Reusable user menu dropdown component

**Key Features:**
- Uses `useUserIdentity` hook
- Avatar with initials fallback
- Tier badge styling (Free: neutral, Pro: primary, Elite: amber)
- Role chip (Admin: subtle red/outline)
- Copy email/address functionality
- Proper accessibility

**Implementation Structure:**
```typescript
'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useUserIdentity } from '@/hooks/use-user-identity'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Settings, LogOut, Copy, CreditCard, Wallet } from 'lucide-react'
import { toast } from 'react-hot-toast'

export function UserMenu() {
    const router = useRouter()
    const identity = useUserIdentity()
    const [isOpen, setIsOpen] = useState(false)

    const handleCopy = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text)
            toast.success(`${label} copied`)
        } catch (err) {
            toast.error('Failed to copy')
        }
    }

    const getInitials = () => {
        if (identity.email) {
            return identity.email.slice(0, 2).toUpperCase()
        }
        if (identity.displayName) {
            return identity.displayName.slice(0, 2).toUpperCase()
        }
        return 'U'
    }

    const getTierBadgeColor = () => {
        switch (identity.tier) {
            case 'pro': return 'bg-blue-500'
            case 'elite': return 'bg-amber-500'
            default: return 'bg-gray-500'
        }
    }

    if (identity.isLoading) {
        return (
            <Button variant="outline" size="sm" disabled>
                <div className="h-4 w-4 animate-pulse rounded bg-muted" />
            </Button>
        )
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 w-9 rounded-full p-0">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={identity.image || undefined} alt={identity.displayName} />
                        <AvatarFallback>{getInitials()}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={identity.image || undefined} />
                                <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{identity.displayName}</p>
                                {identity.email && (
                                    <p className="text-xs text-muted-foreground truncate">{identity.email}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            {identity.tier && (
                                <Badge variant="secondary" className={`text-xs ${getTierBadgeColor()}`}>
                                    {identity.tier.charAt(0).toUpperCase() + identity.tier.slice(1)} Tier
                                </Badge>
                            )}
                            {identity.role === 'ADMIN' && (
                                <Badge variant="outline" className="text-xs border-red-500 text-red-500">
                                    Admin
                                </Badge>
                            )}
                        </div>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                </DropdownMenuItem>
                {/* Billing - only show if Stripe configured */}
                {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && (
                    <DropdownMenuItem onClick={() => router.push('/settings/billing')}>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Billing
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {identity.email && (
                    <DropdownMenuItem onClick={() => handleCopy(identity.email!, 'Email')}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy email
                    </DropdownMenuItem>
                )}
                {identity.address && (
                    <DropdownMenuItem onClick={() => handleCopy(identity.address!, 'Address')}>
                        <Wallet className="h-4 w-4 mr-2" />
                        Copy address
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="text-red-600 focus:text-red-600"
                >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
```

### Step 6: Update Header Component

**File:** `volspike-nextjs-frontend/src/components/header.tsx`

**Changes:**
1. Import `UserMenu` component
2. Import `Link` from `next/link` (already imported)
3. Replace User button with `<UserMenu />`
4. Add navigation to Settings button

**Specific Changes:**
```typescript
// Add imports
import { UserMenu } from '@/components/user-menu'

// Replace lines 35-45:
{session ? (
    <div className="flex items-center gap-2 sm:gap-3">
        <span className="hidden text-sm text-muted-foreground sm:inline">
            {session.user?.tier || 'free'} tier
        </span>
        <Link href="/settings">
            <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
            </Button>
        </Link>
        <UserMenu />
    </div>
) : (
    // ... existing unauthenticated state
)}
```

### Step 7: Add Optional "Signed in as" Banner

**File:** `volspike-nextjs-frontend/src/components/dashboard.tsx` (optional enhancement)

**Purpose:** Add subtle identity banner that opens UserMenu

**Implementation:**
```typescript
// Add after line 191 (after <Header />)
<div className="container mx-auto px-4 py-2">
    <UserIdentityBanner />
</div>

// Create component:
function UserIdentityBanner() {
    const { data: session } = useSession()
    const identity = useUserIdentity()
    const [menuOpen, setMenuOpen] = useState(false)

    if (!session || identity.isLoading) return null

    return (
        <button
            onClick={() => setMenuOpen(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
            Signed in as {identity.displayName} • {identity.tier ? identity.tier.charAt(0).toUpperCase() + identity.tier.slice(1) : 'Free'} Tier
        </button>
    )
}
```

**Note:** This is optional - can be added later if desired for clarity.

### Step 8: Create Settings Page

**File:** `volspike-nextjs-frontend/src/app/settings/page.tsx` (NEW)

**Purpose:** Full account settings page with identity details

**Key Sections:**
- Account Information (email, wallet, tier, role)
- Copy buttons for email/address
- Wallet connection management
- Tier upgrade link

**Implementation:**
```typescript
'use client'

import { redirect } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useUserIdentity } from '@/hooks/use-user-identity'
import { Copy, Check, Wallet, ExternalLink } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function SettingsPage() {
    const { data: session, status } = useSession()
    const identity = useUserIdentity()

    if (status === 'loading') {
        return <div>Loading...</div>
    }

    if (!session?.user) {
        redirect('/auth')
    }

    const handleCopy = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text)
            toast.success(`${label} copied`)
        } catch (err) {
            toast.error('Failed to copy')
        }
    }

    const getTierBadgeColor = () => {
        switch (identity.tier) {
            case 'pro': return 'bg-blue-500'
            case 'elite': return 'bg-amber-500'
            default: return 'bg-gray-500'
        }
    }

    return (
        <div className="flex-1 bg-background">
            <Header />
            <main className="container mx-auto px-4 py-8 max-w-4xl">
                <Card>
                    <CardHeader>
                        <CardTitle>Settings</CardTitle>
                        <CardDescription>Manage your account settings and preferences</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {/* Account Information */}
                            <div>
                                <h3 className="text-sm font-medium mb-4">Account Information</h3>
                                <div className="space-y-4">
                                    {/* Email */}
                                    {identity.email && (
                                        <div className="flex items-center justify-between py-2 border-b">
                                            <div className="flex-1">
                                                <p className="text-sm text-muted-foreground">Email</p>
                                                <p className="text-sm font-medium">{identity.email}</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleCopy(identity.email!, 'Email')}
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}

                                    {/* Wallet Address */}
                                    {identity.address && (
                                        <div className="flex items-center justify-between py-2 border-b">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-muted-foreground">Wallet Address</p>
                                                <p className="text-sm font-medium font-mono truncate">
                                                    {identity.ens || identity.address}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleCopy(identity.address!, 'Address')}
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}

                                    {/* Role */}
                                    <div className="flex items-center justify-between py-2 border-b">
                                        <div className="flex-1">
                                            <p className="text-sm text-muted-foreground">Role</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant={identity.role === 'ADMIN' ? 'destructive' : 'secondary'}>
                                                    {identity.role || 'USER'}
                                                </Badge>
                                                {identity.role === 'ADMIN' && (
                                                    <Link href="/admin">
                                                        <Button variant="link" size="sm" className="h-auto p-0">
                                                            Go to Admin Dashboard
                                                            <ExternalLink className="h-3 w-3 ml-1" />
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tier */}
                                    <div className="flex items-center justify-between py-2">
                                        <div className="flex-1">
                                            <p className="text-sm text-muted-foreground">Subscription Tier</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge className={`${getTierBadgeColor()} text-white`}>
                                                    {identity.tier ? identity.tier.charAt(0).toUpperCase() + identity.tier.slice(1) : 'Free'} Tier
                                                </Badge>
                                                {identity.tier !== 'elite' && (
                                                    <Link href="/upgrade">
                                                        <Button variant="link" size="sm" className="h-auto p-0">
                                                            Upgrade
                                                            <ExternalLink className="h-3 w-3 ml-1" />
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
```

**Note:** This is a client component because it uses hooks. If you prefer server component, extract the identity logic.

### Step 9: Ensure Dynamic Routes

**Files to verify:**
- ✅ `volspike-nextjs-frontend/src/app/layout.tsx` - already has `force-dynamic`
- ✅ `volspike-nextjs-frontend/src/app/dashboard/page.tsx` - already has `force-dynamic`
- `volspike-nextjs-frontend/src/app/settings/page.tsx` - add `force-dynamic` (see Step 8)

**Action:** Verify all routes using cookies/headers have `export const dynamic = 'force-dynamic'`

## Testing Plan

### Test 1: Profile Menu Opens and Closes
**Steps:**
1. Log in to dashboard as `test@volspike.com`
2. Click profile icon (avatar/initials) in top-right
3. Verify dropdown menu appears below icon
4. Click outside menu - verify menu closes
5. Press Escape key - verify menu closes
6. Press Tab to focus profile icon, Enter to open menu

**Expected Results:**
- Menu opens smoothly without logging out
- Menu positioned correctly below icon
- Menu closes on outside click
- Menu closes on Escape key
- Keyboard navigation works

### Test 2: User Identity Display - Email User
**Steps:**
1. Log in with email/password (`test@volspike.com`)
2. Click profile icon
3. Verify email displayed in menu header
4. Verify tier badge displayed (e.g., "Free Tier")
5. Verify avatar shows initials (e.g., "TE")
6. Click "Copy email" - verify toast notification
7. Navigate to Settings page
8. Verify full email displayed with copy button

**Expected Results:**
- Email clearly visible in dropdown header
- Tier badge correct color and text
- Avatar shows correct initials
- Copy functionality works
- Settings page shows full email

### Test 3: User Identity Display - Web3 User
**Steps:**
1. Connect wallet via RainbowKit
2. Sign in with Web3 (SIWE)
3. Click profile icon
4. Verify ENS name or shortened address displayed
5. Verify tier badge displayed
6. Verify "Copy address" menu item appears
7. Click "Copy address" - verify toast
8. Navigate to Settings page
9. Verify full address displayed

**Expected Results:**
- Wallet address/ENS displayed correctly
- Copy functionality works
- Settings page shows full address
- ENS name preferred over address if available

### Test 4: Profile Menu Navigation
**Steps:**
1. Log in to dashboard
2. Click profile icon
3. Click "Settings" menu item
4. Verify navigation to `/settings` page
5. Navigate back to dashboard
6. Click profile icon
7. Click "Billing" (if available) - verify navigation
8. Verify all menu items are clickable

**Expected Results:**
- Settings link navigates correctly
- Billing link navigates (if Stripe configured)
- All menu items functional
- No navigation errors

### Test 5: Logout Functionality
**Steps:**
1. Log in to dashboard
2. Click profile icon
3. Click "Sign Out" menu item (last item)
4. Verify user is logged out
5. Verify redirect to `/auth` page
6. Verify cannot access dashboard without login
7. Verify session is cleared

**Expected Results:**
- Logout works correctly
- Redirects to `/auth` page
- Session cleared
- Dashboard requires re-authentication
- No errors in console

### Test 6: Settings Button Navigation
**Steps:**
1. Log in to dashboard
2. Click Settings gear icon (separate from profile menu)
3. Verify navigation to `/settings` page
4. Verify settings page loads correctly
5. Verify user identity displayed on settings page

**Expected Results:**
- Settings icon works independently
- Navigation works correctly
- No conflicts with profile menu
- Settings page displays identity correctly

### Test 7: Responsive Design
**Steps:**
1. Test on desktop (1920x1080)
2. Test on tablet (768x1024)
3. Test on mobile (375x667)
4. Verify dropdown menu positioning on all sizes
5. Verify text doesn't overflow on small screens
6. Verify touch targets are adequate (minimum 44x44px)
7. Verify menu doesn't overflow viewport

**Expected Results:**
- Menu positions correctly on all screen sizes
- Text remains readable
- Touch targets adequate
- Menu doesn't overflow viewport
- Responsive layout works

### Test 8: Keyboard Navigation & Accessibility
**Steps:**
1. Log in to dashboard
2. Tab to profile icon
3. Press Enter/Space to open menu
4. Use Arrow keys to navigate menu items
5. Press Enter on Settings - verify navigation
6. Press Enter on Sign Out - verify logout
7. Press Escape - verify menu closes
8. Verify focus returns to trigger after menu closes
9. Test with screen reader (VoiceOver/TalkBack)

**Expected Results:**
- All interactive elements focusable
- Keyboard navigation works correctly
- Menu items activate with Enter
- Escape closes menu
- Focus management correct
- Screen reader announces menu items correctly

### Test 9: Loading States
**Steps:**
1. Navigate to dashboard
2. While session is loading, verify profile icon shows loading state
3. Verify no flicker or PII leakage during loading
4. Verify smooth transition to loaded state

**Expected Results:**
- Loading state shows skeleton/disabled button
- No PII visible during loading
- Smooth transition to loaded state
- No layout shifts

### Test 10: No Regression Testing
**Steps:**
1. Verify market data still loads correctly
2. Verify volume alerts still work
3. Verify tier display in header still works
4. Verify theme toggle still works
5. Verify WebSocket connection still works
6. Verify all existing dashboard features function
7. Verify sign-in/sign-out flows work (email, OAuth, SIWE)
8. Verify admin routes still protected

**Expected Results:**
- No existing functionality broken
- Dashboard loads normally
- Market data displays correctly
- All features work as before
- Authentication flows unchanged
- Admin routes still protected

### Test 11: Multiple User Types
**Steps:**
1. Test with free tier user
2. Test with pro tier user (if available)
3. Test with elite tier user (if available)
4. Test with admin user
5. Verify tier badges display correctly for each
6. Verify role chips display correctly
7. Verify settings page shows correct tier/role

**Expected Results:**
- Tier displays correctly for all tiers
- Role displays correctly
- Badge colors correct
- No errors with different user types

### Test 12: Session State Handling
**Steps:**
1. Log in to dashboard
2. Wait for session to expire (or manually expire)
3. Click profile icon
4. Verify error handling (graceful degradation)
5. Verify redirect to login if session invalid
6. Verify no crashes on expired session

**Expected Results:**
- No crashes on expired session
- Graceful error handling
- Proper redirect to login
- No console errors

### Test 13: Copy Functionality
**Steps:**
1. Log in to dashboard
2. Click profile icon
3. Click "Copy email" (if email exists)
4. Verify toast notification appears
5. Paste clipboard - verify email copied correctly
6. Click "Copy address" (if wallet connected)
7. Verify toast notification appears
8. Paste clipboard - verify address copied correctly
9. Test on Settings page copy buttons

**Expected Results:**
- Copy buttons work correctly
- Toast notifications appear
- Clipboard content correct
- Works on all browsers (Chrome, Firefox, Safari, Edge)

### Test 14: Cross-Browser Testing
**Steps:**
1. Test on Chrome (desktop and mobile)
2. Test on Firefox (desktop)
3. Test on Safari (desktop and iOS)
4. Test on Edge
5. Verify dropdown menu works on all browsers
6. Verify copy functionality works on all browsers
7. Verify keyboard navigation works on all browsers

**Expected Results:**
- All browsers render correctly
- Dropdown menu works on all browsers
- Copy functionality works (may require permission on some browsers)
- Keyboard navigation works consistently

### Test 15: Performance Testing
**Steps:**
1. Open dashboard
2. Monitor network requests
3. Verify no unnecessary re-renders
4. Verify menu opens instantly
5. Verify no layout shifts
6. Check Lighthouse performance score

**Expected Results:**
- No unnecessary API calls
- Menu opens instantly
- No layout shifts
- Performance score maintained
- Hook memoization working correctly

## Implementation Checklist

### Phase 1: Foundation
- [ ] Verify SessionProvider setup (already done ✅)
- [ ] Review NextAuth types (already correct ✅)
- [ ] Create `use-user-identity.ts` hook
- [ ] Test hook with email user
- [ ] Test hook with Web3 user

### Phase 2: User Menu Component
- [ ] Create `user-menu.tsx` component
- [ ] Add avatar with initials fallback
- [ ] Add tier badge styling
- [ ] Add role chip styling
- [ ] Add copy email functionality
- [ ] Add copy address functionality
- [ ] Add Settings navigation
- [ ] Add Sign Out functionality
- [ ] Test dropdown opens/closes
- [ ] Test keyboard navigation
- [ ] Test accessibility

### Phase 3: Header Integration
- [ ] Update `header.tsx` imports
- [ ] Replace User button with `<UserMenu />`
- [ ] Add Settings button navigation
- [ ] Test profile menu works
- [ ] Test Settings button works
- [ ] Verify no regressions

### Phase 4: Settings Page
- [ ] Create `app/settings/page.tsx`
- [ ] Add Account Information section
- [ ] Add email display with copy
- [ ] Add wallet address display with copy
- [ ] Add tier display with upgrade link
- [ ] Add role display with admin link
- [ ] Add `force-dynamic` export
- [ ] Test page loads correctly
- [ ] Test copy functionality
- [ ] Test navigation

### Phase 5: Optional Enhancements
- [ ] Add "Signed in as" banner (optional)
- [ ] Add Billing link (if Stripe configured)
- [ ] Add Connected Accounts section (future)
- [ ] Enhance dropdown with state management (if needed)

### Phase 6: Testing
- [ ] Run all functional tests (Test 1-6)
- [ ] Run accessibility tests (Test 8)
- [ ] Run responsive tests (Test 7)
- [ ] Run regression tests (Test 10)
- [ ] Run cross-browser tests (Test 14)
- [ ] Run performance tests (Test 15)

### Phase 7: Polish
- [ ] Verify all copy buttons work
- [ ] Verify toast notifications work
- [ ] Verify error handling
- [ ] Verify loading states
- [ ] Verify dark/light theme support
- [ ] Remove console.logs (if any)
- [ ] Verify no PII in logs

## Files to Create/Modify

### New Files:
1. `volspike-nextjs-frontend/src/hooks/use-user-identity.ts` - Identity hook
2. `volspike-nextjs-frontend/src/components/user-menu.tsx` - User menu component
3. `volspike-nextjs-frontend/src/app/settings/page.tsx` - Settings page

### Modified Files:
1. `volspike-nextjs-frontend/src/components/header.tsx` - Replace User button with UserMenu
2. `volspike-nextjs-frontend/src/components/ui/dropdown-menu.tsx` - Potentially enhance (verify admin dropdown first)
3. `volspike-nextjs-frontend/src/types/next-auth.d.ts` - Optional wallet address addition

### Verified Files (No Changes Needed):
1. `volspike-nextjs-frontend/src/app/layout.tsx` - Already has SessionProvider ✅
2. `volspike-nextjs-frontend/src/components/providers.tsx` - Already wraps with SessionProvider ✅
3. `volspike-nextjs-frontend/src/app/dashboard/page.tsx` - Already has force-dynamic ✅

## Risk Assessment

**Low Risk:**
- Changes isolated to header and new components
- Following existing admin pattern reduces risk
- Settings page is new route, won't affect existing pages
- Hook-based approach is testable and maintainable

**Mitigation Strategies:**
1. Implement in phases (hook → menu → header → settings)
2. Test each phase before moving to next
3. Keep old logout button code commented until verified
4. Feature flag optional (can enable/disable UserMenu)
5. Monitor error logs after deployment

## Success Criteria

1. ✅ Profile icon opens dropdown menu instead of logging out immediately
2. ✅ User email/ENS/address visible in dropdown menu header
3. ✅ User tier badge visible and correctly styled
4. ✅ User role chip visible (if Admin)
5. ✅ Settings link navigates to settings page
6. ✅ Settings page displays user email and tier
7. ✅ Copy email/address functionality works
8. ✅ Logout button works correctly
9. ✅ No existing functionality broken
10. ✅ Responsive design works on all screen sizes
11. ✅ Keyboard navigation works correctly
12. ✅ Accessibility standards met (WCAG AA)
13. ✅ No PII leakage in static HTML
14. ✅ Performance maintained (no regressions)
15. ✅ Code follows existing patterns and conventions

## Rollout Strategy

**Phase 1: Internal Testing (Week 1)**
- Implement hook and UserMenu component
- Test locally with email and Web3 users
- Verify no regressions

**Phase 2: Staged Rollout (Week 2)**
- Deploy to staging environment
- Test with real users (if available)
- Monitor error logs
- Fix any issues

**Phase 3: Production Deployment (Week 3)**
- Deploy to production
- Monitor error logs closely
- Verify analytics/telemetry (if implemented)
- Gather user feedback

## Notes

- **Dropdown Menu Enhancement:** Check admin dropdown functionality first. If it works, current implementation is sufficient. If not, enhance with proper state management.

- **Billing Link:** Only show if `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is configured. Can be feature-flagged.

- **Wallet Address in Session:** Review if wallet address should be stored in NextAuth session. If not, rely on Wagmi `useAccount` hook only.

- **"Signed in as" Banner:** Optional feature. Can be added later if desired for clarity.

- **Performance:** Hook uses `useMemo` to prevent unnecessary re-renders. Verify memoization working correctly.

- **Accessibility:** Ensure all interactive elements have proper ARIA labels and roles. Test with screen readers.

- **Security:** No PII in static HTML. All identity data comes from client-side session. Verify this in production builds.


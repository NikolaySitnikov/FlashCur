# Testing Ad Banner Locally

This guide will help you test the advertisement banner for free tier users on your local development environment.

## Prerequisites

1. **PostgreSQL Database Running**
   ```bash
   # Start PostgreSQL with Docker (if not already running)
   docker run -d \
     --name volspike-postgres \
     -e POSTGRES_DB=volspike \
     -e POSTGRES_USER=volspike \
     -e POSTGRES_PASSWORD=volspike_password \
     -p 5432:5432 \
     timescale/timescaledb:latest-pg15
   ```

2. **Environment Variables Configured**
   - Frontend: `volspike-nextjs-frontend/.env.local`
   - Backend: `volspike-nodejs-backend/.env` (optional, only if testing auth)

## Step-by-Step Testing

### 1. Start the Frontend

```bash
cd volspike-nextjs-frontend
npm install  # If not already installed
npm run dev
```

The frontend should start at `http://localhost:3000`

### 2. Ensure You Have a Free Tier User

**Option A: Create a New User via Sign Up**
1. Navigate to `http://localhost:3000/signup`
2. Sign up with a new email address
3. New users default to `free` tier automatically

**Option B: Create Test User via Script**
```bash
cd volspike-nodejs-backend

# Make sure DATABASE_URL is set in .env
# Then run the seed script
npx ts-node src/scripts/seed-prod-user.ts

# Or set environment variables:
SEED_USER_EMAIL=freeuser@test.com \
SEED_USER_PASSWORD=TestPassword123! \
SEED_USER_TIER=free \
npx ts-node src/scripts/seed-prod-user.ts
```

**Option C: Check/Update Existing User Tier**
```bash
# Connect to your database
psql $DATABASE_URL

# Check user tier
SELECT email, tier FROM users WHERE email = 'your-email@example.com';

# Set user to free tier if needed
UPDATE users SET tier = 'free' WHERE email = 'your-email@example.com';
```

### 3. Test the Banner Appears

1. **Log in as a free tier user**
   - Go to `http://localhost:3000/auth`
   - Sign in with your free tier account

2. **Navigate to Dashboard**
   - After login, you should be redirected to `/dashboard`
   - **Expected**: You should see the ad banner at the top of the dashboard

3. **Verify Banner Content**
   - ✅ Should display "Unlock Pro Features" heading
   - ✅ Should show "Upgrade Now" badge
   - ✅ Should list Pro tier benefits
   - ✅ Should have "Upgrade to Pro" button
   - ✅ Should show pricing "$29/month"
   - ✅ Should have dismiss (X) button

### 4. Test Dismiss Functionality

1. **Click the X button** (top-right corner of banner)
   - **Expected**: Banner disappears immediately

2. **Refresh the page** (F5 or Cmd+R)
   - **Expected**: Banner should NOT reappear (dismissed state saved in localStorage)

3. **Clear localStorage and refresh**
   ```javascript
   // Open browser console (F12)
   localStorage.removeItem('volspike_ad_banner_dismissed')
   localStorage.removeItem('volspike_ad_banner_dismissed_timestamp')
   // Then refresh the page
   ```
   - **Expected**: Banner should reappear

### 5. Test Banner Reappears After 24 Hours

```javascript
// In browser console, simulate 24+ hours passing:
localStorage.setItem('volspike_ad_banner_dismissed', 'true')
localStorage.setItem('volspike_ad_banner_dismissed_timestamp', (Date.now() - 25 * 60 * 60 * 1000).toString())
// Refresh page - banner should reappear
```

### 6. Test Upgrade Button

1. **Click "Upgrade to Pro" button**
   - **Expected**: Should navigate to `/settings` page

### 7. Test Banner Doesn't Show for Non-Free Tiers

**Test with Pro Tier:**
```bash
# Update user to pro tier
psql $DATABASE_URL -c "UPDATE users SET tier = 'pro' WHERE email = 'your-email@example.com';"
```
- **Expected**: Banner should NOT appear on dashboard

**Test with Elite Tier:**
```bash
# Update user to elite tier
psql $DATABASE_URL -c "UPDATE users SET tier = 'elite' WHERE email = 'your-email@example.com';"
```
- **Expected**: Banner should NOT appear on dashboard

### 8. Test Responsive Design

1. **Desktop View** (default)
   - Banner should be full width
   - Content should be horizontal layout
   - All elements visible

2. **Mobile View** (resize browser or use DevTools)
   - Banner should adapt to smaller screens
   - Content should wrap appropriately
   - Buttons should be accessible

### 9. Test Dark Mode

1. **Toggle dark mode** (if theme toggle available)
   - **Expected**: Banner colors should adapt to dark theme
   - Background gradients should be darker variants
   - Text should remain readable

## Quick Test Checklist

- [ ] Banner appears for free tier users
- [ ] Banner does NOT appear for pro/elite users
- [ ] Banner can be dismissed
- [ ] Dismissed state persists after refresh
- [ ] Banner reappears after clearing localStorage
- [ ] Upgrade button navigates to settings
- [ ] Banner is responsive (mobile/desktop)
- [ ] Banner works in dark mode
- [ ] No console errors

## Troubleshooting

### Banner Not Showing

1. **Check user tier:**
   ```bash
   # In your database
   SELECT email, tier FROM users WHERE email = 'your-email@example.com';
   ```
   - Must be `free` tier

2. **Check localStorage:**
   ```javascript
   // In browser console
   console.log(localStorage.getItem('volspike_ad_banner_dismissed'))
   ```
   - If `'true'`, clear it or wait 24 hours

3. **Check browser console for errors**
   - Look for TypeScript/React errors

### Banner Shows for Non-Free Users

1. **Verify session tier:**
   - Check `session.user.tier` in browser console
   - May need to log out and log back in after tier change

### Styling Issues

1. **Check Tailwind CSS is compiling:**
   ```bash
   # Restart dev server
   npm run dev
   ```

2. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```

## Expected Visual Result

The banner should display as a beautiful card with:
- Gradient background (blue to purple)
- Sparkles icon in a circular gradient badge
- Professional typography
- Smooth hover effects
- Clean dismiss button

## Next Steps After Testing

Once everything works:
1. ✅ Banner appears correctly for free users
2. ✅ Dismiss functionality works
3. ✅ Upgrade button works
4. ✅ No console errors

The implementation is ready for production!

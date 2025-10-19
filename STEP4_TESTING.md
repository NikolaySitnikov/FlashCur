# ✅ Step 4: Pricing Page - Testing Guide

## 🧪 Manual Testing Instructions

###Prerequisites

Make sure you've completed Steps 1-3 and have the server running.

---

## 🚀 Start the Flask Server

```bash
cd "/Users/nikolaysitnikov/Documents/Documents_Nik_MacBook/Everyday Life/AI/VolumeFunding/FlashCur"
python app.py
```

**Expected output:**
```
🗄️  Database initialized
🔐 Authentication system initialized
* Running on http://0.0.0.0:8081
```

---

## ✅ Test 1: Access Pricing Page (Guest User)

### What to Test
Verify pricing page is accessible without logging in.

### Steps
1. Open browser in incognito/private mode (or clear cookies)
2. Visit: `http://localhost:8081/pricing`

### Expected Result
- ✅ Pricing page loads successfully
- ✅ Beautiful hero section with "Choose Your Plan"
- ✅ 3 pricing cards visible: Free, Pro (featured), Elite
- ✅ Pro card is highlighted/"Most Popular"
- ✅ All features lists are readable
- ✅ Comparison table at the bottom
- ✅ FAQ section visible
- ✅ Footer CTA with "Start Free" and "Sign In" buttons
- ✅ Theme toggle button works (top right)
- ✅ "Back to Dashboard" link redirects to login (since not authenticated)

### Screenshots to Verify
- Hero section with gradient title
- 3 pricing cards side-by-side (desktop)
- Feature comparison table
- FAQ grid

---

## ✅ Test 2: Pricing Page While Logged In

### Steps
1. Login as: `test-free@example.com` / `password123`
2. Click the **"💎 Pricing"** button in the dashboard header
   (or visit `http://localhost:8081/pricing`)

### Expected Result
- ✅ Pricing page loads
- ✅ Banner shows: "You're currently on the **Free Plan**"
- ✅ Free tier card has **"Current Plan"** badge (top right)
- ✅ Free tier CTA button says **"Your Current Plan"** (disabled/gray)
- ✅ Pro tier CTA button says **"Upgrade to Pro"**
- ✅ Elite tier CTA button says **"Upgrade to Elite"**
- ✅ Footer CTA shows **"Go to Dashboard"** button (instead of Start Free/Sign In)
- ✅ "Back to Dashboard" link works

---

## ✅ Test 3: Current Plan Highlighting (All Tiers)

### Test 3A: Free Tier User

### Steps
1. Login as `test-free@example.com` / `password123`
2. Visit: `http://localhost:8081/pricing`

### Expected Result
- ✅ Free card has green border (#00ff88 dark / #10b981 light)
- ✅ "Current Plan" badge on Free card
- ✅ Free CTA button is disabled: "Your Current Plan"
- ✅ Pro shows: "Upgrade to Pro"
- ✅ Elite shows: "Upgrade to Elite"

### Test 3B: Pro Tier User

### Steps
1. Logout
2. Login as `test-pro@example.com` / `password123`
3. Visit: `http://localhost:8081/pricing`

### Expected Result
- ✅ Banner: "You're currently on the **Pro Plan**"
- ✅ Pro card highlighted with "Current Plan" badge
- ✅ Pro CTA: "Your Current Plan" (disabled)
- ✅ Free shows: "Downgrade" button
- ✅ Elite shows: "Upgrade to Elite"

### Test 3C: Elite Tier User

### Steps
1. Logout
2. Login as `test-elite@example.com` / `password123`
3. Visit: `http://localhost:8081/pricing`

### Expected Result
- ✅ Banner: "You're currently on the **Elite Plan**"
- ✅ Elite card highlighted
- ✅ Elite CTA: "Your Current Plan" (disabled)
- ✅ Free shows: "Downgrade" button
- ✅ Pro shows: "Downgrade to Pro" button
- ✅ No "Upgrade" buttons (already on highest tier)

---

## ✅ Test 4: Click Upgrade Buttons (Stub Functionality)

### Test 4A: Upgrade to Pro (from Free)

### Steps
1. Login as `test-free@example.com` / `password123`
2. Go to pricing page
3. Click **"Upgrade to Pro"** button

### Expected Result
- ✅ Redirected back to pricing page
- ✅ Flash message appears: "🚀 Upgrade to Pro tier! Payment integration coming soon..."
- ✅ Message auto-hides after 5 seconds
- ✅ Still shows as Free tier (no actual upgrade yet)

### Test 4B: Upgrade to Elite (from Free)

### Steps
1. On pricing page (as Free user)
2. Click **"Upgrade to Elite"** button

### Expected Result
- ✅ Flash message: "🚀 Upgrade to Elite tier! Payment integration coming soon..."

### Test 4C: Upgrade to Elite (from Pro)

### Steps
1. Logout, login as `test-pro@example.com`
2. Go to pricing
3. Click **"Upgrade to Elite"**

### Expected Result
- ✅ Flash message about Elite upgrade

---

## ✅ Test 5: Click Downgrade Buttons

### Test 5A: Downgrade to Free (from Pro)

### Steps
1. Login as `test-pro@example.com` / `password123`
2. Go to pricing
3. Click **"Downgrade"** button on Free card

### Expected Result
- ✅ Flash message: "ℹ️ To downgrade to Free tier, please contact support..."
- ✅ Explains you need to contact support
- ✅ No actual downgrade occurs

### Test 5B: Downgrade to Pro (from Elite)

### Steps
1. Login as `test-elite@example.com`
2. Go to pricing
3. Click **"Downgrade to Pro"** on Pro card

### Expected Result
- ✅ Flash message about downgrading to Pro
- ✅ No actual change in tier

---

## ✅ Test 6: Feature Comparison Table

### Steps
1. On pricing page, scroll down to **"Feature Comparison"** section

### Expected Result
- ✅ Table visible with 4 columns: Feature, Free, Pro, Elite
- ✅ Pro column has green background/highlight
- ✅ Elite column has purple tint
- ✅ 11 rows of features:
  - Auto-refresh interval
  - Volume alerts shown
  - Watchlist export limit
  - Email alerts
  - SMS alerts
  - Telegram/Discord alerts
  - Additional metrics
  - CSV/JSON export
  - Historical data
  - API access
  - Priority support
- ✅ Check marks (✅) and X marks (❌) display correctly
- ✅ Table is responsive on mobile (scrollable horizontally if needed)

---

## ✅ Test 7: FAQ Section

### Steps
1. Scroll to FAQ section

### Expected Result
- ✅ **"Frequently Asked Questions"** title in gradient
- ✅ 6 FAQ cards in grid layout:
  1. Can I switch plans anytime?
  2. Do you offer refunds?
  3. What payment methods?
  4. Is there a free trial?
  5. Can I cancel?
  6. Team/enterprise plans?
- ✅ Each card has green/purple border on hover
- ✅ Text is readable in both dark/light themes

---

## ✅ Test 8: Theme Toggle

### Steps
1. On pricing page, click theme toggle (🌙/☀️)

### Expected Result
- ✅ Background changes from dark to light (or vice versa)
- ✅ All text adapts (dark text on light / light text on dark)
- ✅ Green accents change:
  - Dark: #00ff88
  - Light: #10b981
- ✅ Pricing cards backgrounds adapt
- ✅ Feature comparison table adapts
- ✅ FAQ cards adapt
- ✅ All UI elements remain readable

---

## ✅ Test 9: Navigation Links

### Test 9A: Back to Dashboard (Logged In)

### Steps
1. Login and visit pricing page
2. Click **"Back to Dashboard"** link (top left)

### Expected Result
- ✅ Redirected to dashboard at `http://localhost:8081/`
- ✅ Dashboard loads with market data

### Test 9B: Back to Dashboard (Guest)

### Steps
1. Logout (or use incognito)
2. Visit pricing page directly: `http://localhost:8081/pricing`
3. Click **"Back to Dashboard"**

### Expected Result
- ✅ Redirected to login page (since dashboard requires auth)

### Test 9C: Pricing Link from Dashboard

### Steps
1. Login and go to dashboard
2. Click **"💎 Pricing"** link in header (purple badge, right side)

### Expected Result
- ✅ Redirected to pricing page
- ✅ Current plan highlighted

### Test 9D: Footer CTA Buttons

**If Logged In:**
1. Click **"Go to Dashboard"**
2. ✅ Redirects to dashboard

**If Guest:**
1. Click **"Start Free"**
2. ✅ Redirects to registration page
3. Go back to pricing, click **"Sign In"**
4. ✅ Redirects to login page

---

## ✅ Test 10: Responsive Design

### Desktop (> 1024px)
1. View pricing page on full screen
2. ✅ 3 cards side-by-side
3. ✅ Pro card slightly larger (scale: 1.05)
4. ✅ All elements visible

### Tablet (768px - 1024px)
1. Resize browser to ~900px wide
2. ✅ Cards stack vertically (1 per row)
3. ✅ Pro card same size as others (no scale)
4. ✅ FAQ grid becomes 2 columns

### Mobile (< 768px)
1. Resize to ~400px wide
2. ✅ All cards stack vertically
3. ✅ Hero title shrinks to 2.5rem
4. ✅ Comparison table scrolls horizontally
5. ✅ FAQ becomes single column
6. ✅ Footer CTA buttons stack vertically

---

## ✅ Test 11: Direct URL Access

### Test URLs
1. `http://localhost:8081/pricing` - ✅ Pricing page
2. `http://localhost:8081/upgrade/1` - ✅ Requires login, shows upgrade message
3. `http://localhost:8081/upgrade/2` - ✅ Requires login, shows upgrade message
4. `http://localhost:8081/downgrade/0` - ✅ Requires login, shows downgrade message
5. `http://localhost:8081/downgrade/1` - ✅ Requires login, shows downgrade message

### Expected for upgrade/downgrade URLs
- If not logged in: Redirected to login
- If logged in: Flash message + redirect to pricing

---

## 🎯 Complete Test Checklist

Use this to verify Step 4 is working correctly:

### Page Access
- [ ] ✅ Pricing page accessible to guests
- [ ] ✅ Pricing page accessible to logged-in users
- [ ] ✅ "Pricing" link visible in dashboard header

### Content & Layout
- [ ] ✅ Hero section displays correctly
- [ ] ✅ 3 pricing cards visible (Free, Pro, Elite)
- [ ] ✅ Pro card is featured/"Most Popular"
- [ ] ✅ Feature lists complete and readable
- [ ] ✅ Comparison table displays all features
- [ ] ✅ FAQ section has 6 questions
- [ ] ✅ Footer CTA section present

### Current Plan Detection
- [ ] ✅ Shows current plan banner when logged in
- [ ] ✅ Highlights current tier card with badge
- [ ] ✅ Disables current plan CTA button
- [ ] ✅ Shows correct upgrade/downgrade options

### CTA Buttons
- [ ] ✅ "Get Started Free" for guests
- [ ] ✅ "Upgrade to Pro/Elite" for lower tiers
- [ ] ✅ "Downgrade" for higher tiers
- [ ] ✅ "Your Current Plan" disabled for current tier
- [ ] ✅ Buttons trigger appropriate flash messages

### Navigation
- [ ] ✅ Back to Dashboard link works
- [ ] ✅ Pricing link in dashboard works
- [ ] ✅ Footer CTA buttons work (Sign In/Start Free/Dashboard)

### Theme Support
- [ ] ✅ Dark theme looks beautiful
- [ ] ✅ Light theme looks beautiful
- [ ] ✅ Theme toggle works
- [ ] ✅ All colors adapt correctly
- [ ] ✅ Text is readable in both themes

### Responsive Design
- [ ] ✅ Desktop layout (3 cards side-by-side)
- [ ] ✅ Tablet layout (cards stack)
- [ ] ✅ Mobile layout (single column)
- [ ] ✅ Comparison table scrolls on mobile

---

## 🐛 Troubleshooting

### Error: "Template not found: pricing.html"

**Solution:**
```bash
ls templates/pricing.html
# If missing, re-create from instructions
```

### No styling on pricing page

**Solution:**
```bash
ls static/css/pricing.css
# Make sure pricing.css exists
```

### Flash messages not appearing

**Solution:** Check that you have the flash message display code in the pricing.html template (or base template if using template inheritance)

### "Back to Dashboard" link gives 404

**Solution:** Make sure you're logged in. Guests redirected to login.

### Pricing link not visible in header

**Solution:** 
1. Make sure you're on desktop (link hidden on mobile)
2. Clear browser cache
3. Restart Flask server

---

## ✅ Success Indicators

You'll know Step 4 is successful when:

1. ✅ **Pricing page accessible to everyone (guest + logged in)**
2. ✅ **3 beautiful pricing cards with correct styling**
3. ✅ **Current plan is highlighted when logged in**
4. ✅ **Upgrade/downgrade buttons show appropriate actions**
5. ✅ **Flash messages appear when clicking CTAs**
6. ✅ **Feature comparison table displays correctly**
7. ✅ **FAQ section readable and styled**
8. ✅ **Theme toggle works (dark/light)**
9. ✅ **Pricing link visible in dashboard header**
10. ✅ **Responsive on mobile/tablet/desktop**

---

## 📊 Test Results Summary

After completing all tests, fill this out:

| Test Category | Status | Notes |
|--------------|--------|-------|
| Page Access | ✅ / ❌ | |
| Pricing Cards | ✅ / ❌ | |
| Current Plan Detection | ✅ / ❌ | |
| CTA Buttons | ✅ / ❌ | |
| Comparison Table | ✅ / ❌ | |
| FAQ Section | ✅ / ❌ | |
| Theme Support | ✅ / ❌ | |
| Navigation | ✅ / ❌ | |
| Responsive Design | ✅ / ❌ | |

---

## 🚀 Ready for Step 5

Once all tests pass, you're ready for **Step 5: Tier Enforcement Logic**, which will:
- Limit Free users to 10 alerts
- Limit Free users to top 50 watchlist export
- Set 15-minute refresh for Free tier
- Add ads banner for Free users
- Enforce all tier-specific limits

Great job completing Step 4! 🎉


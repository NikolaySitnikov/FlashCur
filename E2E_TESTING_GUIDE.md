# End-to-End Testing Guide - Complete User Journeys

## 🎯 Overview

This guide provides complete user journey testing for all three tiers (Free, Pro, Elite). Test these workflows to ensure the entire system works seamlessly.

---

## 🧪 Journey 1: New Free Tier User (Complete Flow)

### Scenario
A new user discovers your dashboard, creates an account, and explores Free tier features.

### Steps (15-20 minutes)

**1. Initial Visit (Guest)**
```
1. Open browser in incognito mode
2. Visit: http://localhost:8081/
3. ✅ Redirected to http://localhost:8081/login
4. ✅ Flash message: "🔒 Please log in to access the dashboard."
5. ✅ See beautiful login page (dark theme by default)
```

**2. Explore Pricing Before Signing Up**
```
6. Click "Sign up for free" link
7. ✅ Registration page loads
8. Scroll down to see "Included in Free Tier" features
9. Click the pricing hint: "Pricing page coming soon..."
10. Or click browser back
```

**3. Create Account**
```
11. Fill in registration form:
    - Email: newtester@example.com
    - Password: testpassword123
    - Confirm: testpassword123
    - Theme: Dark Mode
12. Click "Create Free Account"
13. ✅ Auto-login (no need to login again)
14. ✅ Redirected to dashboard
15. ✅ Flash message: "🎉 Welcome to Binance Dashboard..."
16. ✅ Dashboard loads with market data
```

**4. Explore Dashboard (Free Tier)**
```
17. Open DevTools Console (F12)
18. ✅ Console logs:
    - "User tier: Free (0)"
    - "Refresh interval: 15 minutes"
19. ✅ See ads banner at top:
    - "🚀 Upgrade to Pro for faster refresh..."
20. ✅ Count table rows: Max 50 assets
21. ✅ Check alerts sidebar: Max 10 alerts
22. ✅ Header shows:
    - "💎 Pricing" link
    - "⚙️" settings icon
    - Email + FREE badge
    - "🚪" logout button
```

**5. Download Watchlist (Limited)**
```
23. Click "📥 Download TradingView Watchlist"
24. Open downloaded file
25. ✅ Contains exactly 50 symbols (or fewer)
```

**6. Visit Pricing Page**
```
26. Click "💎 Pricing" in header
27. ✅ Pricing page loads
28. ✅ Banner: "You're currently on the Free Plan"
29. ✅ Free card highlighted with "Current Plan" badge
30. ✅ Free CTA button disabled
31. ✅ Pro/Elite show "Upgrade" buttons
```

**7. Try to Upgrade (Stub)**
```
32. Click "Upgrade to Pro" button
33. ✅ Flash message: "🚀 Upgrade to Pro tier! Payment integration coming soon..."
34. ✅ Redirected back to pricing page
35. ✅ Still on Free tier (no actual upgrade)
```

**8. View Profile/Settings**
```
36. Click "⚙️" settings icon in header
37. ✅ Profile page loads
38. ✅ Shows account info:
    - Email
    - Current Plan: FREE
    - Member Since date
    - Account Status: Active
    - Theme: Dark
39. ✅ See Free tier features list
40. ✅ "Upgrade to Pro" button visible
```

**9. Change Password**
```
41. In "Change Password" section:
    - Current Password: testpassword123
    - New Password: newpassword456
    - Confirm: newpassword456
42. Click "Update Password"
43. ✅ Flash message: "✅ Password updated successfully!"
44. ✅ Check logs/binance_dashboard.log for password change entry
```

**10. Update Theme Preference**
```
45. In "Appearance" section:
    - Select "☀️ Light Mode"
46. Click "Save Preference"
47. ✅ Flash message: "✅ Theme preference saved! Now using light mode."
48. ✅ Page stays same theme (local storage controls current view)
```

**11. Logout and Verify Theme Persistence**
```
49. Click back to dashboard
50. Click "🚪" logout button
51. ✅ Redirected to login page
52. ✅ Flash message: "👋 You have been logged out..."
53. Login again with NEW password:
    - Email: newtester@example.com
    - Password: newpassword456
54. ✅ Login successful
55. ✅ Dashboard loads in Light Mode (saved preference)
```

**12. Test Tier Limits**
```
56. Open DevTools → Network tab
57. Reload page
58. Find /api/data request
59. ✅ Response includes:
    - "tier": 0
    - "limited": true
    - Max 50 items in data array
60. Find /api/alerts request
61. ✅ Response includes:
    - "limit": 10
    - Max 10 alerts
```

**✅ Expected Result:** Complete Free tier experience works seamlessly from registration to dashboard usage.

---

## 🧪 Journey 2: Pro Tier User Experience

### Scenario
Test with existing Pro tier user to verify premium features work.

### Steps (10 minutes)

**1. Login as Pro User**
```
1. Visit: http://localhost:8081/logout (if logged in)
2. Login with:
   - Email: test-pro@example.com
   - Password: password123
3. ✅ Flash message mentions "Pro tier"
4. Open Console
5. ✅ "User tier: Pro (1)"
6. ✅ "Refresh interval: 5 minutes"
```

**2. Verify Pro Features**
```
7. ✅ NO ads banner visible
8. ✅ Header shows PRO badge (blue color)
9. ✅ Table shows ALL assets (100+ rows)
10. ✅ Alerts sidebar shows up to 30 alerts
11. ✅ Watchlist export unlimited
```

**3. Check Pro Limits via API**
```
12. Open: http://localhost:8081/api/data
13. ✅ "tier": 1, "limited": false
14. Open: http://localhost:8081/api/alerts
15. ✅ "limit": 30
```

**4. Visit Pricing Page**
```
16. Click "💎 Pricing"
17. ✅ Banner: "You're currently on the Pro Plan"
18. ✅ Pro card highlighted
19. ✅ Free shows "Downgrade"
20. ✅ Elite shows "Upgrade to Elite"
```

**5. Visit Profile**
```
21. Click "⚙️" settings
22. ✅ Shows PRO tier features:
    - 5-minute refresh
    - 30 alerts
    - Email notifications
    - CSV/JSON export
23. ✅ "Upgrade to Elite" button visible
```

**✅ Expected Result:** Pro tier shows enhanced features, no ads, faster refresh, more data.

---

## 🧪 Journey 3: Elite Tier User Experience

### Scenario
Test highest tier with all features unlocked.

### Steps (10 minutes)

**1. Login as Elite User**
```
1. Login: test-elite@example.com / password123
2. Open Console
3. ✅ "User tier: Elite (2)"
4. ✅ "Refresh interval: 0.5 minutes" (30 seconds)
```

**2. Verify Elite Features**
```
5. ✅ NO ads banner
6. ✅ ELITE badge (purple)
7. ✅ ALL data visible
8. ✅ Unlimited alerts
9. Wait 30 seconds
10. ✅ Console logs "Auto-refreshing data..."
```

**3. Check API**
```
11. Visit: http://localhost:8081/api/user
12. ✅ "tier": 2, "refresh_interval": 30000
13. Visit: http://localhost:8081/api/alerts
14. ✅ "limited": false (unlimited)
```

**4. Pricing Page**
```
15. Click "💎 Pricing"
16. ✅ "You're currently on the Elite Plan"
17. ✅ Elite card highlighted
18. ✅ Free/Pro show "Downgrade"
19. ✅ Elite CTA: "Your Current Plan" (disabled)
```

**5. Profile Page**
```
20. Click "⚙️"
21. ✅ Elite tier features listed:
    - 30-second refresh
    - Unlimited alerts
    - SMS/Telegram/Discord
    - API access
    - Priority support
22. ✅ NO "Upgrade" button (already on highest tier)
```

**✅ Expected Result:** Elite tier has all features, fastest refresh, unlimited everything.

---

## 🧪 Journey 4: Error Handling & Edge Cases

### Test 4A: 404 Error
```
1. Visit: http://localhost:8081/nonexistent-page
2. ✅ Beautiful 404 error page loads
3. ✅ Shows "404 - Page Not Found"
4. ✅ Theme toggle works
5. ✅ "Back to Dashboard" button works
```

### Test 4B: Wrong Password Multiple Times
```
1. Logout
2. Try to login with wrong password 3 times
3. ✅ Each time shows: "❌ Invalid email or password."
4. ✅ Account not locked (no rate limiting yet)
5. ✅ Logs show failed attempts in logs/binance_dashboard.log
```

### Test 4C: Registration Validation
```
1. Try to register with:
   - Email: test-free@example.com (already exists)
   - Password: password123
2. ✅ Error: "❌ An account with this email already exists."
3. Try with short password (5 chars)
4. ✅ Error: "❌ Password must be at least 8 characters..."
```

### Test 4D: API Without Auth
```
1. Logout
2. Try to visit: http://localhost:8081/api/user
3. ✅ Returns guest user data:
   - "authenticated": false
   - "tier": 0
   - "tier_name": "Guest"
```

---

## 🎯 Complete E2E Checklist

Use this to verify entire system works:

### Registration Flow
- [ ] ✅ Can register new account
- [ ] ✅ Auto-assigned Free tier
- [ ] ✅ Auto-login after registration
- [ ] ✅ Theme preference saved
- [ ] ✅ Alert preferences created
- [ ] ✅ Validation works (email, password length, password match)

### Login Flow
- [ ] ✅ Can login with all 3 test accounts
- [ ] ✅ Wrong password shows error
- [ ] ✅ Remember me works (30 days)
- [ ] ✅ Theme loads based on user preference
- [ ] ✅ Flash messages appear and auto-hide

### Dashboard Experience
- [ ] ✅ Requires authentication
- [ ] ✅ Shows user info in header
- [ ] ✅ Free tier: 50 assets, 10 alerts, 15-min refresh, ads visible
- [ ] ✅ Pro tier: All data, 30 alerts, 5-min refresh, no ads
- [ ] ✅ Elite tier: All data, unlimited alerts, 30-sec refresh, no ads
- [ ] ✅ Market data loads correctly
- [ ] ✅ Alerts display correctly
- [ ] ✅ Watchlist export works

### Pricing Page
- [ ] ✅ Accessible without login
- [ ] ✅ Shows 3 pricing cards
- [ ] ✅ Detects current plan when logged in
- [ ] ✅ Upgrade/downgrade buttons show appropriate actions
- [ ] ✅ Comparison table displays correctly
- [ ] ✅ FAQ section readable

### Profile/Settings
- [ ] ✅ Shows account details
- [ ] ✅ Can change password
- [ ] ✅ Can update theme preference
- [ ] ✅ Shows tier-specific features
- [ ] ✅ Upgrade prompts visible

### Error Handling
- [ ] ✅ 404 page shows for invalid URLs
- [ ] ✅ 500 page shows on server errors
- [ ] ✅ All errors logged to logs/binance_dashboard.log
- [ ] ✅ Flash messages show for all user actions

### Logging
- [ ] ✅ User registrations logged
- [ ] ✅ Logins logged (email + tier)
- [ ] ✅ Logouts logged
- [ ] ✅ Password changes logged
- [ ] ✅ Theme updates logged
- [ ] ✅ Errors logged with stack traces
- [ ] ✅ Log file created at logs/binance_dashboard.log

### Theme System
- [ ] ✅ Theme toggle works on all pages
- [ ] ✅ Theme persists across sessions
- [ ] ✅ Saved preference loads on login
- [ ] ✅ All pages support dark/light themes

---

## 📊 Testing Matrix

Test each tier against each feature:

| Feature | Free | Pro | Elite | Tested |
|---------|------|-----|-------|--------|
| Data rows | 50 | Unlimited | Unlimited | ✅ / ❌ |
| Alerts | 10 | 30 | Unlimited | ✅ / ❌ |
| Refresh | 15min | 5min | 30sec | ✅ / ❌ |
| Ads | Yes | No | No | ✅ / ❌ |
| Watchlist | 50 | Unlimited | Unlimited | ✅ / ❌ |
| Profile | Yes | Yes | Yes | ✅ / ❌ |
| Pricing | Yes | Yes | Yes | ✅ / ❌ |

---

## 🔄 Regression Testing

After any code changes, test these critical paths:

1. **Registration → Login → Dashboard** (5 min)
2. **Tier limit enforcement** (3 min)
3. **Password change** (2 min)
4. **Theme toggle** (1 min)
5. **Error pages** (2 min)

**Total: ~15 minutes for full regression test**

---

## 📝 Test Log Template

After each E2E test run, record results:

```
Date: _______________
Tester: _______________
Environment: Development / Production

✅ / ❌  Registration Flow
✅ / ❌  Login Flow (all tiers)
✅ / ❌  Dashboard Free Tier
✅ / ❌  Dashboard Pro Tier
✅ / ❌  Dashboard Elite Tier
✅ / ❌  Pricing Page
✅ / ❌  Profile/Settings
✅ / ❌  Error Handling
✅ / ❌  Theme System
✅ / ❌  Logging System

Notes:
______________________________
______________________________
______________________________

```

---

## 🚀 Ready for Production?

If all E2E tests pass, your Free tier implementation is ready for deployment!

See **PRODUCTION_DEPLOYMENT_GUIDE.md** for deployment steps.


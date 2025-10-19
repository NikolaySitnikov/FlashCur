# ✅ Step 5: Tier Enforcement - Testing Guide

## 🧪 Manual Testing Instructions

### Prerequisites

Make sure you've completed Steps 1-4 and have test users in your database.

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

## ✅ Test 1: Free Tier - Data Limit (Top 50 Assets)

### What to Test
Verify Free users only see top 50 assets by volume.

### Steps
1. Login as `test-free@example.com` / `password123`
2. Dashboard loads
3. Open browser DevTools (F12) → Console tab
4. Look for message: `User tier: Free (0)`
5. Count rows in the Market Data table

### Expected Result
- ✅ Console shows: `User tier: Free (0)`
- ✅ Console shows: `Refresh interval: 15 minutes`
- ✅ Table shows **exactly 50 rows** (or fewer if less than 50 assets available)
- ✅ Assets are sorted by volume descending (BTC, ETH, etc. at top)

### Verification via API
Open in browser: `http://localhost:8081/api/data`

Expected JSON:
```json
{
  "success": true,
  "data": [...],  // Array with max 50 items
  "tier": 0,
  "limited": true
}
```

---

## ✅ Test 2: Pro Tier - Unlimited Data

### Steps
1. Logout
2. Login as `test-pro@example.com` / `password123`
3. Open DevTools → Console
4. Look for: `User tier: Pro (1)`
5. Count rows in table

### Expected Result
- ✅ Console shows: `User tier: Pro (1)`
- ✅ Console shows: `Refresh interval: 5 minutes`
- ✅ Table shows **ALL assets** (100+ rows if available)
- ✅ No data limit applied

### Verification via API
`http://localhost:8081/api/data`

Expected:
```json
{
  "success": true,
  "data": [...],  // Full array (100+ items)
  "tier": 1,
  "limited": false
}
```

---

## ✅ Test 3: Elite Tier - Ultra-Fast Refresh

### Steps
1. Logout
2. Login as `test-elite@example.com` / `password123`
3. Open DevTools → Console

### Expected Result
- ✅ Console shows: `User tier: Elite (2)`
- ✅ Console shows: `Refresh interval: 0.5 minutes` (30 seconds)
- ✅ All data visible (unlimited)

---

## ✅ Test 4: Free Tier - Alert Limit (Last 10)

### What to Test
Verify Free users only see last 10 alerts.

### Steps
1. Login as `test-free@example.com`
2. Click "Volume Alerts" tab (on mobile) or view alerts sidebar
3. Count number of alert items displayed

### Expected Result
- ✅ Maximum **10 alerts** visible
- ✅ Shows most recent alerts first

### Verification via API
`http://localhost:8081/api/alerts`

Expected:
```json
{
  "success": true,
  "alerts": [...],  // Max 10 items
  "count": 10,
  "tier": 0,
  "limited": true,
  "limit": 10
}
```

---

## ✅ Test 5: Pro Tier - More Alerts (Last 30)

### Steps
1. Logout, login as `test-pro@example.com`
2. View alerts sidebar/tab

### Expected Result
- ✅ Up to **30 alerts** visible
- ✅ API returns `"limit": 30`

### Verification
`http://localhost:8081/api/alerts`

Expected:
```json
{
  "count": 30,  // or fewer if less exist
  "limit": 30,
  "tier": 1
}
```

---

## ✅ Test 6: Elite Tier - Unlimited Alerts

### Steps
1. Login as `test-elite@example.com`
2. View alerts

### Expected Result
- ✅ **All alerts** visible (no limit)
- ✅ API returns `"limited": false`

---

## ✅ Test 7: Watchlist Export Limit

### Test 7A: Free Tier (Top 50)

### Steps
1. Login as `test-free@example.com`
2. Click **"📥 Download TradingView Watchlist"** button
3. Open the downloaded `.txt` file
4. Count lines

### Expected Result
- ✅ File contains **exactly 50 symbols** (or fewer)
- ✅ Format: `BINANCE:BTCUSDT.P`, `BINANCE:ETHUSDT.P`, etc.

### Verification via API
`http://localhost:8081/api/watchlist`

Expected:
```json
{
  "success": true,
  "watchlist": "BINANCE:BTCUSDT.P\nBINANCE:ETHUSDT.P\n...",
  "count": 50,
  "tier": 0,
  "limited": true
}
```

### Test 7B: Pro/Elite Tier (Unlimited)

### Steps
1. Login as `test-pro@example.com`
2. Download watchlist
3. Count lines

### Expected Result
- ✅ File contains **ALL symbols** (100+)
- ✅ API returns `"limited": false`

---

## ✅ Test 8: Ads Banner for Free Tier

### What to Test
Verify ads banner only shows for Free tier users.

### Test 8A: Free Tier Shows Banner

### Steps
1. Login as `test-free@example.com`
2. Look at the top of the dashboard (below header)

### Expected Result
- ✅ **Ads banner visible** between header and main content
- ✅ Green gradient background
- ✅ Message: "🚀 Upgrade to Pro for faster refresh, email alerts, and no ads! Learn More →"
- ✅ **"Upgrade Now"** button on the right
- ✅ Clicking "Learn More" or "Upgrade Now" → pricing page

### Screenshots to Verify
- Banner has green gradient background
- Smooth slide-down animation on page load
- "Upgrade Now" button has hover effect

### Test 8B: Pro Tier - No Ads

### Steps
1. Logout, login as `test-pro@example.com`
2. View dashboard

### Expected Result
- ✅ **NO ads banner** visible
- ✅ Dashboard starts directly below header

### Test 8C: Elite Tier - No Ads

### Steps
1. Login as `test-elite@example.com`

### Expected Result
- ✅ **NO ads banner** visible

---

## ✅ Test 9: Refresh Rate Enforcement

### Test 9A: Free Tier (15 Minutes)

### Steps
1. Login as `test-free@example.com`
2. Open DevTools → Console
3. Note the time
4. Wait and watch for "Auto-refreshing data..." message

### Expected Result
- ✅ Console shows: `Auto-refresh set to 15 minutes`
- ✅ After **15 minutes**, console logs: "Auto-refreshing data..."
- ✅ Table data refreshes automatically

### Quick Test (Without Waiting)
Check console immediately after page load:
```
User tier: Free (0)
Refresh interval: 15 minutes
Auto-refresh set to 15 minutes
```

### Test 9B: Pro Tier (5 Minutes)

### Steps
1. Login as `test-pro@example.com`
2. Check console

### Expected Result
- ✅ `Refresh interval: 5 minutes`
- ✅ `Auto-refresh set to 5 minutes`
- ✅ Data refreshes every 5 minutes

### Test 9C: Elite Tier (30 Seconds)

### Steps
1. Login as `test-elite@example.com`
2. Check console
3. Wait 30 seconds

### Expected Result
- ✅ `Refresh interval: 0.5 minutes` (30 seconds)
- ✅ After **30 seconds**, "Auto-refreshing data..." appears
- ✅ Near real-time updates

---

## ✅ Test 10: Theme Support for Ads Banner

### Steps
1. Login as `test-free@example.com` (to see ads)
2. Click theme toggle (🌙/☀️)

### Expected Result

**Dark Theme:**
- ✅ Ads banner: Dark green gradient background
- ✅ Text: White color
- ✅ "Upgrade Now" button: Green gradient

**Light Theme:**
- ✅ Ads banner: Light green tint background
- ✅ Text: Dark color
- ✅ "Upgrade Now" button: Green gradient (adapted)
- ✅ All elements readable

---

## ✅ Test 11: API Response Verification

### Test Each API Endpoint

**1. GET /api/data (as Free)**
```bash
# Login first, then:
curl -b cookies.txt http://localhost:8081/api/data
```

Expected response includes:
```json
{
  "tier": 0,
  "limited": true,
  "data": [...]  // Max 50 items
}
```

**2. GET /api/alerts (as Free)**
Expected:
```json
{
  "count": 10,
  "tier": 0,
  "limited": true,
  "limit": 10
}
```

**3. GET /api/watchlist (as Free)**
Expected:
```json
{
  "count": 50,
  "tier": 0,
  "limited": true
}
```

**4. GET /api/user**
Expected:
```json
{
  "authenticated": true,
  "tier": 0,
  "tier_name": "Free",
  "refresh_interval": 900000  // 15 min in ms
}
```

---

## ✅ Test 12: Tier Comparison (Side-by-Side)

### Create Comparison Table

Test each tier and record results:

| Feature | Free Tier | Pro Tier | Elite Tier |
|---------|-----------|----------|------------|
| **Data Rows** | 50 | Unlimited | Unlimited |
| **Alerts Shown** | 10 | 30 | Unlimited |
| **Watchlist Export** | 50 | Unlimited | Unlimited |
| **Refresh Rate** | 15 min | 5 min | 30 sec |
| **Ads Banner** | Yes | No | No |

### Steps
1. Test each tier one by one
2. Fill in the table with actual results
3. Verify all match expected values

---

## 🎯 Complete Test Checklist

Use this to verify Step 5 is working correctly:

### Data Limits
- [ ] ✅ Free tier: Max 50 assets
- [ ] ✅ Pro tier: Unlimited assets
- [ ] ✅ Elite tier: Unlimited assets

### Alert Limits
- [ ] ✅ Free tier: Last 10 alerts
- [ ] ✅ Pro tier: Last 30 alerts
- [ ] ✅ Elite tier: Unlimited alerts

### Watchlist Limits
- [ ] ✅ Free tier: Top 50 symbols
- [ ] ✅ Pro tier: Unlimited symbols
- [ ] ✅ Elite tier: Unlimited symbols

### Refresh Rates
- [ ] ✅ Free tier: 15 minutes
- [ ] ✅ Pro tier: 5 minutes
- [ ] ✅ Elite tier: 30 seconds
- [ ] ✅ Console logs show correct intervals
- [ ] ✅ Auto-refresh actually happens at correct intervals

### Ads Banner
- [ ] ✅ Free tier: Ads banner visible
- [ ] ✅ Pro tier: No ads banner
- [ ] ✅ Elite tier: No ads banner
- [ ] ✅ Banner has green gradient
- [ ] ✅ "Upgrade Now" button works
- [ ] ✅ Theme toggle works on banner

### API Responses
- [ ] ✅ /api/data includes tier and limited flags
- [ ] ✅ /api/alerts includes count and limit
- [ ] ✅ /api/watchlist includes count
- [ ] ✅ /api/user returns correct refresh_interval

### JavaScript Console
- [ ] ✅ Shows user tier on load
- [ ] ✅ Shows correct refresh interval
- [ ] ✅ "Auto-refreshing data..." appears at right intervals
- [ ] ✅ No JavaScript errors

---

## 🐛 Troubleshooting

### Issue: All tiers showing 50 rows

**Solution:** Check if you're logged in. Guest users default to Free tier limits.

### Issue: Ads banner not showing for Free tier

**Solution:** 
1. Make sure you're logged in as Free user
2. Check that `current_user.tier == 0`
3. Restart Flask server
4. Clear browser cache

### Issue: Refresh rate not changing

**Solution:**
1. Check browser console for `fetchUserTier()` messages
2. Verify `/api/user` returns correct `refresh_interval`
3. Hard refresh page (Ctrl+Shift+R)

### Issue: Pro tier still limited to 50 rows

**Solution:** Check the API response. If `"limited": true`, there's a logic error. Verify:
```python
if tier == config.TIERS['free']:
    # Only Free tier should hit this
```

### Issue: JavaScript errors in console

**Solution:** Check that `fetchUserTier()` function exists and `/api/user` endpoint is accessible.

---

## ✅ Success Indicators

You'll know Step 5 is successful when:

1. ✅ **Free users see 50 assets, 10 alerts, 15-min refresh**
2. ✅ **Pro users see all data, 30 alerts, 5-min refresh**
3. ✅ **Elite users see all data, unlimited alerts, 30-sec refresh**
4. ✅ **Ads banner only shows for Free tier**
5. ✅ **API responses include tier information**
6. ✅ **Console logs show correct tier and refresh intervals**
7. ✅ **Auto-refresh actually works at correct intervals**
8. ✅ **Theme toggle works on ads banner**
9. ✅ **All tier limits are enforced consistently**

---

## 📊 Test Results Summary

After completing all tests, fill this out:

| Test Category | Status | Notes |
|--------------|--------|-------|
| Data Limits | ✅ / ❌ | |
| Alert Limits | ✅ / ❌ | |
| Watchlist Limits | ✅ / ❌ | |
| Refresh Rates | ✅ / ❌ | |
| Ads Banner | ✅ / ❌ | |
| API Responses | ✅ / ❌ | |
| Theme Support | ✅ / ❌ | |
| Console Logs | ✅ / ❌ | |

---

## 🚀 Ready for Step 6

Once all tests pass, you're ready for **Step 6: Polish and Deploy**, which will:
- Add error handling
- Add logging
- Create user profile page
- End-to-end testing
- Production deployment prep

Great job completing Step 5! The tier system is now fully enforced! 🎉


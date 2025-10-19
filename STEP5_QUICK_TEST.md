# ⚡ Step 5: Quick Testing Reference

## 🚀 Start Server & Test

### Start Flask Server
```bash
cd "/Users/nikolaysitnikov/Documents/Documents_Nik_MacBook/Everyday Life/AI/VolumeFunding/FlashCur"
python app.py
```

---

## ✅ 5-Minute Quick Test

### Test 1: Free Tier Limits (2 min)

**Login:**
- Email: `test-free@example.com`
- Password: `password123`

**Open Browser DevTools (F12) → Console**

**✅ Expected Console Output:**
```
User tier: Free (0)
Refresh interval: 15 minutes
Auto-refresh set to 15 minutes
```

**✅ Expected Dashboard:**
- Ads banner at top: "🚀 Upgrade to Pro..."
- Table shows exactly **50 rows** (or fewer)
- Alerts sidebar shows max **10 alerts**

---

### Test 2: Pro Tier (No Limits) (1 min)

**Login:**
- Email: `test-pro@example.com`
- Password: `password123`

**✅ Expected Console:**
```
User tier: Pro (1)
Refresh interval: 5 minutes
Auto-refresh set to 5 minutes
```

**✅ Expected Dashboard:**
- **NO ads banner**
- Table shows **all assets** (100+ rows)
- Alerts show up to **30 alerts**

---

### Test 3: Elite Tier (Ultra-Fast) (1 min)

**Login:**
- Email: `test-elite@example.com`
- Password: `password123`

**✅ Expected Console:**
```
User tier: Elite (2)
Refresh interval: 0.5 minutes
Auto-refresh set to 0.5 minutes
```

**✅ Expected Dashboard:**
- **NO ads banner**
- **All data** visible
- **All alerts** visible (unlimited)

---

### Test 4: API Verification (1 min)

**While logged in as Free user, visit:**

1. `http://localhost:8081/api/user`
   - ✅ `"tier": 0`
   - ✅ `"refresh_interval": 900000`

2. `http://localhost:8081/api/data`
   - ✅ `"limited": true`
   - ✅ `"data": [...]` (max 50 items)

3. `http://localhost:8081/api/alerts`
   - ✅ `"count": 10` (or fewer)
   - ✅ `"limit": 10`

4. `http://localhost:8081/api/watchlist`
   - ✅ `"count": 50`
   - ✅ `"limited": true`

---

## 🎯 Success Checklist

- [ ] ✅ Free tier: 50 assets, 10 alerts, 15-min refresh, ads visible
- [ ] ✅ Pro tier: All data, 30 alerts, 5-min refresh, no ads
- [ ] ✅ Elite tier: All data, unlimited alerts, 30-sec refresh, no ads
- [ ] ✅ Console logs show correct tier
- [ ] ✅ API responses include tier metadata

---

## 🎨 Visual Indicators

### Free Tier Should Show:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Upgrade to Pro for faster refresh, email alerts,
   and no ads! [Learn More →]    [Upgrade Now]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Market Data Table - 50 rows max]
```

### Pro/Elite Should Show:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Market Data Table - All rows, no banner]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📖 Full Test Guide

For detailed testing (12 scenarios), see:
**`STEP5_TESTING.md`**

---

**✅ STEP 5 COMPLETE!** Only Step 6 left! 🚀


# Step 6: Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### 1. Install Dependencies
```bash
cd FlashCur
pip install -r requirements.txt
```

### 2. Create Test Users
```bash
# Free tier user
curl "http://localhost:8081/debug/create-user?email=free@test.com&password=password123&tier=0"

# Pro tier user
curl "http://localhost:8081/debug/create-user?email=pro@test.com&password=password123&tier=1"

# Elite tier user
curl "http://localhost:8081/debug/create-user?email=elite@test.com&password=password123&tier=2"
```

### 3. Start Application
```bash
python app.py
# or
./run_dashboard.sh
```

### 4. Test Pro Features

**Login as Pro user**: http://localhost:8081/login
- Email: `pro@test.com`
- Password: `password123`

**Verify Pro Features**:
- ✅ See 7 columns (not 4)
- ✅ See "🔄 Refresh Now" button
- ✅ See CSV/JSON export buttons
- ✅ No ads banner
- ✅ Green-highlighted Pro columns

---

## 🧪 Quick Tests

### Test 1: Enhanced Columns (30 seconds)
```bash
# Login as Pro user, verify these columns exist:
# - Change (24h, %)
# - Open Interest ($)
# - Liq. Risk
```

### Test 2: Manual Refresh (10 seconds)
```bash
# Click "🔄 Refresh Now" button
# Verify: Shows spinning icon → "✅ Refreshed!" → data updates
```

### Test 3: Export Formats (60 seconds)
```bash
# Click "📊 Export as CSV" → Download CSV file
# Click "📦 Export as JSON" → Download JSON file
# Click "📥 Download TradingView Watchlist" → Download TXT file
```

### Test 4: Ad-Free (5 seconds)
```bash
# Verify: No yellow ads banner below header
```

---

## 📊 Feature Comparison

| Feature | Free | Pro | Elite |
|---------|------|-----|-------|
| Columns | 4 | 7 | 7 |
| Manual Refresh | ❌ | ✅ | ✅ |
| CSV Export | ❌ | ✅ | ✅ |
| JSON Export | ❌ | ✅ | ✅ |
| Email Alerts | ❌ | ✅ | ✅ |
| Ads | ✅ | ❌ | ❌ |

---

## 🔍 Quick Verification Commands

```bash
# Check user tiers
sqlite3 instance/binance_dashboard.db "SELECT email, tier, tier_name FROM user;"

# Test API endpoints
curl http://localhost:8081/api/data | jq '.has_pro_metrics'
curl http://localhost:8081/api/user | jq '.tier'

# Test CSV export (requires Pro user session)
curl "http://localhost:8081/api/watchlist?format=csv" -I

# View logs
tail -50 logs/binance_dashboard.log
```

---

## 📖 Full Documentation

- **Comprehensive Testing**: `STEP6_TESTING_GUIDE.md` (850+ lines)
- **Implementation Details**: `STEP6_SUMMARY.md` (full breakdown)
- **Configuration**: `config.py` (tier settings)
- **Email Setup**: `STEP2_EMAIL_TESTING.md`
- **Payment Setup**: `PAYMENT_TESTING_GUIDE.md`

---

## 🐛 Troubleshooting

**Pro columns not showing?**
```bash
# Check tier
sqlite3 instance/binance_dashboard.db "SELECT email, tier FROM user WHERE email='pro@test.com';"

# Should return: pro@test.com|1
```

**Email alerts not working?**
```bash
# Check email config
python -c "from app import app; app.app_context().push(); from email_utils import is_email_configured; print(is_email_configured())"

# Should return: True
```

**CSV export fails?**
```bash
# Check pandas is installed
pip show pandas

# Should show pandas version
```

---

## ✅ Success Criteria

You'll know Step 6 is working when:

1. ✅ Pro users see 7 columns (Free users see 4)
2. ✅ Manual refresh button appears for Pro/Elite
3. ✅ CSV/JSON export works for Pro/Elite
4. ✅ Free users see ads, Pro/Elite don't
5. ✅ Email alerts can be configured and sent
6. ✅ All features work on mobile

---

## 🎯 Next Steps

After verifying all features work:

1. **Disable Debug Routes** (Production):
   ```env
   ENABLE_DEBUG_ROUTES=False
   ```

2. **Configure Email Service** (for alerts):
   - Get SendGrid API key
   - Add to `.env` file
   - Test with real alerts

3. **Optional: Enable Premium Features**:
   - Uncomment Twilio integration in `alerts.py`
   - Uncomment SocketIO integration
   - Configure Telegram bot
   - Set up Discord webhooks

---

**Ready to test?** Start with `STEP6_TESTING_GUIDE.md` for detailed instructions! 🚀


# Step 6: Enhanced Data and Alerts Testing Guide

## Overview

Step 6 adds enhanced data columns, email alerts, multiple export formats, and premium features for Pro/Elite tiers. This guide provides comprehensive testing instructions to verify all new functionality.

---

## Prerequisites

Before testing, ensure:

1. ✅ Flask application is running (`python app.py` or `./run_dashboard.sh`)
2. ✅ Database is initialized with test users at different tiers
3. ✅ Email configuration is set up (check `.env` for `MAIL_PASSWORD`)
4. ✅ Browser developer console is open (F12) for debugging

---

## Test Accounts Setup

### Create Test Users

Use the debug routes to create test users for each tier:

```bash
# Free Tier User
curl "http://localhost:8081/debug/create-user?email=free@test.com&password=password123&tier=0"

# Pro Tier User
curl "http://localhost:8081/debug/create-user?email=pro@test.com&password=password123&tier=1"

# Elite Tier User
curl "http://localhost:8081/debug/create-user?email=elite@test.com&password=password123&tier=2"
```

**Alternative**: Use the registration page at http://localhost:8081/register and manually upgrade tiers:

```bash
# Upgrade user to Pro
curl "http://localhost:8081/debug/upgrade-tier?email=pro@test.com&tier=1"

# Upgrade user to Elite
curl "http://localhost:8081/debug/upgrade-tier?email=elite@test.com&tier=2"
```

---

## Test 1: Enhanced Data Columns (Pro/Elite Only)

### Objective
Verify that Pro and Elite users see additional columns: Price Change %, Open Interest, and Liquidation Risk.

### Test Steps

#### 1.1 Free Tier - Basic Columns Only

1. **Login** as Free tier user (`free@test.com`)
2. **Navigate** to dashboard (http://localhost:8081/)
3. **Verify** table has only these columns:
   - ✅ Asset
   - ✅ Volume (24h, $)
   - ✅ Funding Rate (%)
   - ✅ Price (USDT)
4. **Verify** NO Pro columns are visible
5. **Check** browser console - no errors

**Expected Result**: ✅ Only 4 basic columns visible

---

#### 1.2 Pro Tier - Enhanced Columns

1. **Login** as Pro tier user (`pro@test.com`)
2. **Navigate** to dashboard
3. **Verify** table has these additional columns:
   - ✅ **Change (24h, %)** - Shows price change percentage
   - ✅ **Open Interest ($)** - Shows open interest in USD
   - ✅ **Liq. Risk** - Shows "Low", "Medium", or "High"
4. **Verify** Pro columns have green styling (`pro-column` class)
5. **Check** data is populated correctly:
   - Price change shows + or - prefix
   - Open Interest shows formatted values (e.g., "$1.2B")
   - Liquidation Risk shows color-coded values:
     - 🔴 High (red)
     - 🟠 Medium (orange)
     - ⚪ Low (gray)

**Expected Result**: ✅ 7 columns total (4 basic + 3 Pro)

---

#### 1.3 Elite Tier - Same Enhanced Columns

1. **Login** as Elite tier user (`elite@test.com`)
2. **Verify** same columns as Pro tier
3. **Confirm** no visual differences in columns between Pro and Elite

**Expected Result**: ✅ Elite tier sees same enhanced columns as Pro

---

### API Testing

Test the `/api/data` endpoint directly:

```bash
# Free tier - no Pro metrics
curl -X GET http://localhost:8081/api/data \
  -H "Cookie: $(curl -c - -X POST http://localhost:8081/login -d 'email=free@test.com&password=password123' | grep binance_dashboard_session)" \
  | jq '.has_pro_metrics'

# Expected: false

# Pro tier - with Pro metrics
curl -X GET http://localhost:8081/api/data \
  -H "Cookie: $(curl -c - -X POST http://localhost:8081/login -d 'email=pro@test.com&password=password123' | grep binance_dashboard_session)" \
  | jq '.has_pro_metrics'

# Expected: true
```

---

## Test 2: Manual Refresh Button (Pro/Elite Only)

### Objective
Verify Pro/Elite users can manually refresh data on-demand.

### Test Steps

#### 2.1 Free Tier - No Refresh Button

1. **Login** as Free tier user
2. **Navigate** to dashboard
3. **Look for** manual refresh button in header
4. **Verify** button is NOT visible

**Expected Result**: ✅ No refresh button for Free users

---

#### 2.2 Pro Tier - Manual Refresh Works

1. **Login** as Pro tier user
2. **Navigate** to dashboard
3. **Locate** "🔄 Refresh Now" button in section header
4. **Click** the refresh button
5. **Observe** button changes:
   - Shows "🔄 Refreshing..." (spinning icon)
   - Button is disabled during refresh
   - Shows "✅ Refreshed!" after success
   - Returns to normal after 2 seconds
6. **Verify** data reloads (check "Last Updated" timestamp)
7. **Check** browser console for no errors

**Expected Result**: ✅ Refresh works, data updates, smooth animations

---

#### 2.3 Elite Tier - Manual Refresh Works

1. **Login** as Elite tier user
2. **Verify** same refresh functionality as Pro tier
3. **Test** rapid clicking (should not trigger multiple refreshes)

**Expected Result**: ✅ Refresh works, prevents duplicate requests

---

### Edge Cases

- **Rapid Clicking**: Click refresh button 5 times quickly
  - **Expected**: Only one refresh occurs, button stays disabled
- **Refresh During Load**: Click refresh while data is loading
  - **Expected**: Second refresh is ignored until first completes

---

## Test 3: Enhanced Export Formats (Pro/Elite Only)

### Objective
Verify Pro/Elite users can export data in CSV and JSON formats, while Free users only get .txt format.

### Test Steps

#### 3.1 Free Tier - TXT Export Only

1. **Login** as Free tier user
2. **Navigate** to dashboard
3. **Scroll to** download section
4. **Verify** only ONE button is visible:
   - ✅ "📥 Download TradingView Watchlist (.txt)"
5. **Click** download button
6. **Verify** file downloads: `tradingview_watchlist.txt`
7. **Open** file and verify format:
   ```
   BINANCE:BTCUSDT.P
   BINANCE:ETHUSDT.P
   BINANCE:BNBUSDT.P
   ...
   ```

**Expected Result**: ✅ Only .txt export available for Free users

---

#### 3.2 Pro Tier - Multiple Export Formats

1. **Login** as Pro tier user
2. **Navigate** to dashboard
3. **Verify** THREE buttons are visible:
   - ✅ "📥 Download TradingView Watchlist (.txt)"
   - ✅ "📊 Export as CSV"
   - ✅ "📦 Export as JSON"

##### 3.2.1 Test CSV Export

1. **Click** "Export as CSV" button
2. **Verify** file downloads: `binance_watchlist.csv`
3. **Open** in Excel/Google Sheets
4. **Verify** columns:
   - asset
   - symbol
   - volume
   - price
   - funding_rate
   - volume_formatted
   - price_formatted
   - funding_formatted
   - **price_change_pct** *(Pro column)*
   - **price_change_formatted** *(Pro column)*
   - **open_interest** *(Pro column)*
   - **open_interest_usd** *(Pro column)*
   - **open_interest_formatted** *(Pro column)*
   - **liquidation_risk** *(Pro column)*
5. **Verify** data is readable and properly formatted

**Expected Result**: ✅ CSV export works with all Pro columns

##### 3.2.2 Test JSON Export

1. **Click** "Export as JSON" button
2. **Verify** file downloads: `binance_watchlist.json`
3. **Open** in text editor or JSON viewer
4. **Verify** structure:
   ```json
   {
     "success": true,
     "data": [
       {
         "asset": "BTC",
         "symbol": "BTCUSDT",
         "volume": 5000000000,
         "price": 45000,
         "funding_rate": 0.01,
         "price_change_pct": 2.5,
         "open_interest": 1000000000,
         "liquidation_risk": "Low",
         ...
       },
       ...
     ],
     "count": 100,
     "format": "json",
     "timestamp": "2025-10-22T..."
   }
   ```
5. **Verify** all Pro metrics are included

**Expected Result**: ✅ JSON export works with full data

---

#### 3.3 Elite Tier - Same Export Options

1. **Login** as Elite tier user
2. **Verify** same three export buttons as Pro
3. **Test** all three formats work correctly

**Expected Result**: ✅ All exports work for Elite tier

---

### API Testing

Test export formats via API:

```bash
# Free tier - CSV should be denied
curl -X GET "http://localhost:8081/api/watchlist?format=csv" \
  --cookie "session=FREE_USER_SESSION" \
  -w "\nHTTP Status: %{http_code}\n"

# Expected: HTTP 403 Forbidden

# Pro tier - CSV should work
curl -X GET "http://localhost:8081/api/watchlist?format=csv" \
  --cookie "session=PRO_USER_SESSION" \
  > test_export.csv

# Verify file is created and has CSV data
head -5 test_export.csv

# JSON export
curl -X GET "http://localhost:8081/api/watchlist?format=json" \
  --cookie "session=PRO_USER_SESSION" \
  | jq '.count'

# Expected: Number of assets
```

---

## Test 4: Email Alerts (Pro/Elite Only)

### Objective
Verify Pro/Elite users receive email notifications for volume spike alerts.

### Prerequisites

1. **Email configuration** is set up in `.env`:
   ```env
   MAIL_SERVER=smtp.sendgrid.net
   MAIL_PORT=587
   MAIL_USE_TLS=True
   MAIL_USERNAME=apikey
   MAIL_PASSWORD=SG.your_sendgrid_api_key
   MAIL_DEFAULT_SENDER=noreply@yourdomain.com
   ```
2. **Test email address** is accessible (check inbox)

### Test Steps

#### 4.1 Enable Email Alerts

1. **Login** as Pro tier user
2. **Navigate** to Settings page (http://localhost:8081/settings)
3. **Enable** "Email Alerts" toggle
4. **Save** settings
5. **Verify** success message

**Note**: If settings page doesn't exist yet, enable via database:

```bash
curl "http://localhost:8081/debug/upgrade-tier?email=pro@test.com&tier=1"

# Then manually update AlertPreferences in database
sqlite3 instance/binance_dashboard.db "UPDATE alert_preferences SET email_alerts_enabled = 1 WHERE user_id = (SELECT id FROM user WHERE email = 'pro@test.com');"
```

---

#### 4.2 Wait for Volume Spike Alert

**Option A: Wait for real alert (may take hours)**

1. **Keep app running**
2. **Wait** for volume spike to occur naturally
3. **Check email inbox** for alert

**Option B: Manually trigger alert (for testing)**

1. **Modify** `scan_alerts()` in `app.py` temporarily:
   ```python
   # Force a test alert (remove after testing)
   if True:  # Change this condition
       asset = "BTC"
       alert_msg = "TEST: BTC volume spike detected"
       alerts.append((datetime.now(timezone.utc), alert_msg))
       
       # Trigger email sending...
   ```
2. **Restart** Flask app
3. **Wait** 1-2 minutes (alert scanner runs every minute)
4. **Check email inbox**

---

#### 4.3 Verify Email Content

1. **Open** alert email
2. **Verify** email contains:
   - ✅ Subject: "🚨 Volume Spike Alert: BTCUSDT (3.5x)"
   - ✅ Symbol: BTCUSDT
   - ✅ 24h Volume: Formatted value (e.g., "$5.0B")
   - ✅ Volume Change: Multiple (e.g., "3.5x")
   - ✅ Funding Rate: Percentage
   - ✅ Current Price: USD value
3. **Verify** email is readable (not spam/junk)
4. **Check** links are NOT rewritten (SendGrid tracking disabled)

**Expected Result**: ✅ Email received with correct alert data

---

#### 4.4 Free Tier - No Email Alerts

1. **Login** as Free tier user
2. **Verify** no email alerts are sent (even if feature is enabled in DB)
3. **Check** logs: Should show "User doesn't have access to this feature"

**Expected Result**: ✅ Free users do NOT receive email alerts

---

### Check Logs

```bash
# View alert email logs
tail -50 logs/binance_dashboard.log | grep "Alert email"

# Expected output:
# 2025-10-22 14:30:15 [INFO] app: 📧 Alert email queued for pro@test.com: BTCUSDT
# 2025-10-22 14:30:16 [INFO] email_utils: 📧 Alert email sent to pro@test.com for BTCUSDT
```

---

## Test 5: Ad-Free Experience (Pro/Elite Only)

### Objective
Verify Pro/Elite users do NOT see the ads banner.

### Test Steps

#### 5.1 Free Tier - Ads Visible

1. **Login** as Free tier user
2. **Navigate** to dashboard
3. **Verify** ads banner is visible below header:
   - Shows "🚀 Upgrade to Pro..." message
   - Has "Upgrade Now" button
   - Banner has yellow/gold accent color
4. **Click** "Upgrade Now" button
5. **Verify** redirects to pricing page

**Expected Result**: ✅ Ads banner is visible and functional

---

#### 5.2 Pro Tier - No Ads

1. **Login** as Pro tier user
2. **Navigate** to dashboard
3. **Verify** NO ads banner is visible
4. **Inspect HTML** (F12 → Elements)
5. **Search** for `.ads-banner` class
6. **Verify** element does NOT exist in DOM

**Expected Result**: ✅ No ads for Pro users

---

#### 5.3 Elite Tier - No Ads

1. **Login** as Elite tier user
2. **Verify** NO ads banner is visible
3. **Confirm** clean ad-free experience

**Expected Result**: ✅ No ads for Elite users

---

## Test 6: Premium Alert Hooks (Elite Tier - Stubs)

### Objective
Verify premium alert integration stubs are in place and logged correctly.

### Test Steps

#### 6.1 Verify Alerts Module Exists

```bash
# Check if alerts.py exists
ls -la FlashCur/alerts.py

# Expected: File exists
```

---

#### 6.2 Test Premium Alert Functions

```bash
# Start Python interactive shell
cd FlashCur
python3

# Import alerts module
from alerts import *
from models import User

# Create mock user
class MockUser:
    email = "elite@test.com"
    tier = 2
    phone_number = "+15551234567"
    telegram_chat_id = "123456789"
    discord_webhook_url = "https://discord.com/api/webhooks/..."

user = MockUser()

# Test alert data
alert_data = {
    'symbol': 'BTCUSDT',
    'volume_24h': 5000000000,
    'volume_change': 3.5,
    'funding_rate': 0.01,
    'price': 45000,
    'alert_message': 'BTC volume spike!'
}

# Test SMS alert (stub)
success, error = send_sms_alert(user, alert_data)
print(f"SMS Alert: {success}, Error: {error}")
# Expected: (True, None) with log message

# Test Telegram alert (stub)
success, error = send_telegram_alert(user, alert_data)
print(f"Telegram Alert: {success}, Error: {error}")
# Expected: (True, None) with log message

# Test Discord alert (stub)
success, error = send_discord_alert(user, alert_data)
print(f"Discord Alert: {success}, Error: {error}")
# Expected: (True, None) with log message

# Test real-time alert (stub)
result = emit_realtime_alert(alert_data)
print(f"Real-time Alert: {result}")
# Expected: True with log message

# Get premium alert status
status = get_premium_alert_status()
print(status)
# Expected: Dict with all integrations showing "Not yet implemented"
```

**Expected Result**: ✅ All stub functions work, log messages appear

---

#### 6.3 Check Logs for Stub Messages

```bash
# View recent logs
tail -50 logs/binance_dashboard.log | grep "\[STUB\]"

# Expected output:
# [INFO] alerts: 📱 [STUB] SMS alert would be sent to elite@test.com: ...
# [INFO] alerts: 📲 [STUB] Telegram alert would be sent to elite@test.com: ...
# [INFO] alerts: 💬 [STUB] Discord alert would be sent to elite@test.com: ...
# [DEBUG] alerts: 🔌 [STUB] Real-time alert would be emitted: BTCUSDT
```

**Expected Result**: ✅ Stub logs confirm placeholders are working

---

## Test 7: Sorting with New Columns

### Objective
Verify sorting works correctly with Pro columns.

### Test Steps

1. **Login** as Pro tier user
2. **Navigate** to dashboard
3. **Wait** for data to load
4. **Click** "Change (24h, %)" column header
5. **Verify** data sorts by price change (descending first)
6. **Click** again
7. **Verify** data sorts ascending
8. **Click** third time
9. **Verify** returns to default order (volume descending)
10. **Test** "Open Interest ($)" sorting
11. **Verify** sorting works correctly

**Expected Result**: ✅ All Pro columns are sortable

---

## Test 8: Mobile Responsiveness

### Objective
Verify Pro features work on mobile devices.

### Test Steps

1. **Login** as Pro tier user
2. **Open** dashboard on mobile device OR use browser dev tools (F12 → Device Mode)
3. **Verify** Pro columns are visible (may be smaller)
4. **Verify** manual refresh button works
5. **Verify** export buttons are accessible
6. **Test** downloading all three formats on mobile
7. **Verify** no horizontal scrolling issues

**Expected Result**: ✅ All Pro features work on mobile

---

## Test 9: Performance and Load Testing

### Objective
Ensure Pro features don't significantly impact performance.

### Test Steps

#### 9.1 Measure API Response Times

```bash
# Free tier (basic columns)
time curl -X GET http://localhost:8081/api/data \
  --cookie "session=FREE_USER_SESSION" \
  > /dev/null

# Pro tier (with Pro metrics)
time curl -X GET http://localhost:8081/api/data \
  --cookie "session=PRO_USER_SESSION" \
  > /dev/null

# Compare response times
# Expected: Pro tier should be < 2x slower than Free
```

---

#### 9.2 Check Browser Performance

1. **Login** as Pro tier user
2. **Open** developer tools (F12)
3. **Go to** Network tab
4. **Refresh** dashboard
5. **Check** `/api/data` response time
6. **Verify** < 5 seconds for initial load
7. **Check** memory usage in Performance tab
8. **Verify** no memory leaks after multiple refreshes

**Expected Result**: ✅ Pro features don't cause performance issues

---

## Test 10: Error Handling

### Objective
Verify graceful error handling for Pro features.

### Test Steps

#### 10.1 Test Export with Invalid Format

```bash
# Try invalid export format
curl -X GET "http://localhost:8081/api/watchlist?format=xml" \
  --cookie "session=PRO_USER_SESSION"

# Expected: Error message "Unsupported format: xml"
```

---

#### 10.2 Test Email Alerts with No Email Config

1. **Stop** Flask app
2. **Remove** email configuration from `.env`:
   ```bash
   # Comment out MAIL_PASSWORD
   ```
3. **Start** Flask app
4. **Trigger** volume spike alert
5. **Check** logs for error handling:
   ```bash
   tail -50 logs/binance_dashboard.log | grep "email"
   
   # Expected: Warning about email not configured
   ```

**Expected Result**: ✅ App continues running, errors logged gracefully

---

#### 10.3 Test Open Interest API Failure

1. **Simulate** API failure (disconnect internet OR mock API response)
2. **Login** as Pro tier user
3. **Verify** Open Interest column shows "N/A"
4. **Verify** no crashes or errors in console

**Expected Result**: ✅ Graceful fallback to "N/A" for missing data

---

## Test 11: Integration Testing

### Objective
Test complete Pro user workflow end-to-end.

### Complete Pro User Journey

1. **Register** new account
2. **Confirm** email (if email verification enabled)
3. **Upgrade** to Pro tier (via debug route or payment)
4. **Login** to dashboard
5. **Verify** Pro columns are visible
6. **Enable** email alerts in settings
7. **Click** manual refresh button
8. **Export** data in CSV format
9. **Export** data in JSON format
10. **Verify** no ads are shown
11. **Wait** for alert email (or trigger manually)
12. **Check** email inbox
13. **Verify** all Pro features work together

**Expected Result**: ✅ Complete Pro experience works seamlessly

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Pro Columns Not Showing

**Problem**: Pro user doesn't see additional columns

**Solutions**:
- Check user tier: `sqlite3 instance/binance_dashboard.db "SELECT email, tier FROM user;"`
- Clear browser cache and cookies
- Check browser console for JavaScript errors
- Verify `/api/data` returns `"has_pro_metrics": true`

---

#### 2. Email Alerts Not Sending

**Problem**: No email alerts received

**Solutions**:
- Check email configuration in `.env`
- Test SendGrid API key: `curl --request POST --url https://api.sendgrid.com/v3/mail/send --header "Authorization: Bearer YOUR_API_KEY"`
- Check `email_alerts_enabled` in database: `sqlite3 instance/binance_dashboard.db "SELECT * FROM alert_preferences;"`
- Check logs: `tail -f logs/binance_dashboard.log | grep email`
- Verify user tier is Pro/Elite (tier >= 1)

---

#### 3. Manual Refresh Button Not Working

**Problem**: Refresh button doesn't refresh data

**Solutions**:
- Check browser console for JavaScript errors
- Verify `/api/user` endpoint works: `curl http://localhost:8081/api/user`
- Check if `manualRefresh()` function exists in `script.js`
- Hard refresh browser (Ctrl+Shift+R)

---

#### 4. Export Buttons Not Visible

**Problem**: CSV/JSON export buttons don't appear for Pro user

**Solutions**:
- Verify user tier in database
- Check if Jinja2 template conditional is correct in `dashboard.html`
- View page source (Ctrl+U) and search for "Export as CSV"
- Clear browser cache

---

#### 5. Open Interest Shows "N/A"

**Problem**: Open Interest column always shows "N/A"

**Solutions**:
- This is normal if Binance API is slow or rate-limited
- Check logs for API errors: `grep "openInterest" logs/binance_dashboard.log`
- Verify network connectivity to Binance API
- Try manual API call: `curl "https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT"`

---

## Success Criteria

### All Tests Pass ✅

- [x] Free users see 4 basic columns
- [x] Pro/Elite users see 7 columns (basic + 3 Pro)
- [x] Manual refresh button works for Pro/Elite
- [x] CSV export works for Pro/Elite
- [x] JSON export works for Pro/Elite
- [x] Free users only get .txt export
- [x] Email alerts sent to Pro/Elite users
- [x] No ads shown for Pro/Elite users
- [x] Ads shown for Free users
- [x] Premium alert stubs are in place
- [x] Sorting works with Pro columns
- [x] Mobile responsive for all Pro features
- [x] No performance degradation
- [x] Error handling works gracefully

---

## Post-Testing Cleanup

After testing, clean up test data:

```bash
# Delete test users
curl "http://localhost:8081/debug/delete-user?email=free@test.com"
curl "http://localhost:8081/debug/delete-user?email=pro@test.com"
curl "http://localhost:8081/debug/delete-user?email=elite@test.com"

# Or clean entire database (caution!)
rm instance/binance_dashboard.db
python -c "from app import app, db; app.app_context().push(); db.create_all()"
```

---

## Next Steps

After successful testing of Step 6:

1. **Disable debug routes** in production (set `ENABLE_DEBUG_ROUTES=False` in `.env`)
2. **Configure real email service** (SendGrid, Mailgun, etc.)
3. **Set up payment integration** (Stripe) for actual Pro/Elite upgrades
4. **Implement premium alert integrations**:
   - Twilio for SMS (uncomment in `alerts.py`)
   - SocketIO for real-time updates (uncomment in `alerts.py`)
   - Telegram bot setup
   - Discord webhook integration
5. **Deploy to production** server
6. **Monitor logs** for any issues
7. **Collect user feedback** on Pro features

---

## Support and Documentation

For issues or questions:

- **Logs**: Check `logs/binance_dashboard.log`
- **Documentation**: See `IMPLEMENTATION_LOG.md`, `STEP*.md` files
- **Configuration**: Review `config.py` for tier settings
- **Email Setup**: See `STEP2_EMAIL_TESTING.md`
- **Payment Setup**: See `PAYMENT_TESTING_GUIDE.md`

---

## Appendix: Quick Test Commands

### Quick Verification Commands

```bash
# Check user tiers
sqlite3 instance/binance_dashboard.db "SELECT email, tier, tier_name FROM user;"

# Check alert preferences
sqlite3 instance/binance_dashboard.db "SELECT user_id, email_alerts_enabled FROM alert_preferences;"

# Test API endpoints
curl http://localhost:8081/api/data | jq '.has_pro_metrics'
curl http://localhost:8081/api/user | jq '.tier'
curl "http://localhost:8081/api/watchlist?format=csv" --cookie "session=..." -I

# View recent logs
tail -50 logs/binance_dashboard.log

# Check email configuration
python -c "from app import app; app.app_context().push(); from email_utils import is_email_configured; print(is_email_configured())"

# Test premium alerts
python -c "from alerts import get_premium_alert_status; print(get_premium_alert_status())"
```

---

**Testing Date**: _____________  
**Tester Name**: _____________  
**All Tests Passed**: ☐ Yes  ☐ No  
**Notes**: _________________________________

---

**End of Step 6 Testing Guide** ✅


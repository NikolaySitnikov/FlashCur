# Step 4: Payment System (Pro Tier) - Testing Guide

## 🎯 Overview

This guide walks you through testing the Stripe payment integration for Pro and Elite tier subscriptions.

## 📋 Prerequisites

Before testing, ensure you have:

1. ✅ Completed Steps 1-3 (Config, Email, Wallet Auth)
2. ✅ Stripe account created ([stripe.com](https://stripe.com))
3. ✅ Stripe CLI installed (optional but recommended for webhook testing)
4. ✅ Test credit cards from Stripe documentation

---

## 🚀 Setup Instructions

### 1. Database Migration

First, run the database migration to add the new payment tables:

```bash
cd /Users/nikolaysitnikov/Documents/Documents_Nik_MacBook/Everyday\ Life/AI/VolumeFunding/FlashCur
python migrate_payments_db.py
```

**Expected Output:**
```
✅ Database migration completed successfully!
📊 New tables created:
   - subscriptions (for Stripe subscription tracking)
   - audit_logs (for payment and security events)
```

---

### 2. Configure Stripe API Keys

#### A. Get Your Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Developers** → **API keys**
3. Copy:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

#### B. Create Stripe Products

1. In Stripe Dashboard, go to **Products** → **Add Product**
2. Create 4 products:

**Pro Monthly:**
- Name: `Pro Tier - Monthly`
- Price: `$9.99 USD`
- Billing: `Recurring - Monthly`
- Copy the Price ID (starts with `price_`)

**Pro Yearly:**
- Name: `Pro Tier - Yearly`
- Price: `$99 USD`
- Billing: `Recurring - Yearly`
- Copy the Price ID

**Elite Monthly:**
- Name: `Elite Tier - Monthly`
- Price: `$29.99 USD`
- Billing: `Recurring - Monthly`
- Copy the Price ID

**Elite Yearly:**
- Name: `Elite Tier - Yearly`
- Price: `$299 USD`
- Billing: `Recurring - Yearly`
- Copy the Price ID

#### C. Update .env File

Create or update `.env` in the FlashCur directory:

```bash
# Copy from example if needed
cp env.example .env
```

Edit `.env` and add your Stripe keys:

```env
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE  # We'll get this later

# Stripe Product Price IDs (from step B above)
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx_pro_monthly
STRIPE_PRO_YEARLY_PRICE_ID=price_xxx_pro_yearly
STRIPE_ELITE_MONTHLY_PRICE_ID=price_xxx_elite_monthly
STRIPE_ELITE_YEARLY_PRICE_ID=price_xxx_elite_yearly
```

---

### 3. Configure Stripe Webhooks

Webhooks are how Stripe notifies your app about subscription events (payments, cancellations, etc.).

#### Option A: Local Testing with Stripe CLI (Recommended)

1. **Install Stripe CLI:**
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Or download from: https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe:**
   ```bash
   stripe login
   ```

3. **Start webhook forwarding:**
   ```bash
   stripe listen --forward-to http://localhost:8081/webhook/stripe
   ```

4. **Copy the webhook secret** (starts with `whsec_`) and add it to `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...your_secret_from_stripe_cli
   ```

#### Option B: Deployed Server (ngrok or production)

1. **Install ngrok** (if not deployed):
   ```bash
   brew install ngrok
   ngrok http 8081
   ```

2. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

3. **Add webhook endpoint in Stripe Dashboard:**
   - Go to **Developers** → **Webhooks** → **Add endpoint**
   - URL: `https://abc123.ngrok.io/webhook/stripe`
   - Events to send:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
   - Click **Add endpoint**
   - Click **Reveal** under **Signing secret** and copy to `.env`

---

## 🧪 Manual Testing Steps

### Test 1: User Registration and Free Tier

1. **Start the Flask app:**
   ```bash
   cd /Users/nikolaysitnikov/Documents/Documents_Nik_MacBook/Everyday\ Life/AI/VolumeFunding/FlashCur
   python app.py
   ```

2. **Open browser:** http://localhost:8081

3. **Register a new account:**
   - Email: `test+pro@example.com`
   - Password: `TestPassword123!`
   - Confirm email (check logs or email inbox)

4. **Verify Free tier:**
   - Dashboard shows "Free" tier badge
   - Limited to 50 assets in watchlist
   - Only last 10 alerts shown
   - 15-minute refresh interval

**✅ Expected:** User is on Free tier with restricted features

---

### Test 2: Upgrade to Pro (Monthly)

1. **Navigate to Pricing page:**
   - Click "Upgrade" button or go to http://localhost:8081/pricing

2. **Click "Upgrade to Pro - Monthly"**

3. **Stripe Checkout opens:**
   - Product: Pro Tier - Monthly
   - Price: $9.99/month

4. **Use Stripe test card:**
   ```
   Card number: 4242 4242 4242 4242
   Expiry: Any future date (e.g., 12/34)
   CVC: Any 3 digits (e.g., 123)
   ZIP: Any 5 digits (e.g., 12345)
   ```

5. **Complete payment**

6. **Check webhook events:**
   - In terminal with `stripe listen`, you should see:
     - ✅ `checkout.session.completed`
     - ✅ `customer.subscription.created`
     - ✅ `invoice.paid`

7. **Verify dashboard:**
   - Redirected to dashboard with success message
   - Tier badge shows "Pro"
   - Refresh interval: 5 minutes
   - Last 30 alerts visible
   - Unlimited watchlist export
   - Ad banner removed

**✅ Expected:** User upgraded to Pro tier successfully

---

### Test 3: View Subscription in Profile

1. **Go to Profile page:** http://localhost:8081/profile

2. **Check subscription details:**
   - Current plan: Pro
   - Billing cycle: Monthly
   - Next billing date shown
   - "Cancel Subscription" button visible

**✅ Expected:** Subscription info displayed correctly

---

### Test 4: Manage Subscription (Stripe Portal)

1. **Click "Manage Subscription"** in profile

2. **Stripe Customer Portal opens:**
   - Can update payment method
   - Can view invoices
   - Can cancel subscription

3. **Test updating payment method:**
   - Add new test card: `5555 5555 5555 4444`
   - Set as default

**✅ Expected:** Payment method updated successfully

---

### Test 5: Cancel Subscription (At Period End)

1. **In Profile, click "Cancel Subscription"**

2. **Select "Cancel at period end"** (not immediate)

3. **Confirm cancellation**

4. **Check webhook:**
   - `customer.subscription.updated` event received
   - `cancel_at_period_end: true`

5. **Verify in Profile:**
   - Shows "Your subscription will end on [date]"
   - Still has Pro features until period end

**✅ Expected:** Subscription set to cancel at period end

---

### Test 6: Upgrade to Elite (Yearly)

1. **Go to Pricing page**

2. **Click "Upgrade to Elite - Yearly"**

3. **Complete Stripe Checkout:**
   - Use test card: `4242 4242 4242 4242`
   - Price: $299/year

4. **Verify:**
   - Tier badge shows "Elite"
   - All Elite features unlocked
   - Refresh interval: 30 seconds

**✅ Expected:** User upgraded to Elite tier

---

### Test 7: Test Failed Payment

1. **Use a test card that will be declined:**
   ```
   Card: 4000 0000 0000 0002 (Generic decline)
   ```

2. **Attempt checkout**

3. **Verify:**
   - Payment fails with error message
   - User remains on current tier
   - Audit log records `payment_failed` event

**✅ Expected:** Failed payment handled gracefully

---

### Test 8: Check Database & Audit Logs

1. **Open Python shell:**
   ```bash
   python
   ```

2. **Query database:**
   ```python
   from app import app, db
   from models import User, Subscription, AuditLog
   
   with app.app_context():
       # Get test user
       user = User.query.filter_by(email='test+pro@example.com').first()
       print(f"User: {user.email}")
       print(f"Tier: {user.tier_name}")
       print(f"Stripe Customer ID: {user.stripe_customer_id}")
       
       # Get subscription
       sub = Subscription.query.filter_by(user_id=user.id).first()
       if sub:
           print(f"\nSubscription:")
           print(f"  Status: {sub.status}")
           print(f"  Tier: {sub.tier}")
           print(f"  Billing: {sub.billing_cycle}")
           print(f"  Period End: {sub.current_period_end}")
       
       # Get audit logs
       logs = AuditLog.query.filter_by(user_id=user.id).order_by(AuditLog.created_at.desc()).limit(10).all()
       print(f"\nRecent Audit Logs:")
       for log in logs:
           print(f"  {log.created_at} - {log.event_type}")
   ```

**✅ Expected:** All payment events logged correctly

---

## 🐛 Troubleshooting

### Issue: "Stripe not configured" error

**Solution:**
- Check `.env` file exists and has correct keys
- Restart Flask app after updating `.env`
- Verify keys start with `pk_test_` and `sk_test_`

### Issue: Webhook events not received

**Solution:**
- Ensure `stripe listen` is running
- Check webhook secret in `.env` matches Stripe CLI output
- Look for webhook errors in Flask logs
- Verify webhook endpoint is `/webhook/stripe`

### Issue: Checkout session fails to create

**Solution:**
- Check Stripe Price IDs in `.env` are correct
- Verify prices exist in Stripe Dashboard
- Check Flask logs for specific error messages
- Ensure user is authenticated

### Issue: Subscription not activating after payment

**Solution:**
- Check webhook events were received (`customer.subscription.created`)
- Verify database has subscription record
- Check audit logs for errors
- Manually trigger webhook in Stripe Dashboard for testing

---

## 🎨 Dark Theme Verification

All payment-related UI should match the existing dark theme:

- ✅ Pricing page buttons: Green gradient (`#00ff88`)
- ✅ Stripe Checkout: Uses system theme
- ✅ Flash messages: Match dashboard style
- ✅ Profile subscription section: Dark card style

---

## 📊 Monitoring & Logs

### Check Flask Logs

```bash
# Watch logs in real-time
tail -f logs/binance_dashboard.log

# Search for payment events
grep "payment" logs/binance_dashboard.log
grep "subscription" logs/binance_dashboard.log
```

### Check Stripe Dashboard

1. **Payments:** View all test payments
2. **Subscriptions:** View active subscriptions
3. **Customers:** View customer details
4. **Events:** View webhook event history
5. **Logs:** Debug webhook delivery issues

---

## 🚀 Production Deployment Checklist

Before going live:

- [ ] Replace test keys with live keys (`pk_live_`, `sk_live_`)
- [ ] Update webhook endpoint to production URL
- [ ] Test with real credit card (your own)
- [ ] Set up proper error monitoring (Sentry, etc.)
- [ ] Configure Stripe tax settings if needed
- [ ] Set up email notifications for failed payments
- [ ] Review Stripe radar rules for fraud protection
- [ ] Enable 3D Secure for European customers
- [ ] Set up backup payment method reminders

---

## 📚 Additional Resources

- [Stripe Testing Cards](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Checkout Docs](https://stripe.com/docs/payments/checkout)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/customer-portal)

---

## ✅ Success Criteria

All tests pass when:

1. ✅ Free users can register and access limited features
2. ✅ Users can upgrade to Pro/Elite via Stripe Checkout
3. ✅ Webhooks properly update user tiers and subscriptions
4. ✅ Subscription info displays correctly in profile
5. ✅ Users can cancel subscriptions
6. ✅ Failed payments are handled gracefully
7. ✅ All payment events are logged in audit_logs table
8. ✅ Dark theme is consistent throughout payment flow

---

## 🎉 What's Next?

After completing Step 4 (Payments), move on to:

**Step 5: Settings & Customization Module**
- User dashboard for preferences
- Theme persistence
- Custom alert thresholds
- Notification settings

**Step 6: Data & Alerts Enhancement**
- Additional API columns (OI, liquidations)
- Email alert dispatch
- Full export formats (CSV/JSON)
- Manual refresh button

---

**Built with ❤️ for crypto traders**
**Dark theme, modern design, seamless payments** 🚀



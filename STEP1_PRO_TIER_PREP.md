# Step 1: Pro Tier Prep Work - COMPLETED ✅

## Overview
This step prepares the infrastructure for Pro Tier features by adding:
- Email configuration (SendGrid/SMTP)
- Stripe payment configuration
- Wallet authentication setup (Web3/MetaMask)
- Rate limiting infrastructure
- Database schema updates for new Pro features

## What Was Built

### 1. **Updated Requirements** (`requirements.txt`)
Added the following packages for Pro Tier:
- `stripe>=7.0.0` - Payment processing
- `Flask-WTF>=1.2.0` - Form handling and CSRF protection
- `Flask-Limiter>=3.5.0` - API rate limiting
- `web3>=6.11.0` - Wallet authentication
- `eth-account>=0.10.0` - Ethereum signature verification
- `itsdangerous>=2.1.0` - Token generation for email confirmation
- `email-validator>=2.1.0` - Email validation

### 2. **Config Updates** (`config.py`)
Added three new configuration sections:

#### Email Configuration
```python
MAIL_SERVER, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD
EMAIL_CONFIRMATION_SALT, EMAIL_CONFIRMATION_MAX_AGE
```

#### Stripe Payment Configuration
```python
STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
STRIPE_PRODUCTS = {'pro_monthly', 'pro_yearly', 'elite_monthly', 'elite_yearly'}
```

#### Wallet Authentication
```python
WEB3_PROVIDER_URI - Ethereum RPC endpoint
WALLET_SIGN_MESSAGE - Message template for wallet signatures
```

#### Rate Limiting
```python
RATE_LIMITS = {'free': '100/hour', 'pro': '500/hour', 'elite': '2000/hour'}
DEFAULT_RATE_LIMIT = '50/hour' for unauthenticated users
```

### 3. **App Initialization** (`app.py`)
Initialized new Pro Tier extensions:
- **Flask-Mail**: For sending email alerts and confirmation emails
- **Flask-Limiter**: For rate limiting API requests based on tier

### 4. **Database Model Updates** (`models.py`)
Added new fields to `User` model:

```python
# Email Confirmation (Pro Tier feature)
email_confirmed = db.Column(db.Boolean, default=False, nullable=False)
email_confirmed_at = db.Column(db.DateTime, nullable=True)

# Wallet Authentication (optional crypto sign-in)
wallet_address = db.Column(db.String(42), nullable=True, unique=True, index=True)
wallet_nonce = db.Column(db.String(64), nullable=True)
```

Updated `to_dict()` method to include:
- `email_confirmed`
- `has_wallet`
- `wallet_address` (sensitive)
- `email_confirmed_at` (sensitive)

### 5. **Environment Template** (`env.example`)
Created a comprehensive `.env` template with all required configuration variables for:
- Flask settings
- Database URIs
- Email (SendGrid) configuration
- Stripe API keys and product IDs
- Web3 provider URLs
- Feature flags

### 6. **Database Migration Script** (`migrate_db_step1.py`)
Created a migration script that:
- Adds new columns to existing databases
- Grandfathers existing users (sets `email_confirmed=True` for old accounts)
- Provides migration summary

---

## Installation & Setup

### Step 1: Install New Dependencies

```bash
cd /Users/nikolaysitnikov/Documents/Documents_Nik_MacBook/Everyday\ Life/AI/VolumeFunding/FlashCur

# Install new packages
pip install -r requirements.txt
```

Expected output:
```
Successfully installed stripe-7.x.x flask-wtf-1.x.x flask-limiter-3.x.x web3-6.x.x ...
```

### Step 2: Create Environment File

```bash
# Copy the template
cp env.example .env

# Edit with your values (optional for now, defaults will work)
# You can add real keys later when implementing Stripe/Email features
```

**For now, you can skip filling in the .env file** - the app will use default values. You'll need real keys when testing payments and emails in future steps.

### Step 3: Migrate Database (if you have existing users)

```bash
# Run the migration script
python migrate_db_step1.py
```

Expected output:
```
🔄 Starting database migration for Pro Tier features...

➕ Adding 'email_confirmed' column to users...
   ✅ Added email_confirmed column
➕ Adding 'email_confirmed_at' column to users...
   ✅ Added email_confirmed_at column
➕ Adding 'wallet_address' column to users...
   ✅ Added wallet_address column
➕ Adding 'wallet_nonce' column to users...
   ✅ Added wallet_nonce column

🎉 Migration completed successfully!

📝 Setting email_confirmed=True for all existing users (grandfathering)...
   ✅ Updated X existing user(s)

📊 Migration Summary:
   • Total users: X
   • Email confirmed: X
   • With wallet: 0

✅ Database is ready for Pro Tier features!
```

### Step 4: Test the Application

```bash
# Start the app
python app.py
```

Expected console output should now include:
```
🗄️  Database initialized
🔐 Authentication system initialized
📧 Flask-Mail initialized for Pro Tier email features
🚦 Flask-Limiter initialized for rate limiting
📝 Logging system initialized
🚀 Binance Dashboard Starting Up
```

---

## Manual Testing Instructions

### Test 1: Verify Application Starts Successfully

**Objective**: Ensure all new imports and configurations load without errors.

**Steps**:
1. Open terminal in FlashCur directory
2. Run `python app.py`
3. Look for initialization messages

**Expected Result**:
- ✅ App starts without import errors
- ✅ See "Flask-Mail initialized" message
- ✅ See "Flask-Limiter initialized" message
- ✅ App runs on http://127.0.0.1:8081

**Actual Result**: _____________

---

### Test 2: Verify Database Migration

**Objective**: Ensure new columns were added to User table.

**Steps**:
1. Run `python migrate_db_step1.py`
2. Check for success messages
3. Verify in Python console:
   ```bash
   python
   >>> from app import app, db
   >>> from models import User
   >>> with app.app_context():
   ...     user = User.query.first()
   ...     print(f"Email confirmed: {user.email_confirmed}")
   ...     print(f"Wallet: {user.wallet_address}")
   ```

**Expected Result**:
- ✅ Migration runs without errors
- ✅ `email_confirmed` is `True` for existing users
- ✅ `wallet_address` is `None`

**Actual Result**: _____________

---

### Test 3: Create New User (Post-Migration)

**Objective**: Verify new users get default values for new fields.

**Steps**:
1. Navigate to http://127.0.0.1:8081/register
2. Register a new test user:
   - Email: `testpro@example.com`
   - Password: `testpass123`
   - Theme: Dark or Light
3. Log in
4. Check debug route: http://127.0.0.1:8081/debug/db

**Expected Result**:
- ✅ Registration succeeds
- ✅ User created with:
  - `tier: 0` (Free)
  - `email_confirmed: False` (for new users, will be confirmed in Step 2)
  - `wallet_address: None`

**Actual Result**: _____________

---

### Test 4: Rate Limiting (Basic Check)

**Objective**: Ensure Flask-Limiter is active (won't enforce limits yet, just verify it loads).

**Steps**:
1. App should start without rate limiting errors
2. Make API requests to http://127.0.0.1:8081/api/data
3. Check response headers for rate limit info (if visible)

**Expected Result**:
- ✅ API works normally
- ✅ No rate limit errors in console
- ✅ (Rate limits will be enforced in later steps)

**Actual Result**: _____________

---

### Test 5: Config Helper Functions

**Objective**: Verify tier-specific config helpers work.

**Steps**:
1. Open Python console:
   ```python
   from config import get_tier_config, get_refresh_interval, get_alert_limit
   
   # Test Free tier
   free_config = get_tier_config(0)
   print(f"Free refresh: {free_config['refresh_ms']} ms")
   print(f"Free alerts: {get_alert_limit(0)}")
   
   # Test Pro tier
   pro_config = get_tier_config(1)
   print(f"Pro refresh: {pro_config['refresh_ms']} ms")
   print(f"Pro alerts: {get_alert_limit(1)}")
   print(f"Pro features: {pro_config['features']}")
   ```

**Expected Result**:
```
Free refresh: 900000 ms (15 min)
Free alerts: 10
Pro refresh: 300000 ms (5 min)
Pro alerts: 30
Pro features: {'email_alerts': True, 'custom_thresholds': True, ...}
```

**Actual Result**: _____________

---

### Test 6: User Model Methods

**Objective**: Verify new User model fields and methods.

**Steps**:
```python
from app import app, db
from models import User

with app.app_context():
    user = User.query.filter_by(tier=0).first()
    
    # Check new properties
    print(f"Email confirmed: {user.email_confirmed}")
    print(f"Has wallet: {user.wallet_address is not None}")
    
    # Test to_dict with new fields
    user_dict = user.to_dict(include_sensitive=False)
    print(f"Public dict: {user_dict}")
    
    user_dict_sensitive = user.to_dict(include_sensitive=True)
    print(f"Sensitive dict keys: {user_dict_sensitive.keys()}")
```

**Expected Result**:
- ✅ `email_confirmed` returns Boolean
- ✅ Public dict includes `email_confirmed` and `has_wallet`
- ✅ Sensitive dict includes `wallet_address` and `email_confirmed_at`

**Actual Result**: _____________

---

## Summary of Changes

| File | Changes |
|------|---------|
| `requirements.txt` | Added 7 new packages for Pro Tier |
| `config.py` | Added 4 new config sections (~60 lines) |
| `app.py` | Initialized Flask-Mail and Flask-Limiter |
| `models.py` | Added 4 new User fields, updated `to_dict()` |
| `env.example` | Created template with all Pro Tier variables |
| `migrate_db_step1.py` | Created migration script for existing DBs |

---

## What's Next: Step 2 - Email Module

The next step will implement:
- Email confirmation on registration (Pro feature prep)
- Email utility functions (send confirmation, send alerts)
- Confirmation token generation/verification
- Confirmation route (`/confirm/<token>`)
- Email templates (HTML + plain text)

---

## Notes

### For Existing Users
- Migration automatically sets `email_confirmed=True` for all existing accounts (grandfathering)
- New registrations after this step will have `email_confirmed=False` by default
- Email confirmation will be enforced in Step 2 (optional) or Step 4 (when payments kick in)

### Development vs Production
- **Dev**: Can use default config values, Flask-Mail won't send real emails
- **Prod**: Need real SendGrid API key, Stripe keys, Web3 RPC endpoint

### Rate Limiting Strategy
- Initialized but not enforced in Step 1
- Will add per-endpoint limits in future steps:
  - `/api/data`: Tier-based limits
  - `/api/alerts`: Tier-based limits
  - `/api/watchlist`: Tier-based limits

---

## Troubleshooting

### Import Errors
If you see `ModuleNotFoundError`:
```bash
pip install -r requirements.txt --upgrade
```

### Database Column Already Exists
If migration says column exists, it's safe - means you already ran it or created fresh DB.

### Flask-Mail Errors on Startup
If you see mail config errors, make sure `config.py` has all MAIL_* variables (even if empty strings).

---

**Step 1 Status**: ✅ COMPLETE

Ready to proceed to Step 2: Email Module Implementation.


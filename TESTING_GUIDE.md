# Step 2: Database Module - Testing Guide

## 🧪 How to Test the Database Implementation

This guide provides step-by-step instructions for testing all database functionality.

---

## Method 1: Automated Testing (Recommended)

### Run the Test Suite

The easiest way to test everything is to run the automated test script:

```bash
cd "/Users/nikolaysitnikov/Documents/Documents_Nik_MacBook/Everyday Life/AI/VolumeFunding/FlashCur"
python test_database.py
```

**Expected Output:**
```
🗄️  Database initialized

======================================================================
🧪 TESTING DATABASE MODULE
======================================================================

📋 Step 1: Creating database tables...
✅ Tables created successfully!

📋 Step 2: Verifying tables...
✅ Found tables: alert_preferences, users

[... more test output ...]

======================================================================
✅ ALL TESTS PASSED!
======================================================================

📊 Summary:
  • Total Users: 3
  • Free Tier Users: 1
  • Pro Tier Users: 1
  • Elite Tier Users: 1
```

If you see "✅ ALL TESTS PASSED!", the database module is working correctly!

---

## Method 2: Manual Testing via Debug Routes

### Prerequisites

Start the Flask development server:

```bash
cd "/Users/nikolaysitnikov/Documents/Documents_Nik_MacBook/Everyday Life/AI/VolumeFunding/FlashCur"
python app.py
```

The server will start on `http://localhost:8081`

---

### Test 1: Check Database Status

**URL:** `http://localhost:8081/debug/db`

**What it does:** Shows all users in the database and database info

**Expected Response:**
```json
{
  "success": true,
  "database_uri": "sqlite:///binance_dashboard.db",
  "user_count": 3,
  "users": [
    {
      "id": 1,
      "email": "test-free@example.com",
      "tier": 0,
      "tier_name": "Free",
      "is_active": true,
      "theme_preference": "dark",
      "created_at": "2025-10-19T01:32:09.233495"
    },
    ...
  ],
  "message": "✅ Database is working! Found 3 user(s)."
}
```

✅ **Pass Criteria:** `success: true` and you see the user list

---

### Test 2: Create a New User

**URL:** `http://localhost:8081/debug/create-user?email=mytest@example.com&password=securepass123&tier=0`

**Parameters:**
- `email` (required): Email address for the new user
- `password` (required): Password (will be hashed automatically)
- `tier` (optional): 0=Free, 1=Pro, 2=Elite (default: 0)

**Expected Response:**
```json
{
  "success": true,
  "message": "✅ User created successfully!",
  "user": {
    "id": 4,
    "email": "mytest@example.com",
    "tier": 0,
    "tier_name": "Free",
    ...
  },
  "alert_preferences": {
    "id": 4,
    "user_id": 4,
    "volume_multiple": 3.0,
    "min_quote_volume": 3000000,
    ...
  }
}
```

✅ **Pass Criteria:** 
- `success: true`
- User object returned with correct email and tier
- Alert preferences automatically created

❌ **Expected Failure (duplicate email):**
```json
{
  "success": false,
  "message": "❌ User with email mytest@example.com already exists!",
  "user": { ... existing user data ... }
}
```

---

### Test 3: Test Password Verification

**URL:** `http://localhost:8081/debug/test-password?email=mytest@example.com&password=securepass123`

**Parameters:**
- `email`: Email of the user to test
- `password`: Password to verify

**Expected Response (correct password):**
```json
{
  "success": true,
  "password_valid": true,
  "message": "✅ Password is correct!",
  "user": { ... user data ... }
}
```

**Expected Response (wrong password):**
```json
{
  "success": true,
  "password_valid": false,
  "message": "❌ Password is incorrect!",
  "user": { ... user data ... }
}
```

✅ **Pass Criteria:** 
- Correct password returns `password_valid: true`
- Wrong password returns `password_valid: false`

---

### Test 4: Upgrade User Tier

**URL:** `http://localhost:8081/debug/upgrade-tier?email=mytest@example.com&tier=1`

**Parameters:**
- `email`: Email of the user to upgrade
- `tier`: New tier level (0=Free, 1=Pro, 2=Elite)

**Expected Response:**
```json
{
  "success": true,
  "message": "✅ User tier updated from Free to Pro!",
  "old_tier": 0,
  "new_tier": 1,
  "user": {
    "id": 4,
    "tier": 1,
    "tier_name": "Pro",
    ...
  }
}
```

✅ **Pass Criteria:** 
- `success: true`
- Tier changed from old value to new value
- Can verify by visiting `/debug/db` again

---

### Test 5: Delete a User

**URL:** `http://localhost:8081/debug/delete-user?email=mytest@example.com`

**Parameters:**
- `email`: Email of the user to delete

**Expected Response:**
```json
{
  "success": true,
  "message": "✅ User mytest@example.com deleted successfully!",
  "deleted_user": { ... user data ... }
}
```

✅ **Pass Criteria:** 
- `success: true`
- User no longer appears in `/debug/db`

---

## Method 3: Direct Database Inspection

### Using SQLite Command Line

```bash
cd "/Users/nikolaysitnikov/Documents/Documents_Nik_MacBook/Everyday Life/AI/VolumeFunding/FlashCur"

# Open the database
sqlite3 instance/binance_dashboard.db

# View tables
.tables

# View users
SELECT * FROM users;

# View alert preferences
SELECT * FROM alert_preferences;

# Count users by tier
SELECT tier, COUNT(*) FROM users GROUP BY tier;

# Exit
.quit
```

**Expected Output:**
```
sqlite> .tables
alert_preferences  users

sqlite> SELECT email, tier FROM users;
test-free@example.com|0
test-pro@example.com|1
test-elite@example.com|2
```

---

## Method 4: Python Interactive Testing

```bash
cd "/Users/nikolaysitnikov/Documents/Documents_Nik_MacBook/Everyday Life/AI/VolumeFunding/FlashCur"
python
```

```python
from app import app, db, User, get_user_by_email

# Work within app context
with app.app_context():
    # Get all users
    users = User.query.all()
    print(f"Total users: {len(users)}")
    
    # Get specific user
    user = get_user_by_email('test-free@example.com')
    print(f"User: {user.email}, Tier: {user.tier_name}")
    
    # Test password
    is_valid = user.check_password('password123')
    print(f"Password valid: {is_valid}")
    
    # Check tier properties
    print(f"Is Free: {user.is_free_tier}")
    print(f"Is Pro: {user.is_pro_tier}")
    print(f"Is Paid: {user.is_paid_tier}")
    
    # Serialize to dict
    user_dict = user.to_dict(include_sensitive=True)
    print(user_dict)
```

---

## 🎯 Complete Test Checklist

Use this checklist to verify everything works:

### Database Initialization
- [ ] Database file created at `instance/binance_dashboard.db`
- [ ] Tables created: `users`, `alert_preferences`
- [ ] No errors in console on app startup

### User Creation
- [ ] Can create new users with email/password
- [ ] Passwords are hashed (not stored as plaintext)
- [ ] Default tier is 0 (Free)
- [ ] Alert preferences auto-created for new users
- [ ] Cannot create duplicate emails (proper error)

### User Authentication
- [ ] Correct password returns `True`
- [ ] Wrong password returns `False`
- [ ] Password hashing is secure (pbkdf2:sha256)

### Tier Management
- [ ] Can upgrade user from Free (0) to Pro (1)
- [ ] Can upgrade user from Pro (1) to Elite (2)
- [ ] Can downgrade user tiers
- [ ] Tier properties work: `is_free_tier`, `is_pro_tier`, etc.
- [ ] `tier_name` returns correct string (Free/Pro/Elite)

### User Queries
- [ ] Can query all users
- [ ] Can query user by email
- [ ] Can query user by ID
- [ ] Email lookups are case-sensitive

### Relationships
- [ ] AlertPreferences linked to User
- [ ] Deleting user cascades to alert_preferences
- [ ] Can access user.alert_preferences

### Data Integrity
- [ ] Timestamps auto-set on creation
- [ ] `updated_at` auto-updates on changes
- [ ] Email uniqueness enforced
- [ ] Foreign key constraints work

---

## 🐛 Troubleshooting

### Error: "No module named 'flask_sqlalchemy'"

**Solution:** Install dependencies
```bash
pip install -r requirements.txt
```

### Error: "Table already exists"

**Solution:** This is normal if you ran the test script multiple times. The database persists between runs.

### Error: "UNIQUE constraint failed: users.email"

**Solution:** You're trying to create a user with an email that already exists. Use a different email or delete the existing user first.

### Database file not found

**Solution:** The database is created on first run. Make sure you:
1. Run `python app.py` or `python test_database.py` at least once
2. Check the `instance/` folder (Flask creates this automatically)

### Want to reset the database?

**Solution:** Delete and recreate:
```bash
rm instance/binance_dashboard.db
python test_database.py
```

---

## ✅ Success Indicators

You'll know Step 2 is successful when:

1. ✅ Running `python test_database.py` shows "ALL TESTS PASSED"
2. ✅ The Flask app starts without database errors
3. ✅ All 5 debug routes return valid JSON responses
4. ✅ Users can be created, queried, upgraded, and deleted
5. ✅ Passwords are hashed and verified correctly
6. ✅ Alert preferences are automatically created
7. ✅ Database file exists at `instance/binance_dashboard.db`

---

## 📝 Next Steps

Once all tests pass, you're ready for **Step 3: Build Authentication Module**, which will:
- Create login/register pages
- Integrate Flask-Login for session management
- Add authentication to dashboard routes
- Restrict features based on user tier

Great job completing Step 2! 🎉


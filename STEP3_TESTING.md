# ✅ Step 3: Authentication Module - Testing Guide

## 🧪 Manual Testing Instructions

### Prerequisites

Make sure you've completed Step 2 (Database Module) and have test users in your database.

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

## ✅ Test 1: Dashboard Requires Login

### What to Test
Verify that unauthenticated users cannot access the dashboard.

### Steps
1. Open your browser (clear cookies/use incognito mode)
2. Visit: `http://localhost:8081/`

### Expected Result
- ✅ You are **automatically redirected** to `http://localhost:8081/login`
- ✅ You see a flash message: "🔒 Please log in to access the dashboard."
- ✅ Beautiful login page appears with dark theme by default

### Screenshots to Verify
- Login form with email/password fields
- Theme toggle button (top right)
- "Test Accounts" section at the bottom
- "Sign up for free" link

---

## ✅ Test 2: Register New Account

### What to Test
Create a new user account and verify Free tier assignment.

### Steps
1. From the login page, click **"Sign up for free"**
2. Fill in the registration form:
   - Email: `newtester@example.com`
   - Password: `testpassword123`
   - Confirm Password: `testpassword123`
   - Theme: `Dark Mode` (or Light Mode)
3. Click **"Create Free Account"**

### Expected Result
- ✅ Redirected to dashboard at `http://localhost:8081/`
- ✅ Flash message: "🎉 Welcome to Binance Dashboard! Your Free tier account has been created."
- ✅ Dashboard loads successfully
- ✅ User info appears in header: email + "FREE" tier badge
- ✅ Logout button (🚪) visible

### Verification
Check user was created with Free tier:
```bash
python -c "from app import app, db, User; \
with app.app_context(): \
    u = User.query.filter_by(email='newtester@example.com').first(); \
    print(f'User: {u.email}, Tier: {u.tier_name}')"
```
Should output: `User: newtester@example.com, Tier: Free`

---

## ✅ Test 3: Login with Test Accounts

### Test 3A: Login as Free User

### Steps
1. Click the logout button (🚪) or visit `http://localhost:8081/logout`
2. You're redirected to login page with message: "👋 You have been logged out successfully."
3. Click "🔧 Test Accounts" to expand test credentials
4. Enter:
   - Email: `test-free@example.com`
   - Password: `password123`
5. Check "Remember me" checkbox
6. Click **"Sign In"**

### Expected Result
- ✅ Redirected to dashboard
- ✅ Flash message: "✅ Welcome back, test-free@example.com! You are on the Free tier."
- ✅ Header shows: `test-free@example.com` with **FREE** badge (gray/muted color)
- ✅ Dashboard loads with market data

### Test 3B: Login as Pro User

### Steps
1. Logout and return to login page
2. Enter:
   - Email: `test-pro@example.com`
   - Password: `password123`
3. Click **"Sign In"**

### Expected Result
- ✅ Flash message: "✅ Welcome back, test-pro@example.com! You are on the Pro tier."
- ✅ Header shows **PRO** badge (blue color)

### Test 3C: Login as Elite User

### Steps
1. Logout and return to login page
2. Enter:
   - Email: `test-elite@example.com`
   - Password: `password123`
3. Click **"Sign In"**

### Expected Result
- ✅ Flash message: "✅ Welcome back, test-elite@example.com! You are on the Elite tier."
- ✅ Header shows **ELITE** badge (purple color)

---

## ✅ Test 4: Password Validation

### Test 4A: Wrong Password

### Steps
1. Logout
2. Try to login with:
   - Email: `test-free@example.com`
   - Password: `wrongpassword`
3. Click "Sign In"

### Expected Result
- ✅ Stays on login page
- ✅ Flash message: "❌ Invalid email or password."
- ✅ Email field retains the entered email

### Test 4B: Non-existent Account

### Steps
1. Try to login with:
   - Email: `nonexistent@example.com`
   - Password: `anypassword`
2. Click "Sign In"

### Expected Result
- ✅ Flash message: "❌ Invalid email or password."
- ✅ Same error message (doesn't reveal if email exists - security best practice)

---

## ✅ Test 5: Registration Validation

### Test 5A: Duplicate Email

### Steps
1. Go to registration page
2. Try to register with existing email:
   - Email: `test-free@example.com`
   - Password: `newpassword123`
   - Confirm Password: `newpassword123`
3. Click "Create Free Account"

### Expected Result
- ✅ Stays on registration page
- ✅ Flash message: "❌ An account with this email already exists."

### Test 5B: Password Mismatch

### Steps
1. Register with:
   - Email: `tester2@example.com`
   - Password: `password123`
   - Confirm Password: `password456` (different!)
3. Click "Create Free Account"

### Expected Result
- ✅ Flash message: "❌ Passwords do not match."

### Test 5C: Short Password

### Steps
1. Register with:
   - Email: `tester3@example.com`
   - Password: `short` (less than 8 characters)
   - Confirm Password: `short`
3. Click "Create Free Account"

### Expected Result
- ✅ Flash message: "❌ Password must be at least 8 characters long."

### Test 5D: Invalid Email

### Steps
1. Register with:
   - Email: `notanemail` (no @ or .)
   - Password: `password123`
   - Confirm Password: `password123`
3. Click "Create Free Account"

### Expected Result
- ✅ Flash message: "❌ Please enter a valid email address."

---

## ✅ Test 6: Theme Persistence

### Steps
1. On the login page, click the theme toggle (🌙/☀️) to switch to **Light Mode**
2. Verify the background changes to light colors
3. Register a new account while in light mode:
   - Email: `lightuser@example.com`
   - Password: `password123`
   - Theme: Select "☀️ Light Mode"
4. Complete registration

### Expected Result
- ✅ Dashboard loads in **light theme**
- ✅ User's theme preference saved in database
- ✅ On next login, theme is restored automatically

### Verification
```bash
python -c "from app import app, db, User; \
with app.app_context(): \
    u = User.query.filter_by(email='lightuser@example.com').first(); \
    print(f'Theme: {u.theme_preference}')"
```
Should output: `Theme: light`

---

## ✅ Test 7: Remember Me Functionality

### Steps
1. Login with "Remember me" checkbox **checked**
2. Close browser completely
3. Reopen browser and visit `http://localhost:8081/`

### Expected Result
- ✅ Still logged in (session persists for 30 days)
- ✅ Dashboard loads without login prompt

### Steps (Without Remember Me)
1. Logout
2. Login **without** checking "Remember me"
3. Close browser
4. Reopen and visit dashboard

### Expected Result
- ✅ Session expires (redirected to login)

---

## ✅ Test 8: API Endpoints

### Test 8A: /api/user Endpoint (Authenticated)

### Steps
1. Login to dashboard
2. Visit: `http://localhost:8081/api/user`

### Expected Result
JSON response like:
```json
{
  "authenticated": true,
  "user": {
    "id": 1,
    "tier": 0,
    "tier_name": "Free",
    "is_active": true,
    "theme_preference": "dark",
    "created_at": "2025-10-19T..."
  },
  "tier": 0,
  "tier_name": "Free",
  "theme_preference": "dark",
  "is_free": true,
  "is_pro": false,
  "is_elite": false,
  "refresh_interval": 900000
}
```

### Test 8B: /api/user Endpoint (Guest)

### Steps
1. Logout
2. Visit: `http://localhost:8081/api/user`

### Expected Result
```json
{
  "authenticated": false,
  "user": null,
  "tier": 0,
  "tier_name": "Guest",
  "theme_preference": "dark",
  "is_free": true,
  "is_pro": false,
  "is_elite": false,
  "refresh_interval": 900000
}
```

### Test 8C: /api/check-auth Endpoint

### Steps
Visit: `http://localhost:8081/api/check-auth`

### Expected Result (if logged in)
```json
{
  "authenticated": true,
  "tier": 0
}
```

### Expected Result (if logged out)
```json
{
  "authenticated": false,
  "tier": 0
}
```

---

## ✅ Test 9: Logout Functionality

### Steps
1. Login as any user
2. Click the logout button (🚪) in the header
3. Or visit: `http://localhost:8081/logout`

### Expected Result
- ✅ Redirected to login page
- ✅ Flash message: "👋 You have been logged out successfully."
- ✅ Session cleared
- ✅ Visiting dashboard redirects to login

---

## ✅ Test 10: UI/UX Verification

### Dark Theme
1. Login page loads with dark background
2. Green accent color (#00ff88) on buttons, links, badges
3. Smooth animations when page loads
4. Flash messages slide in from right
5. Theme toggle button works

### Light Theme
1. Toggle to light theme
2. Background changes to light gray/white
3. Text changes to dark colors
4. Green accent changes to #10b981 (darker green)
5. All UI elements remain readable

### Responsive Design
1. Shrink browser to mobile width (< 768px)
2. User info hidden (too cramped)
3. Theme toggle still visible
4. Login/register forms adapt to mobile

---

## ✅ Test 11: Security Checks

### Password Hashing
```bash
python -c "from app import app, db, User; \
with app.app_context(): \
    u = User.query.first(); \
    print(f'Password hash (should be long): {u.password_hash[:50]}...')"
```
- ✅ Password hash should start with `scrypt:` or `pbkdf2:sha256:`
- ✅ Length should be ~200+ characters
- ✅ NOT the plaintext password

### Session Security
1. Login and copy session cookie from browser DevTools
2. Logout
3. Try to paste the cookie and visit dashboard
- ✅ Should redirect to login (session invalidated)

---

## 🎯 Complete Test Checklist

Use this to verify Step 3 is working correctly:

### Authentication Flow
- [ ] ✅ Dashboard requires login
- [ ] ✅ Redirects to /login when not authenticated
- [ ] ✅ Can register new Free tier account
- [ ] ✅ Can login with test accounts (Free, Pro, Elite)
- [ ] ✅ Can logout successfully
- [ ] ✅ Session persists with "Remember me"

### Validation
- [ ] ✅ Rejects wrong password
- [ ] ✅ Prevents duplicate email registration
- [ ] ✅ Enforces password minimum 8 characters
- [ ] ✅ Validates email format
- [ ] ✅ Checks password confirmation match

### UI/UX
- [ ] ✅ Login page matches dark/light theme
- [ ] ✅ Register page matches theme
- [ ] ✅ Flash messages display correctly
- [ ] ✅ User info shown in dashboard header
- [ ] ✅ Tier badges show correct colors (Gray/Blue/Purple)
- [ ] ✅ Logout button works
- [ ] ✅ Theme toggle works on auth pages

### API Endpoints
- [ ] ✅ /api/user returns correct data when logged in
- [ ] ✅ /api/user returns guest data when logged out
- [ ] ✅ /api/check-auth works correctly

### Security
- [ ] ✅ Passwords are hashed (not plaintext)
- [ ] ✅ Sessions are cleared on logout
- [ ] ✅ Can't access dashboard without login
- [ ] ✅ Same error message for wrong email vs wrong password

---

## 🐛 Troubleshooting

### Error: "ModuleNotFoundError: No module named 'auth'"

**Solution:**
```bash
cd FlashCur
ls -la auth.py  # Verify file exists
python app.py   # Try again
```

### Error: "Template not found: login.html"

**Solution:**
```bash
ls templates/login.html templates/register.html
# If missing, re-create from instructions
```

### Login page has no styling

**Solution:**
```bash
ls static/css/auth.css
# If missing, create auth.css as per instructions
```

### Can't logout (404 error)

**Solution:** Make sure Flask-Login is installed:
```bash
pip install Flask-Login
```

### Theme doesn't persist

**Solution:** Check browser's localStorage is enabled (not in private mode)

---

## ✅ Success Indicators

You'll know Step 3 is successful when:

1. ✅ **Cannot access dashboard without login**
2. ✅ **Can register new accounts (defaulting to Free tier)**
3. ✅ **Can login with test accounts (all 3 tiers)**
4. ✅ **Login/register pages match your beautiful theme**
5. ✅ **User info + tier badge shown in dashboard header**
6. ✅ **Logout works and clears session**
7. ✅ **Validation prevents bad registrations**
8. ✅ **Passwords are hashed securely**
9. ✅ **Theme persists across sessions**
10. ✅ **All 3 API endpoints return correct data**

---

## 📊 Test Results Summary

After completing all tests, fill this out:

| Test Category | Status | Notes |
|--------------|--------|-------|
| Dashboard Protection | ✅ / ❌ | |
| Registration | ✅ / ❌ | |
| Login (All Tiers) | ✅ / ❌ | |
| Logout | ✅ / ❌ | |
| Validation | ✅ / ❌ | |
| Theme UI | ✅ / ❌ | |
| API Endpoints | ✅ / ❌ | |
| Security | ✅ / ❌ | |
| Responsive Design | ✅ / ❌ | |

---

## 🚀 Ready for Step 4

Once all tests pass, you're ready for **Step 4: Tier Description Page** (pricing page)!

Great job completing Step 3! 🎉


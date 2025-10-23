# 🔑 Wallet Authentication Testing Guide

**Step 3 Implementation: Wallet Authentication Module (MetaMask Integration)**

This guide provides step-by-step instructions for testing the newly implemented wallet authentication feature.

---

## 📋 Prerequisites

Before testing, ensure you have:

1. ✅ **MetaMask Browser Extension Installed**
   - Download from: https://metamask.io/download/
   - Compatible browsers: Chrome, Firefox, Brave, Edge
   - Create a test wallet (use testnet only, never real funds for testing!)

2. ✅ **Application Running**
   - Navigate to FlashCur directory
   - Run: `python app.py`
   - Server should start on `http://localhost:8081`

3. ✅ **Test Network Setup** (Optional but Recommended)
   - Switch MetaMask to a test network (Sepolia, Goerli, or Polygon Mumbai)
   - Get free test ETH from a faucet (not required for signing, but good practice)

4. ✅ **Clear Browser Cache** (Recommended)
   - Clear cookies/localStorage for localhost:8081 to start fresh

---

## 🧪 Test Scenarios

### **Test 1: Sign In with Wallet (New User)**

**Objective:** Verify that a new user can create an account using only their wallet.

#### Steps:

1. **Open Login Page**
   - Navigate to: `http://localhost:8081/login`
   - Verify you see the "Sign in with Wallet" button (orange/MetaMask-themed)

2. **Click "Sign in with Wallet"**
   - Button should display "Connecting..." (with ⏳ icon)
   - MetaMask popup should appear

3. **Connect Wallet in MetaMask**
   - Select an account to connect
   - Click "Next" → "Connect"
   - If MetaMask doesn't appear, click the extension icon in your browser

4. **Sign Authentication Message**
   - MetaMask will show a message to sign:
     ```
     Sign this message to authenticate with Binance Dashboard.
     
     Nonce: [random hex string]
     ```
   - Click "Sign" in MetaMask
   - **Do NOT click "Cancel"** (this will abort the process)

5. **Verify Authentication Success**
   - Status message should show: "✅ Authentication successful! Redirecting..."
   - You should be redirected to the dashboard
   - Header should show your wallet address (truncated): `0x1234...5678`

6. **Verify Account Created**
   - Go to Profile page (⚙️ icon in header)
   - Check Account Information:
     - **Email:** Should be `0x[your-address]@wallet.local` (dummy email for wallet users)
     - **Current Plan:** Free
     - **Member Since:** Today's date
     - **Account Status:** ✅ Active

7. **Verify Wallet Section**
   - In Profile page, scroll to "Wallet Authentication" card
   - Should show:
     - **Linked Wallet:** `0x1234...5678` with copy button (📋)
     - Message: "✅ You can sign in with your wallet without needing a password."
     - Warning: "⚠️ This is a wallet-only account. Set an email and password before unlinking your wallet."

#### Expected Results:
- ✅ New user account created automatically
- ✅ User logged in successfully
- ✅ Wallet address linked to account
- ✅ Dashboard accessible
- ✅ Profile shows wallet information

---

### **Test 2: Sign In with Wallet (Returning User)**

**Objective:** Verify that an existing wallet user can log in again.

#### Steps:

1. **Log Out**
   - Click logout button in dashboard
   - Should redirect to login page

2. **Sign In Again with Same Wallet**
   - Click "Sign in with Wallet"
   - Connect wallet (may auto-connect if previously authorized)
   - Sign authentication message
   - Should redirect to dashboard

3. **Verify Session Persists**
   - Close browser tab
   - Reopen `http://localhost:8081`
   - Should still be logged in (session persistence)

#### Expected Results:
- ✅ Login successful without creating duplicate account
- ✅ User data preserved from previous session
- ✅ Session persists across browser restarts

---

### **Test 3: Link Wallet to Email/Password Account**

**Objective:** Verify that an existing email/password user can link their wallet.

#### Steps:

1. **Create Email/Password Account**
   - Go to `http://localhost:8081/register`
   - Register with email: `test-wallet-link@example.com`
   - Password: `testpassword123`
   - Complete registration

2. **Navigate to Profile**
   - Go to Profile page (⚙️ icon)
   - Scroll to "Wallet Authentication" card
   - Should show: "Link your crypto wallet (MetaMask) to enable password-less sign-in"

3. **Click "Link Wallet"**
   - Button should show "Connecting..." (⏳)
   - MetaMask popup appears

4. **Connect and Sign**
   - Select wallet account
   - Sign authentication message

5. **Verify Wallet Linked**
   - Status message: "✅ Wallet linked successfully! Reloading..."
   - Page reloads automatically
   - "Wallet Authentication" card now shows:
     - **Linked Wallet:** `0x1234...5678`
     - "Unlink Wallet" button (red/danger style)

6. **Test Dual Login Methods**
   - Log out
   - **Method 1:** Sign in with wallet → Should work
   - Log out
   - **Method 2:** Sign in with email/password → Should work

#### Expected Results:
- ✅ Wallet successfully linked to email account
- ✅ Both login methods work
- ✅ Same account accessed via both methods
- ✅ No duplicate accounts created

---

### **Test 4: Unlink Wallet from Email Account**

**Objective:** Verify that a user can unlink their wallet (only if they have email/password set).

#### Steps:

1. **Ensure Account Has Both Email and Wallet**
   - Use account from Test 3
   - Profile should show both email and linked wallet

2. **Click "Unlink Wallet"**
   - Confirmation dialog should appear:
     - "Are you sure you want to unlink your wallet? You will still be able to sign in with your email and password."
   - Click "OK"

3. **Verify Unlinking**
   - Status message: "✅ Wallet unlinked successfully! Reloading..."
   - Page reloads
   - "Wallet Authentication" card now shows "Link Wallet" button again

4. **Verify Email Login Still Works**
   - Log out
   - Sign in with email and password → Should work

5. **Verify Wallet Login No Longer Works**
   - Log out
   - Try to sign in with wallet
   - Should create NEW account (different from email account)

#### Expected Results:
- ✅ Wallet successfully unlinked
- ✅ Email login still functional
- ✅ Wallet login creates separate account after unlinking

---

### **Test 5: Wallet-Only Account Protection**

**Objective:** Verify that wallet-only accounts cannot unlink without setting email/password first.

#### Steps:

1. **Use Wallet-Only Account**
   - Use account created in Test 1 (no email/password)
   - Go to Profile page

2. **Check Wallet Section**
   - Should show linked wallet
   - Should show warning:
     - "⚠️ This is a wallet-only account. Set an email and password before unlinking your wallet."
   - "Unlink Wallet" button should NOT be visible

3. **Verify Email Field**
   - Email in Account Information should be: `0x[address]@wallet.local`

#### Expected Results:
- ✅ Unlink button hidden for wallet-only accounts
- ✅ Warning message displayed
- ✅ User cannot lock themselves out

---

### **Test 6: Multiple Wallet Accounts**

**Objective:** Verify that different wallets create separate accounts.

#### Steps:

1. **Sign In with First Wallet**
   - Use wallet address A
   - Note the account details

2. **Log Out and Switch Wallets**
   - Log out
   - Switch to a different MetaMask account (address B)

3. **Sign In with Second Wallet**
   - Click "Sign in with Wallet"
   - Connect and sign with wallet B

4. **Verify Separate Account**
   - Should be a NEW account (different from wallet A)
   - Different email: `0x[address-B]@wallet.local`
   - Different creation date

5. **Switch Back to First Wallet**
   - Log out
   - Switch MetaMask to wallet A
   - Sign in again
   - Should return to original account (not create duplicate)

#### Expected Results:
- ✅ Each wallet creates separate account
- ✅ No cross-contamination between accounts
- ✅ Returning to same wallet returns to same account

---

### **Test 7: Wallet Already Linked Error**

**Objective:** Verify that a wallet cannot be linked to multiple accounts.

#### Steps:

1. **Create Email Account #1**
   - Register: `test-link1@example.com`
   - Link wallet address A

2. **Create Email Account #2**
   - Register: `test-link2@example.com`
   - Try to link same wallet address A

3. **Verify Error**
   - Should see error: "❌ This wallet is already linked to another account"
   - Wallet should NOT be linked to second account

4. **Verify First Account Unchanged**
   - Log in to first account
   - Wallet should still be linked

#### Expected Results:
- ✅ Wallet linking to second account blocked
- ✅ Error message displayed
- ✅ First account's wallet link preserved

---

### **Test 8: Copy Wallet Address**

**Objective:** Test the copy-to-clipboard functionality.

#### Steps:

1. **Navigate to Profile**
   - Ensure wallet is linked
   - Find "Linked Wallet" in Wallet Authentication card

2. **Click Copy Button (📋)**
   - Status message should appear: "📋 Address copied to clipboard!"

3. **Verify Clipboard**
   - Open a text editor
   - Paste (Ctrl+V / Cmd+V)
   - Should paste full wallet address (42 characters, starts with `0x`)

#### Expected Results:
- ✅ Full address copied correctly
- ✅ Success message displayed
- ✅ No errors in console

---

### **Test 9: MetaMask Not Installed**

**Objective:** Verify graceful handling when MetaMask is not available.

#### Steps:

1. **Disable MetaMask Extension**
   - Go to browser extensions
   - Disable MetaMask

2. **Try to Sign In with Wallet**
   - Click "Sign in with Wallet"
   - Should see error: "❌ MetaMask not detected. Please install MetaMask browser extension."
   - MetaMask download page should open in new tab

3. **Verify Button Changes**
   - "Sign in with Wallet" button should change to "Install MetaMask"
   - Clicking it should open MetaMask download page

4. **Re-enable MetaMask**
   - Enable extension again
   - Refresh login page
   - Button should be "Sign in with Wallet" again

#### Expected Results:
- ✅ Clear error message when MetaMask missing
- ✅ Link to MetaMask download provided
- ✅ No JavaScript errors in console

---

### **Test 10: User Rejects Signature**

**Objective:** Verify handling of user cancellation.

#### Steps:

1. **Start Wallet Sign-In**
   - Click "Sign in with Wallet"
   - Connect wallet in MetaMask

2. **Reject Signature**
   - When signature request appears, click "Cancel" / "Reject"

3. **Verify Error Handling**
   - Should see error: "❌ Signature request rejected"
   - Button should return to "Sign in with Wallet"
   - No account created

4. **Try Again and Complete**
   - Click "Sign in with Wallet" again
   - This time, sign the message
   - Should successfully authenticate

#### Expected Results:
- ✅ Rejection handled gracefully
- ✅ Error message displayed
- ✅ User can retry immediately
- ✅ No account created on rejection

---

### **Test 11: Session Expiration**

**Objective:** Test nonce session handling.

#### Steps:

1. **Start Sign-In Process**
   - Click "Sign in with Wallet"
   - Connect wallet
   - **Do NOT sign immediately**

2. **Wait 10 Minutes**
   - Leave signature request open
   - Wait for session to expire (server-side)

3. **Sign After Expiration**
   - Click "Sign" in MetaMask (after 10+ minutes)

4. **Verify Error Handling**
   - Should see error: "Session expired. Please request a new nonce."
   - User should start over

5. **Retry**
   - Click "Sign in with Wallet" again (generates new nonce)
   - Sign immediately
   - Should work

#### Expected Results:
- ✅ Expired nonce rejected
- ✅ Clear error message
- ✅ User can retry with fresh nonce

---

### **Test 12: Theme Consistency**

**Objective:** Verify that wallet UI matches the dark/light theme.

#### Steps:

1. **Test Dark Theme**
   - Ensure dark theme is active (🌙 icon)
   - Check wallet button color: Orange/red (`#f3722c`)
   - Check status messages: Match dark theme colors
   - Check profile wallet card: Dark background with green accent

2. **Switch to Light Theme**
   - Click theme toggle (☀️)
   - Verify wallet button adapts to light theme
   - Verify status messages use light theme colors
   - Check profile: White background with proper contrast

3. **Verify on All Pages**
   - Login page: Wallet button
   - Profile page: Wallet management card
   - Both should adapt seamlessly

#### Expected Results:
- ✅ All wallet UI elements match theme
- ✅ Good contrast and readability in both themes
- ✅ Smooth theme transitions
- ✅ No visual glitches

---

### **Test 13: Mobile Responsiveness** (If testing on mobile)

**Objective:** Verify wallet auth works on mobile devices.

#### Steps:

1. **Open on Mobile Browser**
   - Use mobile Chrome/Firefox with MetaMask mobile app
   - Navigate to `http://[your-ip]:8081/login`

2. **Test Wallet Connection**
   - Click "Sign in with Wallet"
   - Should open MetaMask mobile app
   - Connect and sign

3. **Verify UI Adaptation**
   - Wallet button should be responsive
   - Profile wallet card should stack properly
   - Copy button should work

#### Expected Results:
- ✅ MetaMask mobile integration works
- ✅ UI is mobile-friendly
- ✅ All functionality available on mobile

---

## 🐛 Common Issues & Troubleshooting

### Issue: "MetaMask not detected" even though it's installed

**Solution:**
- Refresh the page
- Check if MetaMask extension is enabled
- Try a different browser
- Make sure you're not in incognito/private mode (some extensions are disabled there)

---

### Issue: Signature request doesn't appear

**Solution:**
- Click the MetaMask extension icon manually
- Check if there's a pending request in MetaMask
- Disable other wallet extensions (conflicts)

---

### Issue: "Invalid signature" error

**Solution:**
- Make sure you're signing the correct message
- Don't modify the message in MetaMask
- Check that MetaMask account matches the connected account

---

### Issue: Wallet shows "linked" but login doesn't work

**Solution:**
- Check database: User's `wallet_address` should match MetaMask address
- Try unlinking and re-linking
- Clear browser session/cookies

---

### Issue: "Wallet already linked" when it's not

**Solution:**
- Check if another account already has this wallet
- Use debug route: `/debug/db` (if `ENABLE_DEBUG_ROUTES=True` in config)
- Manually unlink via database if needed

---

## 🎯 Success Criteria

The wallet authentication feature is working correctly if:

✅ **All 13 test scenarios pass**
✅ **No console errors during wallet operations**
✅ **Seamless integration with existing email/password auth**
✅ **UI is consistent with dark/light theme**
✅ **Error handling is graceful and user-friendly**
✅ **Security measures work (nonce, signature verification, session management)**
✅ **No duplicate accounts created**
✅ **Wallet-only accounts are protected from lockout**

---

## 📊 Test Results Template

Use this template to track your testing:

```
✅ Test 1: Sign In with Wallet (New User)          - PASS/FAIL: _______
✅ Test 2: Sign In with Wallet (Returning User)    - PASS/FAIL: _______
✅ Test 3: Link Wallet to Email Account            - PASS/FAIL: _______
✅ Test 4: Unlink Wallet from Email Account        - PASS/FAIL: _______
✅ Test 5: Wallet-Only Account Protection          - PASS/FAIL: _______
✅ Test 6: Multiple Wallet Accounts                - PASS/FAIL: _______
✅ Test 7: Wallet Already Linked Error             - PASS/FAIL: _______
✅ Test 8: Copy Wallet Address                     - PASS/FAIL: _______
✅ Test 9: MetaMask Not Installed                  - PASS/FAIL: _______
✅ Test 10: User Rejects Signature                 - PASS/FAIL: _______
✅ Test 11: Session Expiration                     - PASS/FAIL: _______
✅ Test 12: Theme Consistency                      - PASS/FAIL: _______
✅ Test 13: Mobile Responsiveness                  - PASS/FAIL: _______

Overall Status: _______________________
Tester: ___________________________
Date: _____________________________
```

---

## 🚀 Next Steps

After successful testing:

1. **Step 4: Implement Payments Module** (Stripe integration for Pro/Elite tiers)
2. **Step 5: Build Settings/Customization Module** (User preferences, alert thresholds)
3. **Step 6: Enhance Data and Alerts Modules** (Additional columns, email alerts, exports)

---

## 📞 Support

If you encounter any issues not covered in this guide, please check:

- `logs/binance_dashboard.log` for backend errors
- Browser console (F12) for frontend errors
- Network tab in DevTools for API request failures

---

**Good luck with testing! 🎉**


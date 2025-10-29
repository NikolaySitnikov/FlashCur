# Email Verification Testing Guide - VolSpike

## Overview

This guide provides comprehensive testing procedures for the email confirmation functionality in VolSpike. It covers all aspects of email delivery, verification flow, and edge cases.

---

## Pre-Testing Setup

### 1. Environment Configuration

**Backend Environment Variables (Railway/Production):**
```bash
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@volspike.com
EMAIL_VERIFICATION_URL_BASE=https://volspike.com  # Production URL
SENDGRID_VERIFICATION_TEMPLATE_ID=d-xxxxx  # Optional: If using SendGrid template
SENDGRID_WELCOME_TEMPLATE_ID=d-xxxxx  # Optional: If using SendGrid template
```

**Frontend Environment Variables (Vercel/Production):**
```bash
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

### 2. SendGrid Configuration

**Domain Authentication (Critical for Deliverability):**
1. Log in to SendGrid Dashboard
2. Go to Settings → Sender Authentication
3. Set up Domain Authentication (not Single Sender Verification for production)
4. Add SPF record: `v=spf1 include:sendgrid.net ~all`
5. Add DKIM records (provided by SendGrid)
6. Verify domain authentication status (should show ✅)

**Sender Verification:**
1. In SendGrid Dashboard, verify `noreply@volspike.com`
2. Confirm sender address matches `SENDGRID_FROM_EMAIL`

**Email Template Setup (Optional):**
- If using SendGrid Dynamic Templates, configure:
  - Verification template with variables: `{{first_name}}`, `{{verification_url}}`, `{{support_email}}`, `{{company_name}}`
  - Welcome template with variables: `{{first_name}}`, `{{tier}}`, `{{dashboard_url}}`, `{{support_email}}`

### 3. Test Email Accounts

**Recommended test accounts across providers:**
- Gmail (personal): `your-email@gmail.com`
- Gmail (workspace): `your-email@yourdomain.com` (if applicable)
- Outlook.com: `your-email@outlook.com`
- Yahoo: `your-email@yahoo.com`
- Apple Mail/iCloud: `your-email@icloud.com`
- Custom domain: `your-email@yourdomain.com`

**For spam testing:**
- Use a fresh email address that hasn't received VolSpike emails before

---

## Testing Checklist

### ✅ Test Category 1: Email Delivery & Deliverability

#### Test 1.1: Basic Email Delivery
**Objective:** Verify emails are sent and received

**Steps:**
1. Navigate to `https://volspike.com/auth?tab=signup`
2. Enter a valid email address (use one from your test accounts)
3. Enter a valid password (12+ chars, uppercase, number, symbol)
4. Click "Create account"
5. Wait 1-2 seconds

**Expected Results:**
- ✅ Success message appears: "Please check your email to verify your account"
- ✅ Green alert appears with mail icon
- ✅ Email arrives in inbox within 30 seconds
- ✅ Email arrives in primary inbox (not spam/promotions)
- ✅ Sender shows as "VolSpike Team <noreply@volspike.com>"

**Verification:**
- Check inbox of email address used
- Check spam/junk folder (should NOT be there)
- Check SendGrid Activity Feed (should show "Delivered")
- Check email timestamp matches current time

**Pass/Fail:**
- [ ] Pass: Email received in inbox within 30 seconds
- [ ] Fail: Email not received, delayed, or in spam

**If Failed:**
- Check SendGrid Activity Feed for delivery status
- Verify `SENDGRID_API_KEY` is correct
- Check SendGrid account quota/limits
- Verify sender email is verified in SendGrid

---

#### Test 1.2: Email Delivery Speed
**Objective:** Measure time from signup to email delivery

**Steps:**
1. Note the current time (mm:ss)
2. Complete signup flow (same as Test 1.1)
3. Note the time email arrives (mm:ss)
4. Calculate time difference

**Expected Results:**
- ✅ Email arrives within 30 seconds
- ✅ Ideal: 5-15 seconds

**Pass/Fail:**
- [ ] Pass: Email arrives within 30 seconds
- [ ] Fail: Email takes longer than 30 seconds

---

#### Test 1.3: Spam Prevention
**Objective:** Verify emails don't go to spam

**Setup:**
1. Use a fresh Gmail account (never received VolSpike emails)
2. Ensure SendGrid domain is authenticated

**Steps:**
1. Complete signup with fresh email
2. Check inbox immediately
3. Check spam folder
4. Check promotions tab (Gmail)
5. If in spam: Mark as "Not Spam" and test again

**Expected Results:**
- ✅ Email appears in **Primary Inbox**
- ✅ **NOT** in Spam/Junk folder
- ✅ **NOT** in Promotions tab (Gmail)
- ✅ Sender reputation shows as legitimate

**SPAM Score Checks (Use mail-tester.com):**
1. Sign up with email from mail-tester.com
2. Send verification email
3. Visit mail-tester.com to view spam score
4. Target: Score of 8/10 or higher (lower spam score = better)

**Pass/Fail:**
- [ ] Pass: Email in primary inbox, not spam
- [ ] Fail: Email in spam or promotions

**If Failed:**
- Verify SendGrid domain authentication is complete
- Check SPF and DKIM records are correct
- Ensure sender address matches verified domain
- Review SendGrid reputation score
- Avoid spam trigger words in email content

---

#### Test 1.4: Cross-Client Email Rendering
**Objective:** Verify email displays correctly on all email clients

**Test on Each Client:**
1. **Gmail (Web)**
   - Open Gmail in Chrome/Firefox
   - Receive verification email
   - Check rendering, button, links

2. **Gmail (Mobile App - iOS)**
   - Open Gmail app on iPhone
   - Receive verification email
   - Check rendering, button works

3. **Gmail (Mobile App - Android)**
   - Open Gmail app on Android
   - Receive verification email
   - Check rendering, button works

4. **Outlook.com (Web)**
   - Open outlook.com in browser
   - Receive verification email
   - Check rendering, button, links

5. **Outlook Desktop (Windows)**
   - Open Outlook desktop app
   - Receive verification email
   - Check rendering, button, links

6. **Apple Mail (iOS)**
   - Open Mail app on iPhone
   - Receive verification email
   - Check rendering, button works

7. **Apple Mail (macOS)**
   - Open Mail app on Mac
   - Receive verification email
   - Check rendering, button, links

8. **Yahoo Mail (Web)**
   - Open mail.yahoo.com
   - Receive verification email
   - Check rendering, button, links

**Expected Results for Each Client:**
- ✅ Email renders correctly (no broken layout)
- ✅ Button is visible and styled properly
- ✅ Logo/branding displays correctly
- ✅ Text is readable (proper font sizes)
- ✅ Responsive on mobile (doesn't break on small screens)
- ✅ Links are clickable
- ✅ Colors match brand (green gradient)
- ✅ Dark mode works (if supported by client)

**Pass/Fail:**
- [ ] Pass: Email renders correctly on all tested clients
- [ ] Fail: Email breaks on any client

**Common Issues:**
- Outlook: May not support CSS gradients → Use fallback solid colors
- Gmail: May strip certain CSS → Use inline styles
- Mobile: Layout may break → Ensure responsive CSS is correct

---

### ✅ Test Category 2: Email Content & Design

#### Test 2.1: Email Content Verification
**Objective:** Verify email contains correct information

**Steps:**
1. Receive verification email
2. Review email content

**Expected Content:**
- ✅ Subject line: "Verify Your Email - VolSpike" (or SendGrid template subject)
- ✅ Header: "Welcome to VolSpike!" with logo/emoji
- ✅ Personalization: "Hi [name]," (should use email prefix or actual name)
- ✅ Clear explanation: "Thank you for signing up..."
- ✅ Prominent "Verify Email Address" button
- ✅ Fallback link text below button
- ✅ Security notice: "This verification link will expire in 24 hours"
- ✅ Footer: Copyright, support email link
- ✅ No broken links
- ✅ No placeholder text (e.g., "{{variable_name}}")

**Pass/Fail:**
- [ ] Pass: All content present and correct
- [ ] Fail: Missing content, broken links, or placeholders

---

#### Test 2.2: Email Design Quality
**Objective:** Verify email is beautiful and professional

**Visual Checks:**
1. ✅ Logo/branding is prominent and clear
2. ✅ Colors match brand (green gradient theme)
3. ✅ Typography is readable (16px+ font size for body text)
4. ✅ Button is prominent and clickable (large, clear CTA)
5. ✅ Spacing is appropriate (not cramped)
6. ✅ Design is modern and professional
7. ✅ Footer is properly formatted
8. ✅ No layout issues (text overlapping, columns broken)

**Mobile Design Checks:**
1. ✅ Email is readable on mobile without zooming
2. ✅ Button is large enough for touch (44x44px minimum)
3. ✅ Text doesn't overflow or break layout
4. ✅ Images/logos scale properly

**Accessibility Checks:**
1. ✅ Text contrast meets WCAG AA standards (4.5:1 for normal text)
2. ✅ Links are clearly distinguishable
3. ✅ Button text is readable
4. ✅ Alt text for images (if any)

**Pass/Fail:**
- [ ] Pass: Email design is beautiful and professional
- [ ] Fail: Design issues found

---

#### Test 2.3: Button Functionality
**Objective:** Verify "Verify Email Address" button works

**Steps:**
1. Open email in email client
2. Click "Verify Email Address" button
3. Verify button click works

**Expected Results:**
- ✅ Button is clickable
- ✅ Button opens browser/redirects to verification page
- ✅ Button URL is correct (includes token and email)
- ✅ Browser navigates to: `https://volspike.com/auth/verify?token=xxx&email=xxx`
- ✅ Button works on desktop and mobile

**Mobile Specific:**
- ✅ Button is large enough for thumb taps
- ✅ Button doesn't require pinch-to-zoom to click

**Pass/Fail:**
- [ ] Pass: Button works correctly on all devices
- [ ] Fail: Button doesn't work or broken link

---

#### Test 2.4: Fallback Link Verification
**Objective:** Verify fallback link works if button doesn't

**Steps:**
1. Open email
2. Copy the fallback link text (below button)
3. Paste into browser address bar
4. Press Enter

**Expected Results:**
- ✅ Link is visible and readable
- ✅ Link is clickable (if email client supports)
- ✅ Link can be copied easily
- ✅ Link works when pasted into browser
- ✅ Link contains valid token and email parameters

**Pass/Fail:**
- [ ] Pass: Fallback link works
- [ ] Fail: Link broken or can't be copied

---

### ✅ Test Category 3: Verification Flow

#### Test 3.1: Successful Verification
**Objective:** Verify complete verification flow works

**Steps:**
1. Sign up with new email address
2. Receive verification email
3. Click "Verify Email Address" button
4. Browser opens verification page
5. Wait for verification to complete

**Expected Results:**
- ✅ Verification page loads: `https://volspike.com/auth/verify?token=xxx&email=xxx`
- ✅ Page shows "Verifying Email..." with loading spinner
- ✅ After 1-2 seconds, shows "Email Verified!" with success icon (green checkmark)
- ✅ Message: "Email verified successfully!"
- ✅ "Go to Dashboard" button appears
- ✅ User's email is marked as verified in database
- ✅ Welcome email is sent (check inbox)

**Pass/Fail:**
- [ ] Pass: Verification completes successfully
- [ ] Fail: Verification fails or errors

---

#### Test 3.2: Welcome Email Verification
**Objective:** Verify welcome email is sent after verification

**Steps:**
1. Complete email verification (Test 3.1)
2. Check email inbox for welcome email
3. Review welcome email content

**Expected Results:**
- ✅ Welcome email arrives within 30 seconds after verification
- ✅ Welcome email subject: "Welcome to VolSpike!"
- ✅ Email confirms account is verified
- ✅ Email shows user's tier (e.g., "Free Tier")
- ✅ Email contains "Start Trading" button
- ✅ Email links to dashboard URL
- ✅ Email renders correctly across email clients

**Pass/Fail:**
- [ ] Pass: Welcome email received and correct
- [ ] Fail: Welcome email missing or incorrect

---

#### Test 3.3: Invalid Token Handling
**Objective:** Verify expired/invalid tokens are handled properly

**Scenario 1: Expired Token**
1. Manually expire a token in database (set expires to past date)
2. Try to verify with expired token
3. Check response

**Scenario 2: Invalid Token**
1. Create fake verification URL: `https://volspike.com/auth/verify?token=fake123&email=test@example.com`
2. Open URL in browser
3. Check response

**Expected Results:**
- ✅ Shows "Verification Failed" with red X icon
- ✅ Message: "This verification link has expired or is invalid."
- ✅ "Resend Verification Email" button appears
- ✅ User can request new verification email
- ✅ Error message is user-friendly (not technical)

**Pass/Fail:**
- [ ] Pass: Invalid tokens handled gracefully
- [ ] Fail: Errors or crashes on invalid token

---

#### Test 3.4: Token Expiration
**Objective:** Verify tokens expire after 24 hours

**Steps:**
1. Sign up and receive verification email
2. Note the timestamp of email
3. Wait 24 hours (or manually expire token in database)
4. Try to verify email
5. Check response

**Expected Results:**
- ✅ Token expires exactly 24 hours after generation
- ✅ Expired token shows "Verification Failed" message
- ✅ "Resend Verification Email" option is available
- ✅ New token can be requested

**Pass/Fail:**
- [ ] Pass: Tokens expire correctly at 24 hours
- [ ] Fail: Tokens don't expire or expire incorrectly

---

### ✅ Test Category 4: Resend Functionality

#### Test 4.1: Resend from Verification Page
**Objective:** Verify resend works from verification error page

**Steps:**
1. Click expired/invalid verification link
2. Verification page shows error
3. Enter email address (if not auto-filled)
4. Click "Resend Verification Email" button
5. Wait for response

**Expected Results:**
- ✅ "Resend Verification Email" button is visible and clickable
- ✅ Button shows loading state while sending ("Sending...")
- ✅ Success message: "A new verification email has been sent to your inbox."
- ✅ New verification email arrives within 30 seconds
- ✅ New email contains new valid token
- ✅ Old token is invalidated

**Pass/Fail:**
- [ ] Pass: Resend works correctly from verification page
- [ ] Fail: Resend fails or doesn't send email

---

#### Test 4.2: Resend from Auth Page
**Objective:** Verify resend works from signup/auth page

**Steps:**
1. Sign up with email
2. Success message appears with "Resend email" link
3. Click "Resend email" link
4. Wait for response

**Expected Results:**
- ✅ "Resend email" link appears in success alert
- ✅ Link is clickable and shows loading state
- ✅ Success message confirms email sent
- ✅ New verification email arrives within 30 seconds
- ✅ New email has new token

**Pass/Fail:**
- [ ] Pass: Resend works from auth page
- [ ] Fail: Resend doesn't work or missing

---

#### Test 4.3: Resend Rate Limiting
**Objective:** Verify rate limiting prevents abuse

**Steps:**
1. Sign up with email
2. Click "Resend email" 6 times rapidly (within 1 minute)
3. Check responses

**Expected Results:**
- ✅ First 5 resends succeed
- ✅ 6th resend (and subsequent) shows: "Too many verification requests. Please try again later."
- ✅ Rate limit: 5 requests per hour per email (or as configured)
- ✅ Rate limit resets after 1 hour
- ✅ Error message is user-friendly

**Pass/Fail:**
- [ ] Pass: Rate limiting works correctly
- [ ] Fail: No rate limiting or wrong limit

---

#### Test 4.4: Resend for Already Verified Email
**Objective:** Verify resend behavior for verified emails

**Steps:**
1. Complete email verification successfully
2. Try to resend verification email (from auth page or verification page)
3. Check response

**Expected Results:**
- ✅ Message: "Email is already verified."
- ✅ User is informed they don't need to verify
- ✅ No new email is sent (unless explicitly requested)

**Pass/Fail:**
- [ ] Pass: Resend handles verified emails correctly
- [ ] Fail: Sends unnecessary email or wrong message

---

### ✅ Test Category 5: Edge Cases & Security

#### Test 5.1: Duplicate Email Signup
**Objective:** Verify duplicate email registration is prevented

**Steps:**
1. Sign up with email: `test@example.com`
2. Wait for verification email
3. Try to sign up again with same email: `test@example.com`
4. Check response

**Expected Results:**
- ✅ Error message: "User already exists"
- ✅ No new verification email is sent
- ✅ User is prompted to sign in instead

**Pass/Fail:**
- [ ] Pass: Duplicate signup prevented
- [ ] Fail: Duplicate signup allowed

---

#### Test 5.2: Token Reuse Prevention
**Objective:** Verify tokens can't be reused after verification

**Steps:**
1. Sign up and receive verification email
2. Click verification button (verify successfully)
3. Copy the verification URL from email
4. Try to verify again with same URL
5. Check response

**Expected Results:**
- ✅ First verification succeeds
- ✅ Second verification attempt shows: "Invalid or expired verification token"
- ✅ Token is deleted from database after use
- ✅ No security issue from token reuse

**Pass/Fail:**
- [ ] Pass: Tokens can't be reused
- [ ] Fail: Tokens can be reused or security issue

---

#### Test 5.3: Email Token URL Encoding
**Objective:** Verify email addresses with special characters work

**Test Emails:**
1. `test+tag@example.com`
2. `test.user@example.com`
3. `test_user@example.com`
4. `test@example-domain.com`

**Steps:**
1. Sign up with each test email
2. Check verification email link
3. Click verification link
4. Verify works correctly

**Expected Results:**
- ✅ Email addresses are properly URL encoded in verification link
- ✅ Verification link works correctly
- ✅ No broken URLs or encoding issues

**Pass/Fail:**
- [ ] Pass: Special characters handled correctly
- [ ] Fail: Encoding issues or broken links

---

#### Test 5.4: XSS Prevention in Email
**Objective:** Verify email content is safe from XSS

**Steps:**
1. Sign up with email containing potential XSS: `<script>alert('xss')</script>@example.com`
2. Check verification email content
3. Verify email doesn't execute scripts

**Expected Results:**
- ✅ Email content is HTML escaped
- ✅ No scripts execute in email
- ✅ Email renders safely
- ✅ Name/user input is sanitized

**Pass/Fail:**
- [ ] Pass: Email is safe from XSS
- [ ] Fail: XSS vulnerability found

---

### ✅ Test Category 6: Database & Backend

#### Test 6.1: Database Token Storage
**Objective:** Verify tokens are stored correctly

**Steps:**
1. Sign up with email
2. Check database for `VerificationToken` entry
3. Verify token fields

**Expected Database State:**
- ✅ Token stored in `verification_tokens` table
- ✅ `identifier` matches email address
- ✅ `token` is a random hex string (64 chars)
- ✅ `expires` is set to 24 hours from creation
- ✅ `userId` matches the user ID
- ✅ `emailVerified` is `null` on user record

**After Verification:**
- ✅ `emailVerified` is set to current timestamp
- ✅ Token is deleted from `verification_tokens` table

**Pass/Fail:**
- [ ] Pass: Database state is correct
- [ ] Fail: Database state incorrect

---

#### Test 6.2: Token Generation Security
**Objective:** Verify tokens are cryptographically secure

**Steps:**
1. Sign up multiple times
2. Collect multiple verification tokens
3. Analyze tokens

**Expected Results:**
- ✅ Tokens are random (no patterns)
- ✅ Tokens are 64-character hex strings
- ✅ Tokens use cryptographically secure RNG
- ✅ No predictable tokens

**Pass/Fail:**
- [ ] Pass: Tokens are secure
- [ ] Fail: Tokens are predictable or insecure

---

#### Test 6.3: Backend Error Handling
**Objective:** Verify backend handles errors gracefully

**Test Scenarios:**
1. SendGrid API down/rate limited
2. Database connection issues
3. Invalid request payload
4. Missing environment variables

**Expected Results:**
- ✅ Backend doesn't crash
- ✅ Errors are logged properly
- ✅ User receives appropriate error message
- ✅ No sensitive information leaked in errors

**Pass/Fail:**
- [ ] Pass: Error handling works correctly
- [ ] Fail: Backend crashes or leaks info

---

### ✅ Test Category 7: User Experience

#### Test 7.1: Signup Flow UX
**Objective:** Verify signup flow is smooth and clear

**Steps:**
1. Navigate to signup page
2. Fill out form
3. Submit signup
4. Review user experience

**Expected UX:**
- ✅ Clear instructions on signup page
- ✅ Password requirements are visible
- ✅ Success message appears immediately after signup
- ✅ Message instructs user to check email
- ✅ "Resend email" option is obvious
- ✅ No confusion about next steps

**Pass/Fail:**
- [ ] Pass: UX is smooth and clear
- [ ] Fail: UX issues found

---

#### Test 7.2: Verification Page UX
**Objective:** Verify verification page provides good UX

**Steps:**
1. Click verification link
2. Review verification page

**Expected UX:**
- ✅ Page shows clear status (loading, success, error)
- ✅ Icons are clear (loading spinner, checkmark, X)
- ✅ Messages are user-friendly (not technical)
- ✅ Error messages provide actionable next steps
- ✅ "Resend" button is easy to find
- ✅ "Go to Dashboard" button works after success

**Pass/Fail:**
- [ ] Pass: Verification page UX is good
- [ ] Fail: UX issues found

---

#### Test 7.3: Mobile Experience
**Objective:** Verify mobile experience is good

**Steps:**
1. Open signup page on mobile device
2. Complete signup
3. Open verification email on mobile
4. Click verification button
5. Complete verification on mobile

**Expected Mobile UX:**
- ✅ Signup form is usable on mobile (no zoom needed)
- ✅ Email is readable on mobile
- ✅ Verification button is large enough for thumb
- ✅ Verification page is mobile-friendly
- ✅ No horizontal scrolling required

**Pass/Fail:**
- [ ] Pass: Mobile experience is good
- [ ] Fail: Mobile UX issues found

---

## Production Deployment Checklist

Before deploying to production, ensure:

- [ ] SendGrid domain authentication is complete (SPF, DKIM)
- [ ] `SENDGRID_FROM_EMAIL` matches verified sender
- [ ] `EMAIL_VERIFICATION_URL_BASE` is set to production URL
- [ ] `NEXT_PUBLIC_API_URL` points to production backend
- [ ] Email templates are tested in production environment
- [ ] Spam score is acceptable (mail-tester.com score ≥ 8/10)
- [ ] All email clients tested (Gmail, Outlook, Apple Mail, Yahoo)
- [ ] Mobile email rendering verified
- [ ] Rate limiting is configured appropriately
- [ ] Error handling is comprehensive
- [ ] Database backups are configured
- [ ] Monitoring/alerts are set up for email delivery failures

---

## Troubleshooting Common Issues

### Issue: Emails going to spam

**Solutions:**
1. Verify SendGrid domain authentication (SPF, DKIM)
2. Check sender reputation in SendGrid dashboard
3. Ensure sender email matches verified domain
4. Avoid spam trigger words in email content
5. Test with mail-tester.com and fix issues
6. Warm up domain gradually if new
7. Ensure unsubscribe link (if required)

### Issue: Emails not arriving

**Solutions:**
1. Check SendGrid Activity Feed for delivery status
2. Verify `SENDGRID_API_KEY` is correct
3. Check SendGrid account quota/limits
4. Verify sender email is verified
5. Check backend logs for errors
6. Test with different email provider

### Issue: Verification button doesn't work

**Solutions:**
1. Check email client (some strip JavaScript)
2. Verify URL encoding is correct
3. Test fallback link (should work)
4. Check browser console for errors
5. Verify `EMAIL_VERIFICATION_URL_BASE` is correct

### Issue: Token expired immediately

**Solutions:**
1. Check database timezone settings
2. Verify token expiration calculation (24 hours)
3. Check server time vs database time
4. Review token creation timestamp

### Issue: Rate limiting too strict

**Solutions:**
1. Adjust rate limit in backend code
2. Review rate limit logic (per email, per IP)
3. Test rate limiting threshold

---

## Test Results Summary

**Date:** _______________

**Tester:** _______________

**Environment:** [ ] Development [ ] Staging [ ] Production

### Overall Results:
- **Total Tests:** 30+
- **Passed:** _____
- **Failed:** _____
- **Blockers:** _____

### Critical Issues Found:
1. 
2. 
3. 

### Non-Critical Issues Found:
1. 
2. 
3. 

### Recommendations:
1. 
2. 
3. 

**Sign-off:**
- [ ] All critical tests passed
- [ ] Email deliverability verified
- [ ] Cross-client compatibility verified
- [ ] Security tests passed
- [ ] Ready for production deployment

**Approved by:** _______________
**Date:** _______________

---

## Additional Resources

- **SendGrid Dashboard:** https://app.sendgrid.com
- **Mail-Tester (Spam Score):** https://www.mail-tester.com
- **Email Client Testing:** https://www.emailonacid.com
- **SPF Record Checker:** https://mxtoolbox.com/spf.aspx
- **DKIM Record Checker:** https://mxtoolbox.com/dkim.aspx

---

## Notes

- Test with real email addresses when possible (not test@example.com)
- Always test in production environment before public launch
- Monitor SendGrid Activity Feed regularly for delivery issues
- Keep email templates updated with latest best practices
- Review spam scores periodically


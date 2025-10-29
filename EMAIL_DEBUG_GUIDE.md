# Email Sending Debug Guide - VolSpike

## Issue: Emails Not Being Received

If emails are not being received after signup, follow this debug checklist:

---

## Step 1: Check Backend Logs

**On Railway (Production):**
1. Go to Railway dashboard → Your backend service
2. Click on "Logs" tab
3. Look for email-related log entries:
   - `Attempting to send verification email to...`
   - `✅ Verification email sent successfully...`
   - `❌ Failed to send verification email...`

**What to Look For:**
- ✅ Success logs: Email was sent successfully
- ❌ Error logs: Check specific error message
- ⚠️ Warning logs: Configuration issues

**Common Error Patterns:**
```
❌ Failed to send verification email: {
  error: "Forbidden",
  code: 403
}
→ Usually means SendGrid API key issue or sender not verified

❌ SENDGRID_API_KEY is not set
→ Environment variable missing

❌ Failed to send verification email: {
  error: "Bad Request",
  message: "The from email does not match a verified Sender Identity"
}
→ Sender email not verified in SendGrid
```

---

## Step 2: Check SendGrid Configuration

### 2.1 Verify Environment Variables

**Backend (Railway) Environment Variables:**
```bash
SENDGRID_API_KEY=SG.xxxxx  # Must start with SG.
SENDGRID_FROM_EMAIL=noreply@volspike.com  # Must be verified
EMAIL_VERIFICATION_URL_BASE=https://volspike.com  # Production URL
```

**Check in Railway:**
1. Railway Dashboard → Your Service → Variables
2. Verify all three variables are set
3. Ensure `SENDGRID_API_KEY` starts with `SG.`

### 2.2 Verify SendGrid Sender

**In SendGrid Dashboard:**
1. Go to **Settings → Sender Authentication**
2. Check **Single Sender Verification** or **Domain Authentication**
3. Your `SENDGRID_FROM_EMAIL` must match a verified sender

**Common Issues:**
- ✅ **Domain Authentication** (recommended for production): Full domain verified
- ✅ **Single Sender Verification**: Single email verified
- ❌ **Unverified sender**: Email will fail to send

**Fix:**
- If using domain: Complete domain authentication (SPF, DKIM)
- If using single sender: Verify the email address in SendGrid

---

## Step 3: Check SendGrid Activity Feed

**In SendGrid Dashboard:**
1. Go to **Activity**
2. Filter by recipient email address
3. Check delivery status:
   - ✅ **Processed**: Email was sent
   - ✅ **Delivered**: Email reached inbox
   - ⚠️ **Bounced**: Email was rejected
   - ⚠️ **Blocked**: SendGrid blocked the email
   - ⚠️ **Deferred**: Temporary failure (will retry)
   - ❌ **Dropped**: Email was dropped (spam, invalid, etc.)

**For Each Email:**
- Click on the email entry
- Review delivery details
- Check bounce/block reason if applicable

**Common SendGrid Drop/Bounce Reasons:**
- `Invalid email address`: Email format incorrect
- `Bounced: Mailbox Full`: Recipient inbox full
- `Bounced: Invalid Recipient`: Email doesn't exist
- `Blocked: Spam`: Content triggered spam filters
- `Blocked: Invalid Sender`: Sender not verified

---

## Step 4: Check Backend Database

**Verify token was created:**
1. Connect to your database (Neon, Railway PostgreSQL, etc.)
2. Query `verification_tokens` table:
```sql
SELECT * FROM "verification_tokens" 
WHERE identifier = 'user@example.com' 
ORDER BY expires DESC 
LIMIT 1;
```

**Expected:**
- ✅ Token exists with valid `expires` date (24 hours from now)
- ✅ `userId` matches user ID
- ✅ `token` is a 64-character hex string

**If token doesn't exist:**
- Backend signup endpoint failed before sending email
- Check backend logs for signup errors

---

## Step 5: Test SendGrid API Directly

**Create a test script to verify SendGrid:**

1. **On your local machine or Railway console:**

```bash
curl -X POST "https://api.sendgrid.com/v3/mail/send" \
  -H "Authorization: Bearer YOUR_SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{
      "to": [{"email": "your-test-email@gmail.com"}]
    }],
    "from": {"email": "noreply@volspike.com", "name": "VolSpike Team"},
    "subject": "Test Email",
    "content": [{
      "type": "text/plain",
      "value": "This is a test email from VolSpike"
    }]
  }'
```

**Expected Response:**
- `202 Accepted`: Email queued for delivery
- `400 Bad Request`: Check error details
- `401 Unauthorized`: API key invalid
- `403 Forbidden`: Sender not verified

---

## Step 6: Check Email Provider Spam Filters

**Gmail:**
1. Check "Spam" folder
2. Check "Promotions" tab
3. Check "Updates" tab
4. Search for "volspike" or "verify"

**Outlook:**
1. Check "Junk Email" folder
2. Check "Focused" vs "Other" tabs
3. Search for "volspike"

**Yahoo:**
1. Check "Spam" folder
2. Check "Bulk" folder

**Common Issues:**
- Email arrived but in wrong folder
- Email blocked by provider spam filter
- Email delayed (check again in 5-10 minutes)

---

## Step 7: Check SendGrid Account Limits

**In SendGrid Dashboard:**
1. Go to **Settings → Plan Details**
2. Check:
   - **Daily email limit**: Have you exceeded it?
   - **Monthly email limit**: Have you exceeded it?
   - **Account status**: Is account suspended?

**Free Tier Limits:**
- 100 emails/day
- Can be exceeded with paid plans

**If exceeded:**
- Emails will be blocked
- Upgrade plan or wait for reset (daily limit resets at midnight)

---

## Step 8: Verify Email Template Configuration

**If using SendGrid Dynamic Templates:**

1. Go to **SendGrid → Email API → Dynamic Templates**
2. Find your verification template
3. Verify template ID matches `SENDGRID_VERIFICATION_TEMPLATE_ID`
4. Check template has required variables:
   - `{{first_name}}`
   - `{{verification_url}}`
   - `{{support_email}}`
   - `{{company_name}}`

**If template ID is wrong:**
- Email will still send but with fallback HTML (our custom template)
- Check backend logs to see which template was used

---

## Step 9: Check Network/Firewall Issues

**If backend is behind firewall:**
- Verify outbound HTTPS (port 443) is allowed
- SendGrid API requires HTTPS to `api.sendgrid.com`

**Test from Railway console:**
```bash
curl -v https://api.sendgrid.com/v3/user/profile \
  -H "Authorization: Bearer YOUR_SENDGRID_API_KEY"
```

**Expected:**
- `200 OK`: Connection works
- `Connection refused` or timeout: Firewall blocking

---

## Step 10: Check Backend Code Logic

**Verify email sending code path:**

1. Check `volspike-nodejs-backend/src/routes/auth.ts`:
   - Line 197: `emailService.sendVerificationEmail()` is called
   - Line 203: Error is logged if email fails

2. Check `volspike-nodejs-backend/src/services/email.ts`:
   - Line 66: Checks `SENDGRID_API_KEY` exists
   - Line 100: Calls `mail.send(msg)`
   - Line 113: Logs detailed error if fails

**Backend logs should show:**
```
Attempting to send verification email to user@example.com from noreply@volspike.com
SendGrid response for user@example.com: { statusCode: 202, ... }
✅ Verification email sent successfully to user@example.com
```

**OR if failed:**
```
❌ Failed to send verification email: {
  email: 'user@example.com',
  error: '...',
  response: { ... }
}
```

---

## Quick Fixes

### Fix 1: Verify SendGrid API Key
```bash
# In Railway, ensure:
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Must start with SG. and be valid
```

### Fix 2: Verify Sender Email
1. SendGrid Dashboard → Settings → Sender Authentication
2. Verify `noreply@volspike.com` (or your `SENDGRID_FROM_EMAIL`)
3. Complete verification process

### Fix 3: Check Email Address Format
- Ensure email is valid: `user@example.com`
- No spaces or special characters
- Domain exists

### Fix 4: Temporarily Allow Unverified Sign-In (Development Only)

**⚠️ WARNING: Only for development/testing!**

If you need to test without email verification:

**In `volspike-nodejs-backend/src/routes/auth.ts`:**
```typescript
// TEMPORARY: Allow unverified sign-in (remove in production!)
if (!user.emailVerified && !user.walletAddress) {
    // Comment out this check for testing:
    // return c.json({ error: '...', requiresVerification: true }, 403)
    
    logger.warn(`⚠️ TEMP: Allowing unverified sign-in for ${email} - REMOVE IN PRODUCTION`)
}
```

**Remove this before production deployment!**

---

## Still Not Working?

1. **Check SendGrid Support:**
   - SendGrid dashboard → Support
   - Check account status and any service alerts

2. **Review Backend Logs:**
   - Look for any error patterns
   - Check for rate limiting errors

3. **Test with Different Email:**
   - Try Gmail, Outlook, custom domain
   - Some providers block emails more aggressively

4. **Check DNS/SPF Records:**
   - If using domain authentication
   - Verify SPF and DKIM records are correct

---

## Testing Email Delivery Locally

**Option 1: Use SendGrid Test Mode**
- Set up SendGrid in test mode
- Emails go to a test inbox

**Option 2: Use Email Testing Service**
- Use services like Mailtrap or MailHog
- Intercept emails for testing

**Option 3: Use Real Email for Testing**
- Use your personal Gmail/Outlook
- Test full delivery flow

---

## Summary Checklist

Before reporting email issues, verify:

- [ ] `SENDGRID_API_KEY` is set in Railway environment
- [ ] `SENDGRID_FROM_EMAIL` matches verified sender in SendGrid
- [ ] `EMAIL_VERIFICATION_URL_BASE` is set to production URL
- [ ] Sender is verified in SendGrid (domain or single sender)
- [ ] SendGrid account is active and not suspended
- [ ] Daily/monthly email limits not exceeded
- [ ] Backend logs show email sending attempt
- [ ] SendGrid Activity Feed shows processed/delivered status
- [ ] Checked spam/junk folders in email client
- [ ] Token exists in database `verification_tokens` table
- [ ] Email address is valid and exists

**Most Common Issues:**
1. **Sender email not verified** → Verify in SendGrid dashboard
2. **API key missing/invalid** → Check environment variables
3. **Email in spam** → Check spam folders
4. **Daily limit exceeded** → Check SendGrid plan limits


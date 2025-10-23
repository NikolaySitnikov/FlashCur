# 🚀 VolSpike Deployment Guide for volspike.com

## Overview
This guide will help you deploy VolSpike to your volspike.com domain using CloudFlare and a hosting service.

## Prerequisites
- ✅ Domain: volspike.com (purchased from CloudFlare)
- ✅ CloudFlare account
- ✅ Hosting service (recommended: Railway, Render, or DigitalOcean)
- ✅ GitHub repository with VolSpike code

---

## Step 1: Prepare Your Application for Production

### 1.1 Update Environment Configuration
Create a production-ready `.env` file:

```bash
# Production Environment Variables
FLASK_ENV=production
SECRET_KEY=your-super-secure-secret-key-here
DATABASE_URL=your-production-database-url

# Email Configuration (for production)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_stripe_key
STRIPE_SECRET_KEY=sk_live_your_live_stripe_secret
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Binance API (if needed)
BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET_KEY=your_binance_secret_key

# Domain Configuration
DOMAIN=volspike.com
```

### 1.2 Update Flask Configuration
Update your `config.py` to handle the production domain:

```python
# Add to config.py
class ProductionConfig(Config):
    DEBUG = False
    TESTING = False
    DOMAIN = 'volspike.com'
    SERVER_NAME = 'volspike.com'
    
    # CORS settings for production
    CORS_ORIGINS = [
        'https://volspike.com',
        'https://www.volspike.com'
    ]
```

---

## Step 2: Choose Your Hosting Platform

### Option A: Railway (Recommended - Easy Setup)
1. **Sign up at Railway.app**
2. **Connect your GitHub repository**
3. **Configure environment variables**
4. **Deploy automatically**

### Option B: Render (Good Alternative)
1. **Sign up at Render.com**
2. **Create a new Web Service**
3. **Connect GitHub repository**
4. **Configure build and start commands**

### Option C: DigitalOcean App Platform
1. **Sign up at DigitalOcean**
2. **Create new App**
3. **Connect GitHub repository**
4. **Configure environment**

---

## Step 3: CloudFlare Domain Configuration

### 3.1 DNS Configuration
In your CloudFlare dashboard:

1. **Go to DNS Management**
2. **Add these records:**

```
Type: A
Name: @
Content: [Your hosting service IP]
Proxy: ✅ (Orange cloud)

Type: CNAME
Name: www
Content: volspike.com
Proxy: ✅ (Orange cloud)
```

### 3.2 SSL/TLS Configuration
1. **Go to SSL/TLS → Overview**
2. **Set encryption mode to "Full (strict)"**
3. **Enable "Always Use HTTPS"**

### 3.3 Page Rules (Optional)
Create page rules for better performance:
- `volspike.com/*` → Cache Level: Standard
- `www.volspike.com/*` → Cache Level: Standard

---

## Step 4: Hosting Platform Setup

### For Railway:
1. **Connect GitHub repository**
2. **Set environment variables:**
   ```
   FLASK_ENV=production
   SECRET_KEY=your-secret-key
   DATABASE_URL=your-database-url
   MAIL_SERVER=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USE_TLS=True
   MAIL_USERNAME=your-email
   MAIL_PASSWORD=your-password
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_SECRET_KEY=sk_live_...
   DOMAIN=volspike.com
   ```
3. **Deploy automatically**

### For Render:
1. **Create new Web Service**
2. **Connect GitHub repository**
3. **Set build command:** `pip install -r requirements.txt`
4. **Set start command:** `python app.py`
5. **Add environment variables**
6. **Deploy**

---

## Step 5: Database Setup

### 5.1 Production Database
Choose one:

**Option A: PostgreSQL (Recommended)**
- Railway: Automatic PostgreSQL addon
- Render: PostgreSQL addon
- DigitalOcean: Managed PostgreSQL

**Option B: SQLite (Simple)**
- For small applications
- Less scalable but easier setup

### 5.2 Database Migration
```bash
# Run these commands in your production environment
python migrate_db_step1.py
python migrate_payments_db.py
python migrate_settings_db.py
```

---

## Step 6: Email Configuration

### 6.1 Gmail Setup (Recommended)
1. **Enable 2-Factor Authentication**
2. **Generate App Password:**
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. **Use app password in MAIL_PASSWORD**

### 6.2 Alternative Email Services
- **SendGrid** (Professional)
- **Mailgun** (Developer-friendly)
- **Amazon SES** (Scalable)

---

## Step 7: Stripe Configuration

### 7.1 Production Keys
1. **Go to Stripe Dashboard**
2. **Switch to Live mode**
3. **Get your live keys:**
   - Publishable key: `pk_live_...`
   - Secret key: `sk_live_...`

### 7.2 Webhook Configuration
1. **Create webhook endpoint:**
   - URL: `https://volspike.com/webhook/stripe`
   - Events: `checkout.session.completed`, `invoice.payment_succeeded`
2. **Get webhook secret:**
   - Copy `whsec_...` secret

---

## Step 8: Domain Verification

### 8.1 Test Your Domain
1. **Visit https://volspike.com**
2. **Check SSL certificate**
3. **Test all functionality:**
   - User registration
   - Login/logout
   - Payment flow
   - Email notifications

### 8.2 Performance Optimization
1. **Enable CloudFlare caching**
2. **Optimize images**
3. **Minify CSS/JS**
4. **Enable compression**

---

## Step 9: Monitoring & Maintenance

### 9.1 Set Up Monitoring
- **Uptime monitoring:** UptimeRobot
- **Error tracking:** Sentry
- **Analytics:** Google Analytics

### 9.2 Regular Maintenance
- **Database backups**
- **Security updates**
- **Performance monitoring**
- **SSL certificate renewal (automatic with CloudFlare)**

---

## Step 10: Launch Checklist

### Pre-Launch:
- [ ] Domain configured in CloudFlare
- [ ] SSL certificate active
- [ ] Production database set up
- [ ] Email service configured
- [ ] Stripe live keys configured
- [ ] All environment variables set
- [ ] Application deployed and running
- [ ] DNS propagation complete

### Post-Launch:
- [ ] Test user registration
- [ ] Test payment flow
- [ ] Test email notifications
- [ ] Monitor error logs
- [ ] Set up monitoring
- [ ] Create backup strategy

---

## Troubleshooting

### Common Issues:

**1. DNS Not Propagating**
- Wait 24-48 hours
- Check DNS settings in CloudFlare
- Verify A records point to correct IP

**2. SSL Certificate Issues**
- Ensure CloudFlare proxy is enabled
- Check SSL/TLS settings
- Verify domain configuration

**3. Database Connection Issues**
- Check DATABASE_URL format
- Verify database credentials
- Ensure database is accessible

**4. Email Not Sending**
- Check SMTP settings
- Verify app password
- Check firewall settings

**5. Payment Issues**
- Verify Stripe keys are live
- Check webhook configuration
- Test with Stripe test cards first

---

## Support Resources

- **CloudFlare Documentation:** https://developers.cloudflare.com/
- **Railway Documentation:** https://docs.railway.app/
- **Render Documentation:** https://render.com/docs
- **Stripe Documentation:** https://stripe.com/docs
- **Flask Documentation:** https://flask.palletsprojects.com/

---

## Next Steps After Deployment

1. **Set up monitoring and alerts**
2. **Create user documentation**
3. **Plan marketing strategy**
4. **Set up customer support**
5. **Plan feature roadmap**

---

*This guide will help you successfully deploy VolSpike to volspike.com. Follow each step carefully and test thoroughly before going live.*

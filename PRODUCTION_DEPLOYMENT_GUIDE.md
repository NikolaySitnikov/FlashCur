# Production Deployment Guide

## 🚀 Overview

This guide helps you deploy your Binance Dashboard to production. Follow these steps when you're ready to launch.

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure:

- [ ] All E2E tests pass locally
- [ ] All 3 tiers (Free, Pro, Elite) tested thoroughly
- [ ] Logging working correctly
- [ ] Error pages display properly
- [ ] Profile page works
- [ ] Theme system works
- [ ] No console errors in browser
- [ ] Database migrations tested

---

## 🔐 Security Checklist

### Critical Security Steps (MUST DO)

**1. Change SECRET_KEY**
```bash
# Generate a strong random secret key
python -c "import secrets; print(secrets.token_hex(32))"

# Add to .env file (create if doesn't exist):
SECRET_KEY=<paste-generated-key-here>
```

**2. Update Cookie Settings**
Edit `config.py`:
```python
SESSION_COOKIE_SECURE = True  # Requires HTTPS
SESSION_COOKIE_HTTPONLY = True  # Already set
SESSION_COOKIE_SAMESITE = 'Lax'  # Already set
```

**3. Disable Debug Mode**
In `.env`:
```
FLASK_ENV=production
FLASK_DEBUG=False
ENABLE_DEBUG_ROUTES=False
```

**4. Use Production Database**
In `.env`:
```
DATABASE_URI=postgresql://user:password@host:5432/binance_dashboard
```

**5. Environment Variables**
Never commit `.env` file to git! It should contain:
- SECRET_KEY
- DATABASE_URI
- Any API keys or sensitive data

---

## 🗄️ Database Migration

### Option 1: Heroku PostgreSQL

**Install add-on:**
```bash
heroku addons:create heroku-postgresql:mini
```

**Get database URL:**
```bash
heroku config:get DATABASE_URI
```

**Create tables:**
```bash
heroku run python
>>> from app import app, db
>>> with app.app_context():
>>>     db.create_all()
```

**Migrate existing data (if any):**
```bash
# Export from SQLite
sqlite3 instance/binance_dashboard.db .dump > backup.sql

# Import to PostgreSQL (adapt as needed)
```

### Option 2: AWS RDS / DigitalOcean Managed Database

**Create database instance**
- PostgreSQL 14 or higher
- Backup enabled
- SSL enforced

**Set environment variable:**
```
DATABASE_URI=postgresql://user:password@rds-endpoint:5432/dbname
```

---

## 🌐 Deployment Options

### Option 1: Heroku (Recommended for Beginners)

**Install Heroku CLI:**
```bash
brew install heroku/brew/heroku  # macOS
# or download from heroku.com
```

**Create Heroku app:**
```bash
cd FlashCur
heroku create binance-dashboard-app
```

**Set environment variables:**
```bash
heroku config:set SECRET_KEY=your-secret-key
heroku config:set FLASK_ENV=production
heroku config:set FLASK_DEBUG=False
heroku config:set ENABLE_DEBUG_ROUTES=False
```

**Create Procfile:**
```
web: gunicorn app:app
```

**Install Gunicorn:**
Add to `requirements.txt`:
```
gunicorn>=21.0.0
```

**Deploy:**
```bash
git add .
git commit -m "Production deployment"
git push heroku main
```

**Run migrations:**
```bash
heroku run python
>>> from app import app, db
>>> with app.app_context():
>>>     db.create_all()
```

**Open app:**
```bash
heroku open
```

---

### Option 2: DigitalOcean App Platform

**Create app:**
1. Connect GitHub/GitLab repo
2. Select FlashCur directory
3. Set build command: `pip install -r requirements.txt`
4. Set run command: `gunicorn app:app`

**Environment variables:**
- SECRET_KEY
- DATABASE_URI
- FLASK_ENV=production
- FLASK_DEBUG=False

**Deploy:**
- Push to main branch → auto-deploys

---

### Option 3: AWS Elastic Beanstalk

**Initialize EB:**
```bash
cd FlashCur
eb init -p python-3.11 binance-dashboard
```

**Create environment:**
```bash
eb create binance-dashboard-env
```

**Set environment variables:**
```bash
eb setenv SECRET_KEY=your-key \
          FLASK_ENV=production \
          DATABASE_URI=postgresql://...
```

**Deploy:**
```bash
eb deploy
```

---

## 📧 Email Service Setup (for Pro/Elite tiers)

### SendGrid (Recommended)

**Sign up:** sendgrid.com (free tier: 100 emails/day)

**Get API key:**
1. Settings → API Keys → Create API Key
2. Full Access

**Add to .env:**
```
MAIL_SERVER=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=apikey
MAIL_PASSWORD=<your-sendgrid-api-key>
MAIL_DEFAULT_SENDER=noreply@yourdomain.com
```

**Update config.py** (future implementation):
```python
MAIL_SERVER = os.getenv('MAIL_SERVER')
MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
```

---

## 💳 Payment Integration (for Pro/Elite upgrades)

### Stripe Setup

**Sign up:** stripe.com

**Get API keys:**
- Dashboard → Developers → API keys
- Copy: Publishable key & Secret key

**Add to .env:**
```
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

**Install Stripe:**
```bash
pip install stripe
```

**Create products in Stripe:**
- Pro Monthly: $9.99/month
- Pro Yearly: $99/year
- Elite Monthly: $29.99/month
- Elite Yearly: $299/year

**Webhook endpoint:**
- Create webhook in Stripe dashboard
- Point to: `https://yourdomain.com/webhook/stripe`
- Events: `checkout.session.completed`, `customer.subscription.deleted`

---

## 📊 Monitoring Setup

### Sentry (Error Monitoring)

**Sign up:** sentry.io (free tier available)

**Get DSN:**
- Create project → Copy DSN

**Add to .env:**
```
SENTRY_DSN=https://...@sentry.io/...
```

**Install:**
```bash
pip install sentry-sdk[flask]
```

**Add to app.py:**
```python
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration

if config.SENTRY_DSN:
    sentry_sdk.init(
        dsn=config.SENTRY_DSN,
        integrations=[FlaskIntegration()],
        traces_sample_rate=1.0
    )
```

---

## 🔒 Additional Security

### Rate Limiting

Install Flask-Limiter:
```bash
pip install Flask-Limiter
```

Add to app.py:
```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

# Protect login endpoint
@limiter.limit("5 per minute")
@auth_bp.route('/login', methods=['POST'])
def login():
    ...
```

### HTTPS Enforcement

Most platforms (Heroku, DO, AWS) provide free SSL certificates. Ensure:
- Force HTTPS redirects
- Set `SESSION_COOKIE_SECURE = True`

---

## 🔍 Performance Optimization

### Enable Caching

Install Flask-Caching:
```bash
pip install Flask-Caching
```

Add to app.py:
```python
from flask_caching import Cache

cache = Cache(app, config={'CACHE_TYPE': 'simple'})

@app.route('/api/data')
@cache.cached(timeout=60)  # Cache for 60 seconds
def get_data():
    ...
```

### Database Connection Pooling

For PostgreSQL, use connection pooling:
```python
app.config['SQLALCHEMY_POOL_SIZE'] = 10
app.config['SQLALCHEMY_MAX_OVERFLOW'] = 20
```

---

## 📝 Environment Variables Reference

Complete list of variables for production:

```bash
# Flask
SECRET_KEY=<strong-random-key>
FLASK_ENV=production
FLASK_DEBUG=False

# Database
DATABASE_URI=postgresql://user:pass@host:5432/dbname

# Features
ENABLE_DEBUG_ROUTES=False
ENABLE_TIER_SYSTEM=True
ENABLE_REGISTRATION=True
SHOW_PRICING_PAGE=True

# Email (SendGrid)
MAIL_SERVER=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=apikey
MAIL_PASSWORD=<sendgrid-api-key>
MAIL_DEFAULT_SENDER=noreply@yourdomain.com

# Payment (Stripe)
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...

# Monitoring (Sentry)
SENTRY_DSN=https://...@sentry.io/...
```

---

## 🧪 Production Testing Checklist

After deployment, test:

- [ ] ✅ Site loads over HTTPS
- [ ] ✅ Can register new account
- [ ] ✅ Can login
- [ ] ✅ Dashboard loads
- [ ] ✅ Tier limits enforced
- [ ] ✅ Pricing page works
- [ ] ✅ Profile page works
- [ ] ✅ Error pages show correctly
- [ ] ✅ Logs are being written
- [ ] ✅ Theme toggle works
- [ ] ✅ Mobile responsive

---

## 🔧 Troubleshooting

### Database connection fails

Check DATABASE_URI is correct:
```bash
heroku config:get DATABASE_URI
```

### Static files not loading

Ensure static folder is included in deployment.

### Logs not working

Check logs directory is writable:
```bash
heroku logs --tail
```

### Session not persisting

Verify SECRET_KEY is set:
```bash
heroku config:get SECRET_KEY
```

---

## 📞 Post-Deployment

### Set up monitoring

1. **Uptime monitoring:** uptimerobot.com (free)
2. **Error tracking:** sentry.io (free tier)
3. **Performance:** New Relic / DataDog (free tiers available)

### Backup strategy

- **Database:** Daily automated backups
- **Code:** Git repository (GitHub/GitLab)
- **User data:** Regular exports

### Support

Set up support channel:
- Email: support@yourdomain.com
- Documentation site
- FAQ page

---

## ✅ Deployment Complete!

Congratulations! Your Binance Dashboard is now live in production!

### Next Steps

1. **Monitor:** Watch for errors in Sentry
2. **Optimize:** Check performance, add caching if needed
3. **Iterate:** Gather user feedback, improve Free tier
4. **Monetize:** Integrate Stripe for Pro/Elite subscriptions
5. **Scale:** Add more features, exchanges, analytics

---

## 📚 Additional Resources

- **Heroku Deployment:** devcenter.heroku.com/articles/getting-started-with-python
- **Flask Production Best Practices:** flask.palletsprojects.com/en/latest/deploying/
- **PostgreSQL on Heroku:** devcenter.heroku.com/articles/heroku-postgresql
- **Stripe Integration:** stripe.com/docs/payments/accept-a-payment
- **SendGrid Setup:** docs.sendgrid.com/for-developers/sending-email/quickstart-python

---

**Good luck with your launch! 🚀**


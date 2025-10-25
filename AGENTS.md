# AGENTS.md - FlashCur (Binance Perps Guru Dashboard)

## Project Overview

FlashCur is a comprehensive Binance Perpetual Futures trading dashboard featuring real-time market data, volume spike alerts, user authentication, payment processing via Stripe, Web3 wallet integration, and modern React frontend. This production-ready application provides tiered access (Free/Pro/Elite) with advanced features including email notifications, SMS alerts, and real-time WebSocket data streaming.

## Setup & Build

### Prerequisites
- Python 3.9+
- Node.js 16+
- PostgreSQL (for production)
- Stripe account (for payments)
- Cloudflare Workers account (for API proxy)
- SendGrid account (for email notifications)

### Backend Setup
```bash
# Clone the repository
git clone https://github.com/NikolaySitnikov/FlashCur.git
cd FlashCur

# Install Python dependencies
pip install -r requirements.txt

# For production dependencies
pip install -r requirements.production.txt

# Set up environment variables
cp env.example .env
# Edit .env with your configuration (see Environment Variables section)
```

### Frontend Setup (React Web3)
```bash
# Navigate to React Web3 frontend
cd modern-web3-frontend

# Install Node.js dependencies
npm install

# Build for production
npm run build
```

### Frontend Setup (Next.js)
```bash
# Navigate to Next.js frontend
cd modern-frontend

# Install Node.js dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Backend Setup (Next.js)
```bash
# Navigate to Next.js backend
cd modern-backend

# Install Python dependencies
pip install -r requirements.txt

# Run the backend
python -m app.main
```

### Database Setup
```bash
# Run database migrations
python migrate_db_step1.py
python migrate_payments_db.py
python migrate_settings_db.py

# Test database connection
python check_railway_db.py
```

## Tests & Verification

### Backend Testing
```bash
# Test database connection
python test_database.py

# Test user authentication
python check_users.py

# Test payment system
python -c "from payments import *; print('Payments OK')"

# Test email functionality
python -c "from email_utils import *; print('Email OK')"

# Test Web3 wallet integration
python -c "from wallet_auth import *; print('Wallet Auth OK')"
```

### Frontend Testing
```bash
cd modern-web3-frontend
npm test
npm run build
```

### Integration Testing
```bash
# Test production configuration
python production_config.py

# Test deployment setup
./deploy.sh --dry-run
```

## Run Locally

### Development Mode
```bash
# Start Flask backend
python app.py

# In another terminal, start React Web3 frontend
cd modern-web3-frontend
npm start

# Or start Next.js frontend
cd modern-frontend
npm run dev

# Or start Next.js backend
cd modern-backend
python -m app.main
```

### Production Mode
```bash
# Use deployment script
./deploy.sh

# Or manually with gunicorn
gunicorn --bind 0.0.0.0:5000 --workers 4 app:app
```

### Quick Test
```bash
# Run quick start script
./install_step1.sh
```

## Repository Layout

```
FlashCur/
├── AGENTS.md                    # This file
├── app.py                       # Main Flask application
├── requirements.txt             # Development dependencies
├── requirements.production.txt  # Production dependencies
├── deploy.sh                    # Deployment script
├── Procfile                     # Railway deployment config
├── railway.json                 # Railway configuration
├── env.example                  # Environment variables template
│
├── auth.py                      # Authentication system
├── models.py                    # Database models
├── payments.py                  # Stripe payment processing
├── wallet_auth.py              # Web3 wallet authentication
├── email_utils.py              # Email notification system
├── forms.py                     # WTForms definitions
├── config.py                    # Application configuration
├── settings.py                  # User settings management
├── alerts.py                    # Volume alert system
│
├── modern-web3-frontend/       # React Web3 frontend
│   ├── package.json            # Node.js dependencies
│   ├── src/                    # React source code
│   ├── build/                  # Built React app
│   └── craco.config.js         # CRACO configuration
├── modern-frontend/            # Next.js frontend
│   ├── package.json            # Next.js dependencies
│   ├── src/                    # Next.js source code
│   ├── .next/                  # Built Next.js app
│   └── tailwind.config.js      # Tailwind configuration
├── modern-backend/             # Next.js backend
│   ├── app/                    # Next.js app directory
│   ├── requirements.txt        # Python dependencies
│   └── Dockerfile              # Docker configuration
│
├── static/                     # Static assets
│   ├── css/                    # Stylesheets
│   ├── js/                     # JavaScript files
│   └── images/                 # Images and logos
│
├── templates/                  # Jinja2 templates
│   ├── dashboard.html          # Main dashboard
│   ├── login.html              # Login page
│   ├── register.html           # Registration page
│   ├── pricing.html            # Pricing page
│   ├── profile.html            # User profile
│   ├── settings.html           # User settings
│   └── emails/                  # Email templates
│
├── instance/                   # Database files
├── logs/                       # Application logs
└── migrations/                 # Database migrations
```

## Code Style & Rules

### Flask Backend
- Use Blueprint pattern for route organization
- Implement proper error handling with try/catch
- Use SQLAlchemy ORM for database operations
- Follow Flask-Login patterns for authentication
- Use environment variables for configuration
- Implement proper logging with RotatingFileHandler

### React Frontend
- Use TypeScript for type safety
- Implement React hooks properly
- Use functional components over class components
- Follow Web3 wallet integration patterns (RainbowKit, Wagmi)
- Use proper state management with React Query
- Implement proper error boundaries

### Database
- Use migrations for schema changes
- Implement proper foreign key relationships
- Use transactions for critical operations
- Follow SQLAlchemy best practices
- Use proper indexing for performance

### Security
- Validate all user inputs
- Use CSRF protection for forms
- Implement rate limiting with Flask-Limiter
- Secure API endpoints
- Use proper session management
- Implement proper authentication flows

### Web3 Integration
- Use RainbowKit for wallet connection
- Implement proper error handling for wallet failures
- Use secure signing methods with SIWE (Sign-In with Ethereum)
- Handle network switching properly
- Support multiple wallet types (MetaMask, WalletConnect, etc.)

## PR/Commit Rules

### Branch Naming
- `feature/description` for new features
- `fix/description` for bug fixes
- `refactor/description` for code improvements
- `security/description` for security updates
- `docs/description` for documentation updates

### Commit Style
- Use conventional commits: `type(scope): description`
- Examples: `feat(payments): add Stripe integration`, `fix(auth): resolve login redirect`
- Include relevant issue numbers
- Test all changes before committing

### Required Checks
- All Python files must pass syntax check
- React build must succeed
- Database migrations must be tested
- Payment flows must be verified
- Web3 wallet integration must work
- Email notifications must be tested

## Safety Notes

### Files/Directories NOT to Touch
- `instance/binance_dashboard.db` - Production database
- `.env` - Environment variables with secrets
- `logs/` - Application logs
- `modern-web3-frontend/node_modules/` - Node.js dependencies
- `modern-web3-frontend/build/` - Built React app
- `modern-frontend/.next/` - Built Next.js app
- `modern-frontend/node_modules/` - Node.js dependencies
- `modern-backend/__pycache__/` - Python cache files

### Secrets Handling
- Never commit `.env` files
- Store Stripe keys in environment variables
- Use Railway/Cloudflare for production secrets
- Implement proper API key rotation
- Use SendGrid for email services

### Migration Warnings
- Database migrations are irreversible
- Test migrations on development database first
- Backup production database before migrations
- Payment system changes require webhook updates
- User data changes require careful handling

### Production Deployment
- Use `requirements.production.txt`
- Set `FLASK_ENV=production`
- Configure proper CORS for frontend
- Use Cloudflare Workers for API proxy
- Set up proper logging and monitoring
- Use Railway for deployment

### Web3 Integration
- Test wallet connections thoroughly
- Implement proper error handling for wallet failures
- Use secure signing methods
- Handle network switching properly
- Support mobile wallet connections

## Environment Variables

### Required for Development
```bash
SECRET_KEY=your-super-secret-key-change-this-in-production
FLASK_ENV=development
FLASK_DEBUG=True
DATABASE_URI=sqlite:///instance/binance_dashboard.db
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
WEB3_PROVIDER_URI=https://eth.llamarpc.com
```

### Required for Production
```bash
FLASK_ENV=production
DATABASE_URI=postgresql://...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
MAIL_SERVER=smtp.sendgrid.net
MAIL_PASSWORD=SG.your-sendgrid-api-key
WEB3_PROVIDER_URI=https://mainnet.infura.io/v3/YOUR-PROJECT-ID
```

### Optional (Elite Tier)
```bash
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

## Deployment

### Railway Deployment
```bash
# Deploy to Railway
railway login
railway link
railway up
```

### Manual Deployment
```bash
# Run deployment script
./deploy.sh

# Or use gunicorn directly
gunicorn --bind 0.0.0.0:$PORT --workers 4 --timeout 120 app:app
```

### Cloudflare Worker Setup
1. Deploy `cloudflare-worker.js` to Cloudflare Workers
2. Set `BINANCE_API_BASE` environment variable to your Worker URL
3. Configure CORS for your domain

## Key Features

### Tier System
- **Free Tier**: Basic dashboard access
- **Pro Tier**: Email alerts, advanced features
- **Elite Tier**: SMS alerts, priority support

### Authentication
- Traditional email/password authentication
- Web3 wallet authentication (MetaMask, WalletConnect, etc.)
- SIWE (Sign-In with Ethereum) integration
- Session management and security

### Payment Processing
- Stripe integration for subscriptions
- Webhook handling for payment events
- Tier-based feature access
- Billing management

### Real-time Data
- Binance Futures API integration
- Volume spike detection
- WebSocket data streaming
- Caching for performance

### Email System
- SendGrid integration
- Email confirmation
- Alert notifications
- HTML email templates

## Troubleshooting

### Common Issues
- Database connection errors: Check `DATABASE_URI`
- Payment failures: Verify Stripe keys and webhooks
- Web3 wallet issues: Check network configuration
- CORS errors: Verify frontend URL configuration
- Email failures: Check SendGrid configuration

### Debug Commands
```bash
# Check database
python check_railway_db.py

# Test payments
python -c "from payments import test_stripe; test_stripe()"

# Verify users
python check_users.py

# Test email
python -c "from email_utils import test_email; test_email()"
```

### Mobile Issues
- Check responsive design in templates
- Verify Web3 wallet mobile compatibility
- Test touch interactions
- Ensure proper viewport configuration

## Documentation Files

This repository contains extensive documentation:
- `CUSTOMIZATION_GUIDE.md` - Customization options
- `E2E_TESTING_GUIDE.md` - End-to-end testing
- `PAYMENT_TESTING_GUIDE.md` - Payment flow testing
- `WALLET_AUTH_TESTING_GUIDE.md` - Web3 authentication testing
- `PRODUCTION_DEPLOYMENT_GUIDE.md` - Production deployment
- `CLOUDFLARE_WORKER_SETUP.md` - API proxy setup

## Quick Start Commands

```bash
# Complete setup from scratch
git clone https://github.com/NikolaySitnikov/FlashCur.git
cd FlashCur
pip install -r requirements.txt
cp env.example .env
# Edit .env with your configuration
python migrate_db_step1.py
python app.py
```

**Note**: This is the main production application with full feature set. For simpler implementations, see the parent VolumeFunding repository.
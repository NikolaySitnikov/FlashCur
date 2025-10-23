"""
Configuration Module for Binance Dashboard
──────────────────────────────────────────
Centralizes all tier-specific settings, API constants, and feature limits.
This module makes it easy to manage freemium tiers and feature gates.
"""

import os as _os
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ══════════════════════════════════════════════════════════════════════════════
# TIER DEFINITIONS
# ══════════════════════════════════════════════════════════════════════════════

TIERS = {
    'free': 0,
    'pro': 1,
    'elite': 2
}

# ══════════════════════════════════════════════════════════════════════════════
# BINANCE API SETTINGS
# ══════════════════════════════════════════════════════════════════════════════

# ══════════════════════════════════════════════════════════════════════════════
# PROXY CONFIGURATION FOR RAILWAY DEPLOYMENT
# ══════════════════════════════════════════════════════════════════════════════
# Railway's data center IPs are blocked by Binance (451 errors).
# Solution: Use Cloudflare Workers as a proxy.
#
# Setup Instructions:
# 1. See CLOUDFLARE_WORKER_SETUP.md for complete guide (5 minutes)
# 2. Deploy the cloudflare-worker.js to Cloudflare Workers
# 3. Set BINANCE_API_BASE env var in Railway to your Worker URL
# 4. Example: BINANCE_API_BASE=https://volspike-proxy.yourname.workers.dev
# ══════════════════════════════════════════════════════════════════════════════

# Primary API endpoint
# For local dev: uses fapi.binance.com directly
# For Railway: MUST set BINANCE_API_BASE to your Cloudflare Worker URL
API_BASE = os.getenv('BINANCE_API_BASE', "https://fapi.binance.com")

# Alternative endpoints (currently not used, but available for fallback)
API_BASE_ALT1 = "https://fapi1.binance.com"
API_BASE_ALT2 = "https://fapi2.binance.com"
API_BASE_ALT3 = "https://fapi3.binance.com"

VOLUME_URL = f"{API_BASE}/fapi/v1/ticker/24hr"
FUNDING_URL = f"{API_BASE}/fapi/v1/premiumIndex"
EXCHANGE_INFO_URL = f"{API_BASE}/fapi/v1/exchangeInfo"
KLINES_URL = f"{API_BASE}/fapi/v1/klines"

# Alternative URLs
VOLUME_URL_ALT1 = f"{API_BASE_ALT1}/fapi/v1/ticker/24hr"
FUNDING_URL_ALT1 = f"{API_BASE_ALT1}/fapi/v1/premiumIndex"
EXCHANGE_INFO_URL_ALT1 = f"{API_BASE_ALT1}/fapi/v1/exchangeInfo"

VOLUME_URL_ALT2 = f"{API_BASE_ALT2}/fapi/v1/ticker/24hr"
FUNDING_URL_ALT2 = f"{API_BASE_ALT2}/fapi/v1/premiumIndex"
EXCHANGE_INFO_URL_ALT2 = f"{API_BASE_ALT2}/fapi/v1/exchangeInfo"

VOLUME_URL_ALT3 = f"{API_BASE_ALT3}/fapi/v1/ticker/24hr"
FUNDING_URL_ALT3 = f"{API_BASE_ALT3}/fapi/v1/premiumIndex"
EXCHANGE_INFO_URL_ALT3 = f"{API_BASE_ALT3}/fapi/v1/exchangeInfo"

# ══════════════════════════════════════════════════════════════════════════════
# COMMON SETTINGS (apply to all tiers by default)
# ══════════════════════════════════════════════════════════════════════════════

INTERVAL = "1h"
WATCHLIST_FILE = "tradingview_watchlist.txt"
CACHE_MINUTES = 60
LOCAL_TZ = "America/Cancun"

# ══════════════════════════════════════════════════════════════════════════════
# FREE TIER SETTINGS
# ══════════════════════════════════════════════════════════════════════════════

FREE_TIER = {
    'name': 'Free',
    'price': 0,
    'refresh_ms': 15 * 60 * 1000,  # 15 minutes in milliseconds
    'alert_limit': 10,               # Show only last 10 alerts
    'watchlist_limit': 50,           # Export only top 50 assets by volume
    'min_quote_volume': None,        # Ignore advanced filters for simplicity
    'volume_multiple': 3,            # Volume spike detection threshold
    'show_ads': True,                # Display ads banner
    'features': {
        'core_dashboard': True,
        'auto_refresh': True,        # But slower (15 min)
        'basic_alerts': True,        # Limited to last 10
        'watchlist_export': True,    # Limited to 50 assets, .txt only
        'email_alerts': False,
        'custom_thresholds': False,
        'additional_metrics': False,  # No extra columns like OI, liquidations
        'enhanced_export': False,    # No CSV/JSON
        'theme_persistence': False,  # Theme resets on reload
        'real_time_updates': False,
        'advanced_filters': False,
        'historical_data': False,
        'multi_exchange': False,
        'api_access': False
    }
}

# ══════════════════════════════════════════════════════════════════════════════
# PRO TIER SETTINGS ($9.99/month or $99/year)
# ══════════════════════════════════════════════════════════════════════════════

PRO_TIER = {
    'name': 'Pro',
    'price_monthly': 9.99,
    'price_yearly': 99,
    'refresh_ms': 5 * 60 * 1000,     # 5 minutes (faster)
    'alert_limit': 30,               # Show last 30 alerts
    'watchlist_limit': None,         # Unlimited watchlist export
    'min_quote_volume': 3_000_000,   # Advanced filtering enabled
    'volume_multiple': 3,            # Customizable via UI
    'show_ads': False,               # Ad-free experience
    'features': {
        'core_dashboard': True,
        'auto_refresh': True,        # 5 min refresh
        'manual_refresh': True,      # On-demand refresh button
        'basic_alerts': True,
        'email_alerts': True,        # SMTP integration for notifications
        'custom_thresholds': True,   # User can adjust volume multiple, min vol
        'watchlist_export': True,    # Unlimited assets
        'enhanced_export': True,     # CSV & JSON formats
        'additional_metrics': True,  # Show OI, Price Change %, Liquidations
        'theme_persistence': True,   # Save theme preference across sessions
        'advanced_filters': True,    # Sort/filter by funding, volume, etc.
        'real_time_updates': False,
        'historical_data': False,
        'multi_exchange': False,
        'api_access': False
    }
}

# ══════════════════════════════════════════════════════════════════════════════
# ELITE TIER SETTINGS ($29.99/month or $299/year)
# ══════════════════════════════════════════════════════════════════════════════

ELITE_TIER = {
    'name': 'Elite',
    'price_monthly': 29.99,
    'price_yearly': 299,
    'refresh_ms': 30 * 1000,         # 30 seconds (near real-time)
    'alert_limit': None,             # Unlimited alert history
    'watchlist_limit': None,         # Unlimited
    'min_quote_volume': 3_000_000,   # Fully customizable
    'volume_multiple': 3,            # Fully customizable
    'show_ads': False,               # Ad-free
    'features': {
        'core_dashboard': True,
        'auto_refresh': True,        # 30 sec refresh
        'manual_refresh': True,
        'real_time_updates': True,   # WebSocket-based live updates
        'basic_alerts': True,
        'email_alerts': True,
        'sms_alerts': True,          # Twilio integration
        'telegram_alerts': True,     # Telegram bot integration
        'discord_alerts': True,      # Discord webhook integration
        'custom_thresholds': True,
        'watchlist_export': True,
        'enhanced_export': True,     # All formats including API
        'additional_metrics': True,
        'historical_data': True,     # 7-day volume charts, trend analysis
        'advanced_filters': True,
        'integrated_charts': True,   # Plotly/Matplotlib visualizations
        'multi_exchange': True,      # Support for Bybit, OKX, etc.
        'api_access': True,          # Personal API key for data access
        'priority_support': True,    # Dedicated support channel
        'team_accounts': True,       # Multi-user login support
        'ai_insights': False,        # Future: ML-based anomaly detection
        'theme_persistence': True
    }
}

# ══════════════════════════════════════════════════════════════════════════════
# DATABASE SETTINGS
# ══════════════════════════════════════════════════════════════════════════════

# SQLite for local development (change to PostgreSQL/MySQL for production)
# Can be overridden with environment variable
# Use absolute path for SQLite to avoid path resolution issues
_basedir = _os.path.abspath(_os.path.dirname(__file__))
_default_db_path = f'sqlite:///{_os.path.join(_basedir, "instance", "binance_dashboard.db")}'

# Check for Railway's DATABASE_URL first, then fall back to DATABASE_URI
DATABASE_URI = os.getenv('DATABASE_URL') or os.getenv(
    'DATABASE_URI', _default_db_path)

# Secret key for sessions (MUST be changed in production!)
# Can be overridden with environment variable
SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

# Flask environment
FLASK_ENV = os.getenv('FLASK_ENV', 'development')
DEBUG = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'

# Session configuration
SESSION_COOKIE_NAME = 'binance_dashboard_session'
SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
PERMANENT_SESSION_LIFETIME = 2592000  # 30 days in seconds

# ══════════════════════════════════════════════════════════════════════════════
# EMAIL CONFIGURATION (for Pro/Elite tiers)
# ══════════════════════════════════════════════════════════════════════════════

# Email backend configuration (using SendGrid or SMTP)
MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.sendgrid.net')
MAIL_PORT = int(os.getenv('MAIL_PORT', '587'))
MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
MAIL_USE_SSL = os.getenv('MAIL_USE_SSL', 'False').lower() == 'true'
# SendGrid uses 'apikey' as username
MAIL_USERNAME = os.getenv('MAIL_USERNAME', 'apikey')
MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', '')  # SendGrid API key goes here
MAIL_DEFAULT_SENDER = os.getenv(
    'MAIL_DEFAULT_SENDER', 'noreply@volspike.com')

# Email confirmation settings
EMAIL_CONFIRMATION_SALT = os.getenv(
    'EMAIL_CONFIRMATION_SALT', 'email-confirmation-salt-change-in-prod')
EMAIL_CONFIRMATION_MAX_AGE = 3600  # 1 hour token validity

# ══════════════════════════════════════════════════════════════════════════════
# PAYMENT CONFIGURATION (Stripe for Pro/Elite tiers)
# ══════════════════════════════════════════════════════════════════════════════

# Stripe API keys (get from https://dashboard.stripe.com/apikeys)
STRIPE_PUBLISHABLE_KEY = os.getenv('STRIPE_PUBLISHABLE_KEY', '')
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY', '')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET', '')

# Stripe Product/Price IDs (create these in Stripe Dashboard)
STRIPE_PRODUCTS = {
    'pro_monthly': os.getenv('STRIPE_PRO_MONTHLY_PRICE_ID', ''),
    'pro_yearly': os.getenv('STRIPE_PRO_YEARLY_PRICE_ID', ''),
    'elite_monthly': os.getenv('STRIPE_ELITE_MONTHLY_PRICE_ID', ''),
    'elite_yearly': os.getenv('STRIPE_ELITE_YEARLY_PRICE_ID', ''),
}

# ══════════════════════════════════════════════════════════════════════════════
# WALLET AUTHENTICATION (Web3 / MetaMask / Crypto Wallet Sign-In)
# ══════════════════════════════════════════════════════════════════════════════

# Ethereum/Polygon mainnet RPC (for wallet verification)
WEB3_PROVIDER_URI = os.getenv('WEB3_PROVIDER_URI', 'https://eth.llamarpc.com')
# Message template for wallet signatures
WALLET_SIGN_MESSAGE = "Sign this message to authenticate with Binance Dashboard.\n\nNonce: {nonce}"

# ══════════════════════════════════════════════════════════════════════════════
# RATE LIMITING (to prevent API abuse)
# ══════════════════════════════════════════════════════════════════════════════

# Rate limits per tier (requests per hour)
RATE_LIMITS = {
    'free': '100/hour',      # 100 requests per hour for Free
    'pro': '500/hour',       # 500 requests per hour for Pro
    'elite': '2000/hour',    # 2000 requests per hour for Elite
}

# Default rate limit for unauthenticated users
DEFAULT_RATE_LIMIT = '50/hour'

# ══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════


def get_tier_config(tier_level: int) -> dict:
    """
    Get configuration for a specific tier level.

    Args:
        tier_level: Integer tier level (0=Free, 1=Pro, 2=Elite)

    Returns:
        Dictionary containing tier-specific configuration
    """
    tier_map = {
        0: FREE_TIER,
        1: PRO_TIER,
        2: ELITE_TIER
    }
    return tier_map.get(tier_level, FREE_TIER)


def has_feature(tier_level: int, feature_name: str) -> bool:
    """
    Check if a tier has access to a specific feature.

    Args:
        tier_level: Integer tier level (0=Free, 1=Pro, 2=Elite)
        feature_name: Name of the feature to check

    Returns:
        Boolean indicating if feature is available
    """
    config = get_tier_config(tier_level)
    return config.get('features', {}).get(feature_name, False)


def get_refresh_interval(tier_level: int) -> int:
    """
    Get refresh interval in milliseconds for a tier.

    Args:
        tier_level: Integer tier level (0=Free, 1=Pro, 2=Elite)

    Returns:
        Refresh interval in milliseconds
    """
    config = get_tier_config(tier_level)
    return config.get('refresh_ms', FREE_TIER['refresh_ms'])


def get_alert_limit(tier_level: int) -> int | None:
    """
    Get alert display limit for a tier.

    Args:
        tier_level: Integer tier level (0=Free, 1=Pro, 2=Elite)

    Returns:
        Number of alerts to display (None = unlimited)
    """
    config = get_tier_config(tier_level)
    return config.get('alert_limit')


def get_watchlist_limit(tier_level: int) -> int | None:
    """
    Get watchlist export limit for a tier.

    Args:
        tier_level: Integer tier level (0=Free, 1=Pro, 2=Elite)

    Returns:
        Number of symbols to export (None = unlimited)
    """
    config = get_tier_config(tier_level)
    return config.get('watchlist_limit')


# ══════════════════════════════════════════════════════════════════════════════
# AD CONFIGURATION (for Free Tier)
# ══════════════════════════════════════════════════════════════════════════════

AD_CONFIG = {
    'enabled': True,
    'position': 'top',  # 'top' or 'bottom'
    'message': '🚀 Upgrade to Pro for faster refresh, email alerts, and no ads! <a href="/pricing" style="color: #00ff88; font-weight: 700;">Learn More →</a>',
    # Set to True to allow users to dismiss (but shows on reload)
    'dismissible': False
}

# ══════════════════════════════════════════════════════════════════════════════
# FEATURE FLAGS (for gradual rollout)
# ══════════════════════════════════════════════════════════════════════════════

FEATURE_FLAGS = {
    'enable_tier_system': os.getenv('ENABLE_TIER_SYSTEM', 'True').lower() == 'true',
    'enable_registration': os.getenv('ENABLE_REGISTRATION', 'True').lower() == 'true',
    'enable_email_verification': False,  # Require email verification (future)
    'enable_payment_integration': False,  # Stripe/PayPal integration (future)
    'show_pricing_page': os.getenv('SHOW_PRICING_PAGE', 'True').lower() == 'true',
    'allow_tier_downgrades': True,   # Let users downgrade tiers
    'maintenance_mode': False,        # Emergency maintenance mode
    # Show debug routes in dev
    'enable_debug_routes': os.getenv('ENABLE_DEBUG_ROUTES', 'True').lower() == 'true',
}

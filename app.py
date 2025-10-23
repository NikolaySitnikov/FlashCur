"""
Animated Binance Dashboard - Flask Version
─────────────────────────────────────────
✅ REAL progressive loading with visible row-by-row updates
✅ Rolling airport/railroad style animations  
✅ Beautiful row transitions and sorting
✅ STUNNING dark theme design
✅ Auto-refresh every 5 minutes
✅ Clean data display without raw columns
✅ Real-time visible animations using JavaScript
"""

from flask_cors import CORS
from flask import Flask, render_template, jsonify, request, make_response, flash, redirect, url_for
import requests
import pandas as pd
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import time
from datetime import datetime, timezone
import pytz
import json
import threading
from typing import Dict, List, Tuple, Optional
from flask_login import login_required, current_user
import logging
from logging.handlers import RotatingFileHandler
import os

# Import Pro Tier extensions
from flask_mail import Mail
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Import configuration (centralized tier settings)
import config
import payments

# Import database models
from models import db, User, AlertPreferences, get_user_by_email, create_default_alert_preferences

# Import authentication module
import auth
from auth import init_auth

# Import wallet authentication module
from wallet_auth import init_wallet_auth

# Import settings module
import settings

# ──────────────────────────────────────────────────────────────
# Constants & settings (now loaded from config)
# ──────────────────────────────────────────────────────────────
API = config.API_BASE
print(f"🔧 Using API_BASE = {API}")  # Debug logging for startup verification
VOLUME_URL = config.VOLUME_URL
FUNDING_URL = config.FUNDING_URL
EXCHANGE_INFO_URL = config.EXCHANGE_INFO_URL

INTERVAL = config.INTERVAL
# Default to Free tier for now
VOLUME_MULTIPLE = config.FREE_TIER['volume_multiple']
MIN_QUOTE_VOL = config.FREE_TIER['min_quote_volume'] or 3_000_000
REFRESH_MS = config.FREE_TIER['refresh_ms']  # Default to Free tier (15 min)
WATCHLIST_FILE = config.WATCHLIST_FILE
CACHE_MINUTES = config.CACHE_MINUTES
LOCAL_TZ = pytz.timezone(config.LOCAL_TZ)

# ──────────────────────────────────────────────────────────────
# Flask app
# ──────────────────────────────────────────────────────────────
app = Flask(__name__)

# Enable CORS for React frontend and mobile testing
CORS(app, origins=['http://localhost:3000',
     'http://localhost:8081',
                   'http://192.168.22.131:3000',
                   'http://192.168.22.131:8081',
                   'http://192.168.1.70:3000',
                   'http://192.168.1.70:8081',
                   'http://127.0.0.1:3000',
                   'http://127.0.0.1:8081',
                   'http://*:3000',
                   'http://*:8081'], supports_credentials=True)

# Flask configuration from config module
app.config['SECRET_KEY'] = config.SECRET_KEY
app.config['SQLALCHEMY_DATABASE_URI'] = config.DATABASE_URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SESSION_COOKIE_NAME'] = config.SESSION_COOKIE_NAME
app.config['SESSION_COOKIE_SECURE'] = config.SESSION_COOKIE_SECURE
app.config['SESSION_COOKIE_HTTPONLY'] = config.SESSION_COOKIE_HTTPONLY
app.config['SESSION_COOKIE_SAMESITE'] = config.SESSION_COOKIE_SAMESITE
app.config['PERMANENT_SESSION_LIFETIME'] = config.PERMANENT_SESSION_LIFETIME

# ──────────────────────────────────────────────────────────────────
# Pro Tier: Email Configuration
# ──────────────────────────────────────────────────────────────────
app.config['MAIL_SERVER'] = config.MAIL_SERVER
app.config['MAIL_PORT'] = config.MAIL_PORT
app.config['MAIL_USE_TLS'] = config.MAIL_USE_TLS
app.config['MAIL_USE_SSL'] = config.MAIL_USE_SSL
app.config['MAIL_USERNAME'] = config.MAIL_USERNAME
app.config['MAIL_PASSWORD'] = config.MAIL_PASSWORD
app.config['MAIL_DEFAULT_SENDER'] = config.MAIL_DEFAULT_SENDER

# ──────────────────────────────────────────────────────────────────
# Pro Tier: Stripe Payment Configuration
# ──────────────────────────────────────────────────────────────────
app.config['STRIPE_PUBLISHABLE_KEY'] = config.STRIPE_PUBLISHABLE_KEY
app.config['STRIPE_SECRET_KEY'] = config.STRIPE_SECRET_KEY
app.config['STRIPE_WEBHOOK_SECRET'] = config.STRIPE_WEBHOOK_SECRET

# Initialize database with Flask app
db.init_app(app)

# ──────────────────────────────────────────────────────────────────
# Pro Tier: Initialize Flask-Mail (for email alerts & confirmation)
# ──────────────────────────────────────────────────────────────────
mail = Mail(app)

# ──────────────────────────────────────────────────────────────────
# Pro Tier: Initialize Flask-Limiter (rate limiting)
# ──────────────────────────────────────────────────────────────────
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["10000 per hour"],  # High limit for development/testing
    storage_uri="memory://"  # Use Redis in production for distributed systems
)

# ──────────────────────────────────────────────────────────────
# Database initialization
# ──────────────────────────────────────────────────────────────


def init_database():
    """Initialize database tables if they don't exist."""
    with app.app_context():
        db.create_all()
        print("✅ Database tables created successfully!")


# Create tables on first run
with app.app_context():
    db.create_all()
    print("🗄️  Database initialized")

# Initialize authentication system
init_auth(app)
print("🔐 Authentication system initialized")

# Initialize wallet authentication system
init_wallet_auth(app)
print("🔑 Wallet authentication system initialized")

# Register settings blueprint
app.register_blueprint(settings.settings_bp)
print("⚙️  Settings module initialized")

print("📧 Flask-Mail initialized for Pro Tier email features")
print("🚦 Flask-Limiter initialized for rate limiting")

# ──────────────────────────────────────────────────────────────
# Logging Configuration
# ──────────────────────────────────────────────────────────────

# Create necessary directories if they don't exist
if not os.path.exists('logs'):
    os.makedirs('logs')
if not os.path.exists('instance'):
    os.makedirs('instance')

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# File handler (rotating log files)
file_handler = RotatingFileHandler(
    'logs/binance_dashboard.log',
    maxBytes=10 * 1024 * 1024,  # 10MB
    backupCount=5
)
file_handler.setLevel(logging.INFO)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
))

# Add handler to app logger
app.logger.addHandler(file_handler)
app.logger.setLevel(logging.INFO)

# Add handler to payments logger for detailed webhook debugging
payments_logger = logging.getLogger('payments')
payments_logger.addHandler(file_handler)
payments_logger.setLevel(logging.DEBUG)  # Use DEBUG for detailed webhook logs

# Log startup
app.logger.info("="*70)
app.logger.info("🚀 VolSpike Starting Up")
app.logger.info(f"Database: {config.DATABASE_URI}")
app.logger.info(
    f"Environment: {'Production' if not app.debug else 'Development'}")
app.logger.info(f"API Base: {config.API_BASE}")
app.logger.info(f"Exchange Info URL: {EXCHANGE_INFO_URL}")
app.logger.info("="*70)

print("📝 Logging system initialized")

# ──────────────────────────────────────────────────────────────
# Error Handlers
# ──────────────────────────────────────────────────────────────


@app.errorhandler(404)
def not_found_error(error):
    """Handle 404 errors with custom page."""
    app.logger.warning(f"404 Not Found: {request.url}")
    return render_template('404.html'), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors with custom page."""
    app.logger.error(f"500 Internal Error: {error}", exc_info=True)
    db.session.rollback()  # Rollback any pending transactions
    return render_template('500.html'), 500


@app.errorhandler(Exception)
def handle_exception(error):
    """Handle uncaught exceptions."""
    app.logger.error(f"Unhandled exception: {error}", exc_info=True)
    db.session.rollback()
    return render_template('500.html'), 500

# ──────────────────────────────────────────────────────────────
# Enhanced utility functions
# ──────────────────────────────────────────────────────────────


def format_volume(volume: float) -> str:
    """Enhanced volume formatting with better precision."""
    if volume >= 1e9:
        return f"${volume/1e9:.2f}B"
    elif volume >= 1e6:
        return f"${volume/1e6:.2f}M"
    elif volume >= 1e3:
        return f"${volume/1e3:.2f}K"
    return f"${volume:,.0f}"


def format_price(price: float | str) -> str:
    """Enhanced price formatting."""
    p = float(price)
    if p < 0.01:
        return f"${p:.6f}"
    elif p < 1:
        return f"${p:.4f}"
    elif p < 100:
        return f"${p:.3f}"
    else:
        return f"${p:.2f}"


def format_funding_rate(rate: float) -> str:
    """Format funding rate with appropriate precision."""
    if pd.isna(rate):
        return "N/A"
    return f"{rate:.4f}%"

# ──────────────────────────────────────────────────────────────
# Enhanced session with better error handling
# ──────────────────────────────────────────────────────────────


def create_robust_session():
    """Create a robust requests session with enhanced retry logic."""
    session = requests.Session()

    # Add headers to bypass 451 errors
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    })

    # Don't retry 451 errors automatically - we'll handle those in fallback
    retry_strategy = Retry(
        total=2,  # Reduced retries since we have multiple endpoints
        backoff_factor=1,
        # Removed 451 from retry list
        status_forcelist=[429, 500, 502, 503, 504],
        raise_on_status=False
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def fetch_with_fallback(session, urls, timeout=15, params=None):
    """
    Try multiple URLs in sequence until one succeeds.
    Returns response object on success, None on failure.
    """
    last_error = None
    for i, url in enumerate(urls, 1):
        try:
            response = session.get(url, timeout=timeout, params=params)
            if response.status_code == 200:
                if i > 1:  # Only log if we used a fallback
                    print(
                        f"✅ Successfully fetched from fallback endpoint #{i}: {url}")
                return response
            elif response.status_code == 451:
                # Try next endpoint
                print(f"❌ Endpoint {i}/{len(urls)} blocked (451): {url}")
                last_error = f"451 Client Error for {url}"
                continue
            else:
                # Other error, try to get more info but continue to next endpoint
                print(
                    f"❌ Endpoint {i}/{len(urls)} error ({response.status_code}): {url}")
                last_error = f"{response.status_code} Error for {url}"
                continue
        except Exception as e:
            # Log and try next endpoint
            print(f"❌ Endpoint {i}/{len(urls)} failed: {url} - {str(e)[:100]}")
            last_error = str(e)
            continue

    # All endpoints failed
    print(f"🚨 All {len(urls)} endpoints failed. Last error: {last_error}")
    return None

# ──────────────────────────────────────────────────────────────
# Data management
# ──────────────────────────────────────────────────────────────


class DataManager:
    """Handles data fetching and caching with background refresh."""

    def __init__(self):
        self.session = create_robust_session()
        self.active_syms = set()
        self.cached_data = []
        self.cached_pro_data = []
        self.last_update = None
        self.cache_lock = threading.Lock()
        self.is_fetching = False

    def fetch_active_symbols(self) -> set[str]:
        """Fetch and cache active trading symbols."""
        try:
            # Try multiple endpoints
            exchange_urls = [
                EXCHANGE_INFO_URL,
                config.EXCHANGE_INFO_URL_ALT1,
                config.EXCHANGE_INFO_URL_ALT2,
                config.EXCHANGE_INFO_URL_ALT3
            ]

            response = fetch_with_fallback(
                self.session, exchange_urls, timeout=15)

            if not response:
                print("Failed to fetch active symbols from all endpoints")
                return set()

            data = response.json()

            symbols = {
                s["symbol"] for s in data["symbols"]
                if (s.get("contractType") == "PERPETUAL" and
                    s.get("quoteAsset") == "USDT" and
                    s.get("status") == "TRADING")
            }
            return symbols
        except Exception as e:
            print(f"Failed to fetch active symbols: {e}")
            return set()

    def get_cached_data(self, include_pro_metrics: bool = False) -> Tuple[List[Dict], Optional[datetime]]:
        """
        Get cached data immediately without waiting for fetch.
        Returns (data, last_update_time).
        """
        with self.cache_lock:
            if include_pro_metrics and self.cached_pro_data:
                return self.cached_pro_data, self.last_update
            elif not include_pro_metrics and self.cached_data:
                return self.cached_data, self.last_update
            else:
                # No cache yet, fetch synchronously
                return self.fetch_data(include_pro_metrics), datetime.now(timezone.utc)

    def fetch_data(self, include_pro_metrics: bool = False) -> List[Dict]:
        """
        Fetch fresh data from Binance.

        Args:
            include_pro_metrics: If True, fetch additional metrics for Pro/Elite users
                                (price change %, open interest, liquidation estimates)
        """
        if not self.active_syms:
            self.active_syms = self.fetch_active_symbols()

        try:
            # Fetch volume data (includes price change %) with fallback
            volume_urls = [
                VOLUME_URL,
                config.VOLUME_URL_ALT1,
                config.VOLUME_URL_ALT2,
                config.VOLUME_URL_ALT3
            ]
            volume_response = fetch_with_fallback(
                self.session, volume_urls, timeout=15)

            if not volume_response:
                app.logger.error(
                    "Failed to fetch data from all volume endpoints")
                return []

            volume_data = volume_response.json()

            # Fetch funding data with fallback
            funding_urls = [
                FUNDING_URL,
                config.FUNDING_URL_ALT1,
                config.FUNDING_URL_ALT2,
                config.FUNDING_URL_ALT3
            ]
            funding_response = fetch_with_fallback(
                self.session, funding_urls, timeout=15)

            if not funding_response:
                app.logger.error(
                    "Failed to fetch funding data from all endpoints")
                return []

            funding_data = funding_response.json()

            # Create funding rate lookup
            funding_rates = {
                item["symbol"].replace("USDT", ""): float(item["lastFundingRate"]) * 100
                for item in funding_data
                if item.get("symbol", "").endswith("USDT")
            }

            # Fetch open interest data for Pro/Elite users
            open_interest_data = {}
            if include_pro_metrics:
                try:
                    oi_response = self.session.get(
                        f"{API}/fapi/v1/openInterest",
                        timeout=15
                    )
                    # Note: This endpoint requires a symbol parameter
                    # We'll fetch it per-symbol below
                except Exception as e:
                    app.logger.warning(
                        f"Failed to fetch open interest data: {e}")

            # Process and filter data
            processed_data = []
            for item in volume_data:
                if (item.get("symbol", "").endswith("USDT") and
                    item["symbol"] in self.active_syms and
                        float(item.get("quoteVolume", 0)) > 100_000_000):

                    asset = item["symbol"].replace("USDT", "")
                    symbol = item["symbol"]
                    volume = float(item["quoteVolume"])
                    price = float(item["lastPrice"])
                    funding_rate = funding_rates.get(asset, None)

                    # Base data for all users
                    data_item = {
                        "asset": asset,
                        "symbol": symbol,
                        "volume": volume,
                        "price": price,
                        "funding_rate": funding_rate,
                        "volume_formatted": format_volume(volume),
                        "price_formatted": format_price(price),
                        "funding_formatted": format_funding_rate(funding_rate) if funding_rate is not None else "N/A"
                    }

                    # Add Pro/Elite metrics
                    if include_pro_metrics:
                        # Price change % (24h)
                        price_change_pct = float(
                            item.get("priceChangePercent", 0))
                        data_item["price_change_pct"] = price_change_pct
                        data_item["price_change_formatted"] = f"{price_change_pct:+.2f}%"

                        # Fetch open interest for this symbol
                        try:
                            oi_response = self.session.get(
                                f"{API}/fapi/v1/openInterest",
                                params={"symbol": symbol},
                                timeout=5
                            )
                            if oi_response.status_code == 200:
                                oi_data = oi_response.json()
                                open_interest = float(
                                    oi_data.get("openInterest", 0))
                                # Convert to USD value
                                oi_usd = open_interest * price
                                data_item["open_interest"] = open_interest
                                data_item["open_interest_usd"] = oi_usd
                                data_item["open_interest_formatted"] = format_volume(
                                    oi_usd)
                            else:
                                data_item["open_interest"] = None
                                data_item["open_interest_usd"] = None
                                data_item["open_interest_formatted"] = "N/A"
                        except Exception as e:
                            data_item["open_interest"] = None
                            data_item["open_interest_usd"] = None
                            data_item["open_interest_formatted"] = "N/A"

                        # Liquidation estimate (proxy using funding rate intensity)
                        # High funding rate + high volume = potential liquidation risk
                        if funding_rate is not None and abs(funding_rate) > 0.05:
                            liq_risk = "High" if abs(
                                funding_rate) > 0.1 else "Medium"
                        else:
                            liq_risk = "Low"
                        data_item["liquidation_risk"] = liq_risk

                    processed_data.append(data_item)

            # Sort by volume descending
            processed_data.sort(key=lambda x: x["volume"], reverse=True)

            # Update cache
            with self.cache_lock:
                if include_pro_metrics:
                    self.cached_pro_data = processed_data
                else:
                    self.cached_data = processed_data
                self.last_update = datetime.now(timezone.utc)

            return processed_data

        except Exception as e:
            print(f"Failed to fetch data: {e}")
            app.logger.error(f"Failed to fetch data: {e}")
            # Return cached data if available
            with self.cache_lock:
                if include_pro_metrics and self.cached_pro_data:
                    return self.cached_pro_data
                elif not include_pro_metrics and self.cached_data:
                    return self.cached_data
            return []

    def refresh_cache_background(self):
        """Refresh both Free and Pro caches in background."""
        if self.is_fetching:
            return  # Already fetching, skip

        self.is_fetching = True
        try:
            app.logger.info("🔄 Background cache refresh started")

            # Fetch both Free and Pro data
            free_data = self.fetch_data(include_pro_metrics=False)
            pro_data = self.fetch_data(include_pro_metrics=True)

            app.logger.info(
                f"✅ Cache refreshed: {len(free_data)} Free, {len(pro_data)} Pro assets")
        except Exception as e:
            app.logger.error(f"❌ Background cache refresh failed: {e}")
        finally:
            self.is_fetching = False


# Global data manager
data_manager = DataManager()

# Background cache refresh thread


def background_cache_refresher():
    """
    Background thread that refreshes cache every CACHE_MINUTES.
    Keeps data fresh without blocking user requests.
    """
    import time

    # Initial cache population
    app.logger.info("🔄 Populating initial cache...")
    try:
        data_manager.refresh_cache_background()
        app.logger.info("✅ Initial cache populated")
    except Exception as e:
        app.logger.error(f"❌ Initial cache population failed: {e}")

    # Continuous refresh loop
    while True:
        try:
            time.sleep(CACHE_MINUTES * 60)  # Wait for cache interval
            app.logger.info(
                f"🔄 Scheduled cache refresh (every {CACHE_MINUTES} min)")
            data_manager.refresh_cache_background()
        except Exception as e:
            app.logger.error(f"❌ Background cache refresh error: {e}")
            time.sleep(60)  # Wait 1 minute before retrying


# Start background cache refresher
cache_refresh_thread = threading.Thread(
    target=background_cache_refresher, daemon=True)
cache_refresh_thread.start()
app.logger.info(
    f"🚀 Background cache refresher started (interval: {CACHE_MINUTES} min)")

# Alert system
alerts = []
last_alert = {}
initial_alert_minute = {}


def last_two_closed_klines(sym: str):
    """Get last two closed klines for a symbol."""
    try:
        response = data_manager.session.get(f"{API}/fapi/v1/klines",
                                            params={
                                                "symbol": sym, "interval": INTERVAL, "limit": 3},
                                            timeout=10)
        kl = response.json()
        now_ms = int(time.time() * 1000)
        closed = [k for k in kl if k[6] < now_ms]
        return closed[-2:] if len(closed) >= 2 else []
    except Exception:
        return []


def scan_alerts():
    """
    Scan for volume spikes and generate alerts.

    For Pro/Elite users with email alerts enabled, sends email notifications.
    """
    global alerts, last_alert, initial_alert_minute

    utc_now = datetime.now(timezone.utc)
    top_of_hour = (utc_now.minute == 0)
    is_middle_hour = (utc_now.minute == 30)

    for sym in data_manager.active_syms:
        try:
            if top_of_hour:
                klines = last_two_closed_klines(sym)
                if len(klines) < 2:
                    continue
                prev, curr = klines
            else:
                response = data_manager.session.get(f"{API}/fapi/v1/klines",
                                                    params={"symbol": sym,
                                                            "interval": INTERVAL, "limit": 2},
                                                    timeout=10)
                kl = response.json()
                if len(kl) < 2:
                    continue
                prev, curr = kl[-2], kl[-1]
        except Exception:
            continue

        prev_vol = float(prev[7])
        curr_vol = float(curr[7])
        ratio = curr_vol / prev_vol if prev_vol else 0

        curr_hour = datetime.fromtimestamp(
            curr[0] / 1000, timezone.utc).replace(minute=0, second=0, microsecond=0)

        already_alerted = last_alert.get(sym) == curr_hour
        spike = (ratio >= VOLUME_MULTIPLE) and (
            curr_vol >= MIN_QUOTE_VOL) and not already_alerted

        # Check for update alerts (middle or end of hour)
        update_alert = False
        update_prefix = ""
        if already_alerted:
            initial_min = initial_alert_minute.get(sym, 0)

            # Half update logic
            if is_middle_hour:
                # Send half update if initial alert was at hh:00, hh:05, hh:10, hh:15, hh:20
                if initial_min <= 20:
                    update_prefix = "HALF-UPDATE: "
                    update_alert = True

            # Full update logic
            elif top_of_hour:
                # Send full update if initial alert was NOT at hh:55
                if initial_min != 55:
                    update_prefix = "UPDATE: "
                    update_alert = True

        if spike:
            last_alert[sym] = curr_hour
            initial_alert_minute[sym] = utc_now.minute

        if spike or update_alert:
            asset = sym.replace("USDT", "")
            # Format volume
            if curr_vol >= 1e9:
                vol_str = f"{curr_vol/1e9:.2f}B"
            elif curr_vol >= 1e6:
                vol_str = f"{curr_vol/1e6:.2f}M"
            elif curr_vol >= 1e3:
                vol_str = f"{curr_vol/1e3:.2f}K"
            else:
                vol_str = f"{curr_vol:,.0f}"

            alert_msg = f"{update_prefix}{asset} hourly volume ${vol_str} ({ratio:.2f}× prev) — VOLUME SPIKE!"
            alerts.append((utc_now, alert_msg))
            alerts = alerts[-30:]  # Keep only last 30 alerts

            # Send email alerts to Pro/Elite users with email_alerts enabled
            try:
                from models import User, AlertPreferences
                from email_utils import send_alert_email

                # Get users with email alerts enabled
                users_with_alerts = db.session.query(User).join(AlertPreferences).filter(
                    AlertPreferences.email_alerts_enabled == True,
                    User.is_active == True,
                    User.email_confirmed == True
                ).all()

                for user in users_with_alerts:
                    # Check if user has email_alerts feature
                    if config.has_feature(user.tier, 'email_alerts'):
                        # Get current price and funding rate
                        try:
                            price_response = data_manager.session.get(
                                f"{API}/fapi/v1/ticker/price",
                                params={"symbol": sym},
                                timeout=5
                            )
                            price_data = price_response.json()
                            current_price = float(price_data.get('price', 0))
                        except:
                            current_price = 0

                        # Get funding rate
                        try:
                            funding_response = data_manager.session.get(
                                f"{API}/fapi/v1/premiumIndex",
                                params={"symbol": sym},
                                timeout=5
                            )
                            funding_data = funding_response.json()
                            funding_rate = float(funding_data.get(
                                'lastFundingRate', 0)) * 100
                        except:
                            funding_rate = 0

                        # Prepare alert data for email
                        alert_data = {
                            'symbol': sym,
                            'asset': asset,
                            'volume_24h': curr_vol,
                            'volume_change': ratio,
                            'funding_rate': funding_rate,
                            'price': current_price,
                            'alert_message': alert_msg
                        }

                        # Send email (non-blocking) with app context
                        def send_email_with_context():
                            with app.app_context():
                                send_alert_email(user, alert_data, mail)

                        threading.Thread(
                            target=send_email_with_context,
                            daemon=True
                        ).start()

                        app.logger.info(
                            f"📧 Alert email queued for {user.email}: {sym}")

            except Exception as e:
                app.logger.error(f"❌ Error sending alert emails: {e}")


# Start alert scanning in background


def alert_scanner():
    while True:
        try:
            scan_alerts()
        except Exception as e:
            print(f"Alert scan error: {e}")
        time.sleep(60)  # Check every minute


# Start the alert scanner thread
alert_thread = threading.Thread(target=alert_scanner, daemon=True)
alert_thread.start()

# ──────────────────────────────────────────────────────────────
# Security Headers
# ──────────────────────────────────────────────────────────────

@app.after_request
def after_request(response):
    """Add security headers including CSP for WebSocket connections"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    
    # Add CSP for WebSocket connections to Binance
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "connect-src 'self' wss://fstream.binance.com https://fstream.binance.com; "
        "img-src 'self' data:; "
        "frame-ancestors 'none';"
    )
    
    return response

# ──────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────


@app.route('/health')
def health_check():
    """Health check endpoint for Railway deployment"""
    return {'status': 'healthy', 'service': 'VolSpike'}, 200


@app.route('/debug/upstreams')
def debug_upstreams():
    return {
        "API_BASE": config.API_BASE,
        "VOLUME_URL": config.VOLUME_URL,
        "FUNDING_URL": config.FUNDING_URL,
        "EXCHANGE_INFO_URL": config.EXCHANGE_INFO_URL
    }, 200


@app.route('/')
def home():
    """Public home page - redirects to login or dashboard"""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    else:
        return redirect(url_for('auth.login'))


@app.route('/dashboard')
@login_required
def dashboard():
    """
    Main dashboard page (requires authentication).

    Users must be logged in to access the dashboard.
    Tier-specific features are enforced via API routes and frontend.
    """
    return render_template('dashboard.html', user=current_user, config=config)


@app.route('/pricing')
def pricing():
    """
    Pricing/tiers comparison page.

    Shows all available tiers (Free, Pro, Elite) with feature comparisons.
    Accessible by both authenticated and guest users.
    """
    return render_template('pricing.html')


@app.route('/upgrade/<int:tier>')
@login_required
def upgrade(tier):
    """
    Upgrade user to a specific tier (stub for payment integration).

    Args:
        tier: Target tier level (1=Pro, 2=Elite)

    Returns:
        Redirect to payment page (future) or success message
    """
    from flask import flash, redirect, url_for

    if tier not in [1, 2]:
        flash('❌ Invalid tier selection.', 'error')
        return redirect(url_for('pricing'))

    if tier <= current_user.tier:
        flash('ℹ️ You are already on this tier or higher.', 'info')
        return redirect(url_for('pricing'))

    # TODO: Integrate with Stripe/PayPal in future
    # For now, show a message
    tier_names = {1: 'Pro', 2: 'Elite'}
    flash(
        f'🚀 Upgrade to {tier_names[tier]} tier! Payment integration coming soon. '
        f'For now, contact support to upgrade your account.',
        'info'
    )
    return redirect(url_for('pricing'))


@app.route('/downgrade/<int:tier>')
@login_required
def downgrade(tier):
    """
    Downgrade user to a specific tier.

    Args:
        tier: Target tier level (0=Free, 1=Pro)

    Returns:
        Redirect with confirmation message
    """
    from flask import flash, redirect, url_for

    if tier not in [0, 1]:
        flash('❌ Invalid tier selection.', 'error')
        return redirect(url_for('pricing'))

    if tier >= current_user.tier:
        flash('ℹ️ You are already on this tier or lower.', 'info')
        return redirect(url_for('pricing'))

    # TODO: Add confirmation step and subscription cancellation
    tier_names = {0: 'Free', 1: 'Pro'}
    flash(
        f'ℹ️ To downgrade to {tier_names[tier]} tier, please contact support. '
        f'We want to make sure you know what features you\'ll lose.',
        'info'
    )
    return redirect(url_for('pricing'))


@app.route('/profile')
@login_required
def profile():
    """
    User profile/settings page.

    Shows account details, tier information, and settings options.
    """
    return render_template('profile.html')


@app.route('/change-password', methods=['POST'])
@login_required
def change_password():
    """
    Change user password.

    Validates current password, updates to new password.
    """
    from flask import flash, redirect, url_for

    current_password = request.form.get('current_password', '')
    new_password = request.form.get('new_password', '')
    confirm_password = request.form.get('confirm_password', '')

    # Validation
    if not current_user.check_password(current_password):
        flash('❌ Current password is incorrect.', 'error')
        return redirect(url_for('profile'))

    if len(new_password) < 8:
        flash('❌ New password must be at least 8 characters long.', 'error')
        return redirect(url_for('profile'))

    if new_password != confirm_password:
        flash('❌ New passwords do not match.', 'error')
        return redirect(url_for('profile'))

    try:
        # Update password
        current_user.set_password(new_password)
        db.session.commit()

        # Log password change
        app.logger.info(f"🔒 Password changed for user: {current_user.email}")

        flash('✅ Password updated successfully!', 'success')
    except Exception as e:
        db.session.rollback()
        app.logger.error(
            f"❌ Password change failed for {current_user.email}: {e}")
        flash(f'❌ Failed to update password: {str(e)}', 'error')

    return redirect(url_for('profile'))


# Theme preference route removed - using dark mode only


@app.route('/api/data')
def get_data():
    """
    API endpoint to fetch data (with server-side caching).

    Applies tier-specific limits:
    - Free: Top 50 assets only, basic columns
    - Pro/Elite: All assets, additional columns (price change %, OI, liquidation risk)

    Performance: Returns cached data immediately (< 50ms), refreshes in background
    """
    try:
        # Determine if user has Pro metrics access
        include_pro_metrics = False
        if current_user.is_authenticated:
            tier = current_user.tier
            # Pro and Elite users get additional metrics
            include_pro_metrics = config.has_feature(
                tier, 'additional_metrics')

        # Get cached data (instant response!)
        data, last_update = data_manager.get_cached_data(
            include_pro_metrics=include_pro_metrics)

        # Trigger background refresh if cache is old
        cache_age = (datetime.now(timezone.utc) -
                     last_update).total_seconds() if last_update else 999999
        if cache_age > CACHE_MINUTES * 60:  # Cache older than configured minutes
            # Refresh in background thread (non-blocking)
            threading.Thread(
                target=data_manager.refresh_cache_background,
                daemon=True
            ).start()
            app.logger.info(
                f"🔄 Cache is {cache_age:.0f}s old, refreshing in background")

        # Apply tier-based limits
        if current_user.is_authenticated:
            tier = current_user.tier
            tier_config = config.get_tier_config(tier)

            # Free tier: limit to top 50 assets by volume
            if tier == config.TIERS['free']:
                watchlist_limit = tier_config.get('watchlist_limit', 50)
                data = data[:watchlist_limit]
        else:
            # Guest users: treat as Free tier
            data = data[:50]

        return jsonify({
            'success': True,
            'data': data,
            'timestamp': last_update.isoformat() if last_update else datetime.now(timezone.utc).isoformat(),
            'cache_age_seconds': int(cache_age) if last_update else 0,
            'tier': current_user.tier if current_user.is_authenticated else 0,
            'limited': (current_user.is_authenticated and current_user.tier == 0) or not current_user.is_authenticated,
            'has_pro_metrics': include_pro_metrics
        })
    except Exception as e:
        app.logger.error(f"Error in get_data: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/watchlist')
def get_watchlist():
    """
    API endpoint to get TradingView watchlist.

    Applies tier-specific limits:
    - Free: Top 50 symbols, .txt format only
    - Pro/Elite: Unlimited symbols, supports CSV/JSON formats

    Query parameters:
    - format: 'txt' (default), 'csv', or 'json'
    """
    try:
        # Get requested format
        export_format = request.args.get('format', 'txt').lower()

        # Check if user has enhanced export feature
        has_enhanced_export = False
        if current_user.is_authenticated:
            tier = current_user.tier
            has_enhanced_export = config.has_feature(tier, 'enhanced_export')

        # Restrict format based on tier
        if export_format in ['csv', 'json'] and not has_enhanced_export:
            return jsonify({
                'success': False,
                'error': 'CSV/JSON export is only available for Pro and Elite tiers',
                'tier': current_user.tier if current_user.is_authenticated else 0
            }), 403

        # Determine if user has Pro metrics access
        include_pro_metrics = False
        if current_user.is_authenticated:
            include_pro_metrics = config.has_feature(
                current_user.tier, 'additional_metrics')

        # Fetch data
        data = data_manager.fetch_data(include_pro_metrics=include_pro_metrics)

        # Apply tier-based limits
        if current_user.is_authenticated:
            tier = current_user.tier
            tier_config = config.get_tier_config(tier)
            watchlist_limit = tier_config.get('watchlist_limit')

            # Free tier: limit to top 50
            if watchlist_limit is not None:
                data = data[:watchlist_limit]
        else:
            # Guest users: treat as Free tier
            data = data[:50]

        # Generate output based on format
        if export_format == 'txt':
            # TradingView watchlist format
            symbols = [f"BINANCE:{item['asset']}USDT.P" for item in data]
            return jsonify({
                'success': True,
                'watchlist': '\n'.join(symbols),
                'count': len(symbols),
                'format': 'txt',
                'tier': current_user.tier if current_user.is_authenticated else 0,
                'limited': (current_user.is_authenticated and current_user.tier == 0) or not current_user.is_authenticated
            })

        elif export_format == 'csv':
            # CSV export with all available columns
            df = pd.DataFrame(data)
            csv_data = df.to_csv(index=False)

            response = make_response(csv_data)
            response.headers['Content-Type'] = 'text/csv'
            response.headers['Content-Disposition'] = 'attachment; filename=binance_watchlist.csv'
            return response

        elif export_format == 'json':
            # JSON export with all data
            return jsonify({
                'success': True,
                'data': data,
                'count': len(data),
                'format': 'json',
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'tier': current_user.tier if current_user.is_authenticated else 0
            })

        else:
            return jsonify({
                'success': False,
                'error': f'Unsupported format: {export_format}. Use txt, csv, or json.'
            }), 400

    except Exception as e:
        app.logger.error(f"Error in get_watchlist: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/user')
def get_user_info():
    """
    API endpoint to get current user's tier information.

    Used by frontend to determine refresh interval and feature availability.
    """
    try:
        if current_user.is_authenticated:
            tier = current_user.tier
            tier_config = config.get_tier_config(tier)

            return jsonify({
                'authenticated': True,
                'tier': tier,
                'tier_name': current_user.tier_name,
                'refresh_interval': tier_config.get('refresh_ms'),
                'features': tier_config.get('features', {})
            })
        else:
            # Guest user - return Free tier settings
            return jsonify({
                'authenticated': False,
                'tier': 0,
                'tier_name': 'Free',
                'refresh_interval': config.FREE_TIER['refresh_ms'],
                'features': config.FREE_TIER['features']
            })
    except Exception as e:
        app.logger.error(f"Error in get_user_info: {e}")
        return jsonify({
            'authenticated': False,
            'error': str(e)
        }), 500


@app.route('/api/alerts')
def get_alerts():
    """
    API endpoint to get alerts.

    Applies tier-specific limits:
    - Free: Last 10 alerts
    - Pro: Last 30 alerts
    - Elite: Unlimited alerts
    """
    try:
        # Get tier-specific alert limit
        if current_user.is_authenticated:
            tier = current_user.tier
            alert_limit = config.get_alert_limit(tier)
        else:
            # Guest users: treat as Free tier
            alert_limit = 10

        # Get alerts (already limited to last 30 in scan_alerts)
        alerts_to_show = alerts

        # Apply tier limit
        if alert_limit is not None:
            alerts_to_show = alerts[-alert_limit:]

        # Convert datetime objects to strings for JSON serialization
        alerts_data = []
        for timestamp, message in alerts_to_show:
            alerts_data.append({
                'timestamp': timestamp.isoformat(),
                'message': message
            })

        return jsonify({
            'success': True,
            'alerts': alerts_data,
            'count': len(alerts_data),
            'tier': current_user.tier if current_user.is_authenticated else 0,
            'limited': alert_limit is not None,
            'limit': alert_limit
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })


# ──────────────────────────────────────────────────────────────
# DEBUG ROUTES (for testing database functionality)
# Only enabled in development mode
# ──────────────────────────────────────────────────────────────

if config.FEATURE_FLAGS.get('enable_debug_routes', False):
    @app.route('/debug/db')
    def debug_db():
        """Debug route to test database functionality."""
        try:
            # Get all users
            users = User.query.all()
            user_count = len(users)

            return jsonify({
                'success': True,
                'database_uri': app.config['SQLALCHEMY_DATABASE_URI'],
                'user_count': user_count,
                'users': [user.to_dict(include_sensitive=True) for user in users],
                'message': f'✅ Database is working! Found {user_count} user(s).'
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e),
                'message': '❌ Database error - see error details above'
            }), 500

    @app.route('/debug/create-user')
    def debug_create_user():
        """
        Debug route to create a test user.

        Usage: /debug/create-user?email=test@example.com&password=testpass&tier=0
        """
        try:
            # Get parameters from query string
            email = request.args.get('email', 'test@example.com')
            password = request.args.get('password', 'testpassword123')
            tier = int(request.args.get('tier', 0))

            # Check if user already exists
            existing_user = get_user_by_email(email)
            if existing_user:
                return jsonify({
                    'success': False,
                    'message': f'❌ User with email {email} already exists!',
                    'user': existing_user.to_dict(include_sensitive=True)
                }), 400

            # Create new user
            new_user = User(
                email=email,
                tier=tier,
                is_active=True,
                theme_preference='dark'
            )
            new_user.set_password(password)

            # Add to database
            db.session.add(new_user)
            db.session.commit()

            # Create default alert preferences
            alert_prefs = create_default_alert_preferences(new_user)
            db.session.add(alert_prefs)
            db.session.commit()

            return jsonify({
                'success': True,
                'message': f'✅ User created successfully!',
                'user': new_user.to_dict(include_sensitive=True),
                'alert_preferences': alert_prefs.to_dict()
            })

        except Exception as e:
            db.session.rollback()
            return jsonify({
                'success': False,
                'error': str(e),
                'message': '❌ Failed to create user'
            }), 500

    @app.route('/debug/delete-user')
    def debug_delete_user():
        """
        Debug route to delete a test user.

        Usage: /debug/delete-user?email=test@example.com
        """
        try:
            email = request.args.get('email')

            if not email:
                return jsonify({
                    'success': False,
                    'message': '❌ Please provide email parameter'
                }), 400

            user = get_user_by_email(email)

            if not user:
                return jsonify({
                    'success': False,
                    'message': f'❌ User with email {email} not found'
                }), 404

            user_data = user.to_dict(include_sensitive=True)

            # Delete user (cascade will delete alert_preferences)
            db.session.delete(user)
            db.session.commit()

            return jsonify({
                'success': True,
                'message': f'✅ User {email} deleted successfully!',
                'deleted_user': user_data
            })

        except Exception as e:
            db.session.rollback()
            return jsonify({
                'success': False,
                'error': str(e),
                'message': '❌ Failed to delete user'
            }), 500

    @app.route('/debug/test-password')
    def debug_test_password():
        """
        Debug route to test password verification.

        Usage: /debug/test-password?email=test@example.com&password=testpass
        """
        try:
            email = request.args.get('email')
            password = request.args.get('password')

            if not email or not password:
                return jsonify({
                    'success': False,
                    'message': '❌ Please provide both email and password parameters'
                }), 400

            user = get_user_by_email(email)

            if not user:
                return jsonify({
                    'success': False,
                    'message': f'❌ User with email {email} not found'
                }), 404

            password_valid = user.check_password(password)

            return jsonify({
                'success': True,
                'password_valid': password_valid,
                'message': '✅ Password is correct!' if password_valid else '❌ Password is incorrect!',
                'user': user.to_dict(include_sensitive=True)
            })

        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e),
                'message': '❌ Failed to test password'
            }), 500

    @app.route('/debug/upgrade-tier')
    def debug_upgrade_tier():
        """
        Debug route to upgrade/downgrade user tier.

        Usage: /debug/upgrade-tier?email=test@example.com&tier=1
        """
        try:
            email = request.args.get('email')
            new_tier = request.args.get('tier', type=int)

            if not email or new_tier is None:
                return jsonify({
                    'success': False,
                    'message': '❌ Please provide both email and tier parameters'
                }), 400

            if new_tier not in [0, 1, 2]:
                return jsonify({
                    'success': False,
                    'message': '❌ Tier must be 0 (Free), 1 (Pro), or 2 (Elite)'
                }), 400

            user = get_user_by_email(email)

            if not user:
                return jsonify({
                    'success': False,
                    'message': f'❌ User with email {email} not found'
                }), 404

            old_tier = user.tier
            old_tier_name = user.tier_name

            # Update tier
            if new_tier > user.tier:
                user.upgrade_tier(new_tier)
            elif new_tier < user.tier:
                user.downgrade_tier(new_tier)
            else:
                return jsonify({
                    'success': True,
                    'message': f'ℹ️ User is already on tier {new_tier} ({user.tier_name})',
                    'user': user.to_dict(include_sensitive=True)
                })

            db.session.commit()

            return jsonify({
                'success': True,
                'message': f'✅ User tier updated from {old_tier_name} to {user.tier_name}!',
                'old_tier': old_tier,
                'new_tier': user.tier,
                'user': user.to_dict(include_sensitive=True)
            })

        except Exception as e:
            db.session.rollback()
            return jsonify({
                'success': False,
                'error': str(e),
                'message': '❌ Failed to update tier'
            }), 500

# ──────────────────────────────────────────────────────────────
# Phantom Ephemeral Keystore API (Server-side storage)
# ──────────────────────────────────────────────────────────────


# In-memory storage for ephemeral keys (use Redis in production)
phantom_ekey_store = {}


@app.route('/api/phantom/ekey', methods=['POST'])
def store_ekey():
    """Generate ephemeral x25519 keypair and return sid + public key"""
    try:
        import nacl.public
        import nacl.encoding
        import base58
        import secrets

        # Generate ephemeral x25519 keypair on server
        priv_key = nacl.public.PrivateKey.generate()
        pub_key = priv_key.public_key

        # Generate unique sid
        sid = base58.b58encode(secrets.token_bytes(16)).decode('ascii')

        # Store private key with 5-minute TTL
        phantom_ekey_store[sid] = {
            'priv_key': priv_key,  # Store nacl.public.PrivateKey object
            'expires': time.time() + 300  # 5 minutes
        }

        # Return sid and base58-encoded public key
        dapp_pub58 = base58.b58encode(bytes(pub_key)).decode('ascii')

        app.logger.info(f'🔑 Ephemeral keypair generated for sid: {sid[:8]}...')
        return jsonify({'sid': sid, 'dapp_encryption_public_key': dapp_pub58})

    except Exception as e:
        app.logger.error(f'❌ Store ekey error: {str(e)}')
        return jsonify({'error': str(e)}), 500


# ──────────────────────────────────────────────────────────────
# Phantom UL Sign Endpoints (Server-side session management)
# ──────────────────────────────────────────────────────────────

# In-memory storage for user sessions (use Redis in production)
phantom_sessions = {}


@app.route('/api/phantom/session', methods=['POST'])
def set_phantom_session():
    """Decrypt Phantom payload and create authenticated session"""
    try:
        import nacl.public
        import base58
        import json

        data = request.get_json() or {}
        sid = data.get('sid')
        phantom_pub58 = data.get('phantom_encryption_public_key')
        data58 = data.get('data')
        nonce58 = data.get('nonce')

        if not all([sid, phantom_pub58, data58, nonce58]):
            return jsonify({'error': 'missing required params'}), 400

        # Retrieve ephemeral private key
        key_store = phantom_ekey_store.get(sid)
        if not key_store or key_store['expires'] < time.time():
            return jsonify({'error': 'sid expired or not found'}), 410

        dapp_priv = key_store['priv_key']

        # Clean up ephemeral key (one-time use)
        phantom_ekey_store.pop(sid, None)

        # Decode Phantom's return params
        try:
            phantom_pub = nacl.public.PublicKey(
                base58.b58decode(phantom_pub58))
            data_bytes = base58.b58decode(data58)
            nonce_bytes = base58.b58decode(nonce58)
        except Exception as e:
            return jsonify({'error': f'base58 decode error: {str(e)}'}), 400

        # Decrypt payload using NaCl Box
        try:
            box = nacl.public.Box(dapp_priv, phantom_pub)
            plaintext = box.decrypt(data_bytes, nonce_bytes)
            payload = json.loads(plaintext.decode('utf-8'))
        except Exception as e:
            return jsonify({'error': f'decryption error: {str(e)}'}), 400

        # Extract wallet public key from payload
        wallet_pub58 = payload.get('public_key') or payload.get(
            'wallet_pubkey') or payload.get('wallet') or 'unknown'

        # Find or create User for Solana wallet (same pattern as EVM wallets)
        from models import User
        from flask_login import login_user
        from datetime import datetime, timezone
        import secrets as sec

        user = User.query.filter_by(wallet_address=wallet_pub58).first()

        if not user:
            # Create new user with Solana wallet address
            app.logger.info(
                f"✨ Creating new user for Solana wallet: {wallet_pub58[:8]}...")

            user = User(
                # Dummy email for Solana wallet users
                email=f"{wallet_pub58.lower()}@solana.wallet.local",
                wallet_address=wallet_pub58,
                tier=0,  # Free tier
                is_active=True,
                email_confirmed=True,  # Wallet users don't need email confirmation
                email_confirmed_at=datetime.now(timezone.utc),
                theme_preference='dark'
            )
            # Set a random password (won't be used, but required by model)
            user.set_password(sec.token_hex(32))

            db.session.add(user)
            db.session.commit()

            # Create default alert preferences
            from auth import create_default_alert_preferences
            alert_prefs = create_default_alert_preferences(user)
            db.session.add(alert_prefs)
            db.session.commit()

            app.logger.info(
                f"✅ New Solana wallet user created: {wallet_pub58[:8]}...")

        # Log user in with Flask-Login (this creates the session Flask expects!)
        login_user(user, remember=True)

        # Also store in phantom_sessions for backward compatibility
        session_token = base58.b58encode(sec.token_bytes(24)).decode('ascii')
        phantom_sessions[session_token] = {
            'wallet_pub58': wallet_pub58,
            'ts': time.time(),
            'user': {'wallet_pub58': wallet_pub58, 'tier': user.tier, 'tier_name': user.tier_name}
        }

        app.logger.info(
            f'🔐 Phantom session + Flask-Login created for wallet: {wallet_pub58[:8]}... (Tier: {user.tier_name})')

        return jsonify({'ok': True, 'user': {'wallet_pub58': wallet_pub58, 'tier': user.tier, 'tier_name': user.tier_name}})

    except Exception as e:
        app.logger.error(f'❌ Set session error: {str(e)}')
        return jsonify({'error': str(e)}), 500


@app.route('/api/me', methods=['GET'])
def me():
    """Check authentication status via Flask-Login"""
    try:
        from flask_login import current_user

        # Check if user is authenticated via Flask-Login (works for both EVM and Solana wallets)
        if current_user.is_authenticated:
            return jsonify({
                'authenticated': True,
                'user': {
                    'wallet_pub58': current_user.wallet_address,
                    'email': current_user.email,
                    'tier': current_user.tier,
                    'tier_name': current_user.tier_name
                },
                'wallet_pub58': current_user.wallet_address
            })

        return jsonify({'authenticated': False}), 401

    except Exception as e:
        app.logger.error(f'❌ Me endpoint error: {str(e)}')
        return jsonify({'authenticated': False, 'error': str(e)}), 500


@app.route('/api/phantom/ul/sign-message', methods=['GET'])
def ul_sign_message():
    """Build UL for signMessage with encrypted payload"""
    try:
        msg_b64 = request.args.get('msg_b64')
        if not msg_b64:
            return jsonify({'error': 'missing msg_b64'}), 400

        # Get session data from cookie
        phantom_pubkey = request.cookies.get('phantom_pubkey')
        if not phantom_pubkey:
            return jsonify({'error': 'not authenticated'}), 401

        session_data = phantom_sessions.get(phantom_pubkey)
        if not session_data:
            return jsonify({'error': 'session not found'}), 404

        # Decode message
        import base64
        message = base64.b64decode(msg_b64)

        # For now, return a simple redirect to show the flow works
        # In production, you'd encrypt the message with the shared secret
        # and build the proper UL with encrypted payload

        app.logger.info(
            f'📝 UL sign-message requested for: {phantom_pubkey[:8]}...')

        # Simple redirect for testing (replace with proper UL construction)
        return redirect(f'/phantom-redirect?ul_sign=success&msg={msg_b64[:20]}...', code=302)

    except Exception as e:
        app.logger.error(f'❌ UL sign-message error: {str(e)}')
        return jsonify({'error': str(e)}), 500

# ──────────────────────────────────────────────────────────────
# Pro Tier: Payment Routes
# ──────────────────────────────────────────────────────────────


@app.route('/create-checkout')
@login_required
def create_checkout():
    """Create Stripe checkout session for subscription upgrade"""
    try:
        tier = request.args.get('tier', type=int)
        billing_cycle = request.args.get('billing_cycle', 'monthly')

        if not tier or tier not in [1, 2]:  # 1=Pro, 2=Elite
            flash('❌ Invalid tier selected.', 'error')
            return redirect(url_for('pricing'))

        if billing_cycle not in ['monthly', 'yearly']:
            flash('❌ Invalid billing cycle selected.', 'error')
            return redirect(url_for('pricing'))

        # Check if user already has an active subscription
        from models import get_active_subscription
        active_sub = get_active_subscription(current_user)
        if active_sub and active_sub.status in ['active', 'trialing']:
            flash('ℹ️ You already have an active subscription.', 'info')
            return redirect(url_for('profile'))

        # Create Stripe checkout session
        success_url = url_for('payment_success', _external=True)
        cancel_url = url_for('payment_canceled', _external=True)

        app.logger.info(
            f"Creating checkout for user: {current_user.email} (ID: {current_user.id})")
        session_id, error = payments.create_checkout_session(
            user=current_user,
            tier=tier,
            billing_cycle=billing_cycle,
            success_url=success_url,
            cancel_url=cancel_url
        )

        if session_id:
            # Get the checkout session URL from Stripe
            import stripe
            checkout_session = stripe.checkout.Session.retrieve(session_id)
            return redirect(checkout_session.url, code=303)
        else:
            flash(f'❌ Failed to create checkout session: {error}', 'error')
            return redirect(url_for('pricing'))

    except Exception as e:
        app.logger.error(f"Error creating checkout session: {str(e)}")
        flash('❌ An error occurred. Please try again.', 'error')
        return redirect(url_for('pricing'))


@limiter.exempt  # ✅ Exempt Stripe webhooks from rate limiting
@app.route('/webhook/stripe', methods=['POST'])
def stripe_webhook():
    """Handle Stripe webhook events"""
    try:
        payload = request.get_data()
        sig_header = request.headers.get('Stripe-Signature')

        if not sig_header:
            app.logger.warning("Missing Stripe-Signature header")
            return jsonify({'error': 'Missing signature'}), 400

        # Verify webhook signature and process event
        success, error = payments.handle_webhook(payload, sig_header)

        if success:
            return jsonify({'success': True}), 200
        else:
            app.logger.error(f"Webhook processing failed: {error}")
            return jsonify({'error': error or 'Webhook processing failed'}), 400

    except Exception as e:
        app.logger.error(f"Webhook error: {str(e)}")
        return jsonify({'error': 'Webhook processing failed'}), 500


@app.route('/payment/success')
@login_required
def payment_success():
    """Handle successful payment"""
    try:
        session_id = request.args.get('session_id')
        # The webhook should have already processed this, but we can show success
        flash('🎉 Payment successful! Your subscription is now active.', 'success')

        return redirect(url_for('index'))

    except Exception as e:
        app.logger.error(f"Payment success error: {str(e)}")
        flash('✅ Payment completed! Your subscription is being activated.', 'success')
        return redirect(url_for('index'))


@app.route('/payment/canceled')
@login_required
def payment_canceled():
    """Handle canceled payment"""
    flash('ℹ️ Payment was canceled. You can try again anytime.', 'info')
    return redirect(url_for('pricing'))


@app.route('/cancel-subscription', methods=['POST'])
@login_required
def cancel_subscription_route():
    """Cancel user's subscription"""
    try:
        success = payments.cancel_subscription(current_user.id)

        if success:
            flash('✅ Subscription canceled. You will retain access until the end of your billing period.', 'success')
        else:
            flash('❌ Failed to cancel subscription. Please contact support.', 'error')

        return redirect(url_for('profile'))

    except Exception as e:
        app.logger.error(f"Cancel subscription error: {str(e)}")
        flash('❌ An error occurred. Please contact support.', 'error')
        return redirect(url_for('profile'))


@app.route('/manage-subscription')
@login_required
def manage_subscription():
    """Redirect to Stripe Customer Portal"""
    try:
        portal_url = payments.get_stripe_portal_url(current_user.id)

        if portal_url:
            return redirect(portal_url, code=303)
        else:
            flash(
                '❌ Unable to access subscription management. Please contact support.', 'error')
            return redirect(url_for('profile'))

    except Exception as e:
        app.logger.error(f"Manage subscription error: {str(e)}")
        flash('❌ An error occurred. Please contact support.', 'error')
        return redirect(url_for('profile'))


# ──────────────────────────────────────────────────────────────
# Run the app
# ──────────────────────────────────────────────────────────────


if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 8081))
    debug = os.environ.get('FLASK_ENV') != 'production'
    app.run(debug=debug, host='0.0.0.0', port=port)

# Diagnostic test route


@app.route('/test-scroll')
def test_scroll():
    """Test page for diagnosing mobile scroll issues."""
    return render_template('test_scroll.html')

# Layout debug route


@app.route('/debug-layout')
def debug_layout():
    """Debug page for testing responsive layout."""
    return render_template('debug_layout.html')

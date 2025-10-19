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

from flask import Flask, render_template, jsonify, request
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

# Import configuration (centralized tier settings)
import config

# Import database models
from models import db, User, AlertPreferences, get_user_by_email, create_default_alert_preferences

# Import authentication module
from auth import init_auth

# ──────────────────────────────────────────────────────────────
# Constants & settings (now loaded from config)
# ──────────────────────────────────────────────────────────────
API = config.API_BASE
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

# Flask configuration from config module
app.config['SECRET_KEY'] = config.SECRET_KEY
app.config['SQLALCHEMY_DATABASE_URI'] = config.DATABASE_URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SESSION_COOKIE_NAME'] = config.SESSION_COOKIE_NAME
app.config['SESSION_COOKIE_SECURE'] = config.SESSION_COOKIE_SECURE
app.config['SESSION_COOKIE_HTTPONLY'] = config.SESSION_COOKIE_HTTPONLY
app.config['SESSION_COOKIE_SAMESITE'] = config.SESSION_COOKIE_SAMESITE
app.config['PERMANENT_SESSION_LIFETIME'] = config.PERMANENT_SESSION_LIFETIME

# Initialize database with Flask app
db.init_app(app)

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

# ──────────────────────────────────────────────────────────────
# Logging Configuration
# ──────────────────────────────────────────────────────────────

# Create logs directory if it doesn't exist
if not os.path.exists('logs'):
    os.makedirs('logs')

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

# Log startup
app.logger.info("="*70)
app.logger.info("🚀 Binance Dashboard Starting Up")
app.logger.info(f"Database: {config.DATABASE_URI}")
app.logger.info(
    f"Environment: {'Production' if not app.debug else 'Development'}")
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
    retry_strategy = Retry(
        total=5,
        backoff_factor=2,
        status_forcelist=[429, 451, 500, 502, 503, 504],
        raise_on_status=False
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session

# ──────────────────────────────────────────────────────────────
# Data management
# ──────────────────────────────────────────────────────────────


class DataManager:
    """Handles data fetching and caching."""

    def __init__(self):
        self.session = create_robust_session()
        self.active_syms = set()
        self.cached_data = []
        self.last_update = None

    def fetch_active_symbols(self) -> set[str]:
        """Fetch and cache active trading symbols."""
        try:
            response = self.session.get(EXCHANGE_INFO_URL, timeout=15)
            response.raise_for_status()
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

    def fetch_data(self) -> List[Dict]:
        """Fetch fresh data from Binance."""
        if not self.active_syms:
            self.active_syms = self.fetch_active_symbols()

        try:
            # Fetch volume data
            volume_response = self.session.get(VOLUME_URL, timeout=15)
            volume_response.raise_for_status()
            volume_data = volume_response.json()

            # Fetch funding data
            funding_response = self.session.get(FUNDING_URL, timeout=15)
            funding_response.raise_for_status()
            funding_data = funding_response.json()

            # Create funding rate lookup
            funding_rates = {
                item["symbol"].replace("USDT", ""): float(item["lastFundingRate"]) * 100
                for item in funding_data
                if item.get("symbol", "").endswith("USDT")
            }

            # Process and filter data
            processed_data = []
            for item in volume_data:
                if (item.get("symbol", "").endswith("USDT") and
                    item["symbol"] in self.active_syms and
                        float(item.get("quoteVolume", 0)) > 100_000_000):

                    asset = item["symbol"].replace("USDT", "")
                    volume = float(item["quoteVolume"])
                    price = float(item["lastPrice"])
                    funding_rate = funding_rates.get(asset, None)

                    processed_data.append({
                        "asset": asset,
                        "volume": volume,
                        "price": price,
                        "funding_rate": funding_rate,
                        "volume_formatted": format_volume(volume),
                        "price_formatted": format_price(price),
                        "funding_formatted": format_funding_rate(funding_rate) if funding_rate is not None else "N/A"
                    })

            # Sort by volume descending
            processed_data.sort(key=lambda x: x["volume"], reverse=True)
            return processed_data

        except Exception as e:
            print(f"Failed to fetch data: {e}")
            return []


# Global data manager
data_manager = DataManager()

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
    """Scan for volume spikes and generate alerts."""
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
# Routes
# ──────────────────────────────────────────────────────────────


@app.route('/')
@login_required
def index():
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


@app.route('/update-theme-preference', methods=['POST'])
@login_required
def update_theme_preference():
    """
    Update user's theme preference.

    Saves to database for automatic application on future logins.
    """
    from flask import flash, redirect, url_for

    theme_preference = request.form.get('theme_preference', 'dark')

    if theme_preference not in ['dark', 'light']:
        flash('❌ Invalid theme preference.', 'error')
        return redirect(url_for('profile'))

    try:
        current_user.theme_preference = theme_preference
        db.session.commit()

        # Log theme change
        app.logger.info(
            f"🎨 Theme preference updated for {current_user.email}: {theme_preference}")

        flash(
            f'✅ Theme preference saved! Now using {theme_preference} mode.', 'success')
    except Exception as e:
        db.session.rollback()
        app.logger.error(
            f"❌ Theme update failed for {current_user.email}: {e}")
        flash(f'❌ Failed to update theme: {str(e)}', 'error')

    return redirect(url_for('profile'))


@app.route('/api/data')
def get_data():
    """
    API endpoint to fetch data.

    Applies tier-specific limits:
    - Free: Top 50 assets only
    - Pro/Elite: All assets
    """
    try:
        data = data_manager.fetch_data()

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
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'tier': current_user.tier if current_user.is_authenticated else 0,
            'limited': (current_user.is_authenticated and current_user.tier == 0) or not current_user.is_authenticated
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })


@app.route('/api/watchlist')
def get_watchlist():
    """
    API endpoint to get TradingView watchlist.

    Applies tier-specific limits:
    - Free: Top 50 symbols
    - Pro/Elite: Unlimited symbols
    """
    try:
        data = data_manager.fetch_data()

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

        symbols = [f"BINANCE:{item['asset']}USDT.P" for item in data]

        return jsonify({
            'success': True,
            'watchlist': '\n'.join(symbols),
            'count': len(symbols),
            'tier': current_user.tier if current_user.is_authenticated else 0,
            'limited': (current_user.is_authenticated and current_user.tier == 0) or not current_user.is_authenticated
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })


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
# Run the app
# ──────────────────────────────────────────────────────────────


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8081)

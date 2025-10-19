"""
Authentication Module for Binance Dashboard
───────────────────────────────────────────
Handles user registration, login, logout, and session management.
"""

from flask import Blueprint, render_template, redirect, url_for, request, flash, jsonify, current_app
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, create_default_alert_preferences, get_user_by_email
import config
import logging

# Get logger
logger = logging.getLogger(__name__)

# Create authentication blueprint
auth_bp = Blueprint('auth', __name__)

# Initialize Flask-Login
login_manager = LoginManager()


def init_auth(app):
    """
    Initialize authentication system with Flask app.

    Args:
        app: Flask application instance
    """
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = '🔒 Please log in to access the dashboard.'
    login_manager.login_message_category = 'info'

    # Register blueprint
    app.register_blueprint(auth_bp)


@login_manager.user_loader
def load_user(user_id):
    """
    Flask-Login user loader callback.

    Args:
        user_id: User ID from session

    Returns:
        User instance or None
    """
    return User.query.get(int(user_id))


# ══════════════════════════════════════════════════════════════════════════════
# REGISTRATION ROUTE
# ══════════════════════════════════════════════════════════════════════════════

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """
    User registration page and handler.

    GET: Display registration form
    POST: Process registration and create new user
    """
    # If already logged in, redirect to dashboard
    if current_user.is_authenticated:
        return redirect(url_for('index'))

    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        theme = request.form.get('theme', 'dark')

        # Validation
        errors = []

        if not email:
            errors.append('Email is required.')
        elif '@' not in email or '.' not in email:
            errors.append('Please enter a valid email address.')

        if not password:
            errors.append('Password is required.')
        elif len(password) < 8:
            errors.append('Password must be at least 8 characters long.')

        if password != confirm_password:
            errors.append('Passwords do not match.')

        # Check if user already exists
        if email and get_user_by_email(email):
            errors.append('An account with this email already exists.')

        # If validation fails, show errors
        if errors:
            for error in errors:
                flash(error, 'error')
            return render_template('register.html', email=email, theme=theme)

        try:
            # Create new user (default to Free tier)
            new_user = User(
                email=email,
                tier=config.TIERS['free'],
                is_active=True,
                theme_preference=theme
            )
            new_user.set_password(password)

            # Save to database
            db.session.add(new_user)
            db.session.commit()

            # Create default alert preferences
            alert_prefs = create_default_alert_preferences(new_user)
            db.session.add(alert_prefs)
            db.session.commit()

            # Log successful registration
            logger.info(
                f"✅ New user registered: {email} (Tier: Free, Theme: {theme})")
            current_app.logger.info(f"New registration: {email}")

            # Auto-login after registration
            login_user(new_user, remember=True)

            flash(
                f'🎉 Welcome to Binance Dashboard! Your Free tier account has been created.', 'success')
            return redirect(url_for('index'))

        except Exception as e:
            db.session.rollback()
            logger.error(f"❌ Registration failed for {email}: {str(e)}")
            flash(f'❌ Registration failed: {str(e)}', 'error')
            return render_template('register.html', email=email, theme=theme)

    # GET request - show registration form
    return render_template('register.html')


# ══════════════════════════════════════════════════════════════════════════════
# LOGIN ROUTE
# ══════════════════════════════════════════════════════════════════════════════

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """
    User login page and handler.

    GET: Display login form
    POST: Authenticate user and create session
    """
    # If already logged in, redirect to dashboard
    if current_user.is_authenticated:
        return redirect(url_for('index'))

    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        remember = request.form.get('remember', False) == 'on'

        # Validation
        if not email or not password:
            flash('❌ Please enter both email and password.', 'error')
            return render_template('login.html', email=email)

        # Find user
        user = get_user_by_email(email)

        if not user:
            flash('❌ Invalid email or password.', 'error')
            return render_template('login.html', email=email)

        # Check if account is active
        if not user.is_active:
            flash('❌ Your account has been deactivated. Please contact support.', 'error')
            return render_template('login.html', email=email)

        # Verify password
        if not user.check_password(password):
            flash('❌ Invalid email or password.', 'error')
            return render_template('login.html', email=email)

        # Login successful
        login_user(user, remember=remember)

        # Log successful login
        logger.info(f"✅ User logged in: {email} (Tier: {user.tier_name})")
        current_app.logger.info(f"Login: {email} (Tier: {user.tier})")

        # Get the page they were trying to access (or default to dashboard)
        next_page = request.args.get('next')
        if not next_page or not next_page.startswith('/'):
            next_page = url_for('index')

        flash(
            f'✅ Welcome back, {user.email}! You are on the {user.tier_name} tier.', 'success')
        return redirect(next_page)

    # GET request - show login form
    return render_template('login.html')


# ══════════════════════════════════════════════════════════════════════════════
# LOGOUT ROUTE
# ══════════════════════════════════════════════════════════════════════════════

@auth_bp.route('/logout')
@login_required
def logout():
    """
    Log out the current user and clear session.
    """
    email = current_user.email
    tier = current_user.tier_name

    logout_user()

    # Log logout
    logger.info(f"👋 User logged out: {email} (was Tier: {tier})")
    current_app.logger.info(f"Logout: {email}")

    flash('👋 You have been logged out successfully.', 'info')
    return redirect(url_for('auth.login'))


# ══════════════════════════════════════════════════════════════════════════════
# API ENDPOINTS (for JavaScript)
# ══════════════════════════════════════════════════════════════════════════════

@auth_bp.route('/api/user')
def api_user():
    """
    API endpoint to get current user information.
    Used by JavaScript to check authentication status and tier.

    Returns:
        JSON with user data or guest status
    """
    if current_user.is_authenticated:
        return jsonify({
            'authenticated': True,
            'user': current_user.to_dict(include_sensitive=False),
            'tier': current_user.tier,
            'tier_name': current_user.tier_name,
            'theme_preference': current_user.theme_preference,
            'is_free': current_user.is_free_tier,
            'is_pro': current_user.is_pro_tier,
            'is_elite': current_user.is_elite_tier,
            'refresh_interval': config.get_refresh_interval(current_user.tier)
        })
    else:
        # Guest user (not logged in) - defaults to Free tier limits
        return jsonify({
            'authenticated': False,
            'user': None,
            'tier': 0,
            'tier_name': 'Guest',
            'theme_preference': 'dark',
            'is_free': True,
            'is_pro': False,
            'is_elite': False,
            'refresh_interval': config.FREE_TIER['refresh_ms']
        })


@auth_bp.route('/api/check-auth')
def api_check_auth():
    """
    Quick authentication check endpoint.

    Returns:
        JSON with minimal auth status
    """
    return jsonify({
        'authenticated': current_user.is_authenticated,
        'tier': current_user.tier if current_user.is_authenticated else 0
    })

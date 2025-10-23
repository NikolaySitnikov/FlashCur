"""
Authentication Module for Binance Dashboard
───────────────────────────────────────────
Handles user registration, login, logout, and session management.
"""

from flask import Blueprint, render_template, redirect, url_for, request, flash, jsonify, current_app
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, create_default_alert_preferences, get_user_by_email
from datetime import datetime, timezone
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
            return render_template('register.html', email=email)

        try:
            # Create new user (default to Free tier)
            # New users start with email_confirmed=False (will be confirmed via email)
            new_user = User(
                email=email,
                tier=config.TIERS['free'],
                is_active=True,
                email_confirmed=False  # Require email confirmation for new users
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
                f"✅ New user registered: {email} (Tier: Free)")
            current_app.logger.info(f"New registration: {email}")

            # Send confirmation email
            from email_utils import send_confirmation_email, is_email_configured
            from flask_mail import Mail

            # Check if email is configured
            if is_email_configured():
                try:
                    mail = Mail(current_app)
                    # Use request host for dynamic IP support (works on any network)
                    base_url = f"http://{request.host}"
                    success, error = send_confirmation_email(
                        new_user, mail, base_url)

                    if success:
                        logger.info(f"📧 Confirmation email sent to {email}")
                        flash(
                            f'🎉 Account created! Check your email ({email}) to confirm your account.',
                            'success'
                        )
                    else:
                        logger.warning(
                            f"⚠️ Failed to send confirmation email to {email}: {error}")
                        flash(
                            f'✅ Account created, but we couldn\'t send the confirmation email. '
                            f'You can still log in, but email features may be limited.',
                            'warning'
                        )
                except Exception as email_error:
                    logger.error(
                        f"❌ Error sending confirmation email: {str(email_error)}")
                    flash(
                        f'✅ Account created! Email confirmation failed, but you can still log in.',
                        'warning'
                    )
            else:
                # Email not configured (development mode)
                logger.warning(
                    f"⚠️ Email not configured - skipping confirmation email for {email}")
                # Auto-confirm in development if email is not configured
                new_user.email_confirmed = True
                new_user.email_confirmed_at = datetime.now(timezone.utc)
                db.session.commit()
                flash(
                    f'🎉 Welcome to Binance Dashboard! Your Free tier account has been created.',
                    'success'
                )

            # Auto-login after registration
            login_user(new_user, remember=True)
            return redirect(url_for('index'))

        except Exception as e:
            db.session.rollback()
            logger.error(f"❌ Registration failed for {email}: {str(e)}")
            flash(f'❌ Registration failed: {str(e)}', 'error')
            return render_template('register.html', email=email)

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


# ══════════════════════════════════════════════════════════════════════════════
# EMAIL CONFIRMATION ROUTES (Pro Tier Step 2)
# ══════════════════════════════════════════════════════════════════════════════

@auth_bp.route('/confirm/<token>')
def confirm_email(token):
    """
    Email confirmation endpoint.
    Verifies token and confirms user's email address.

    Args:
        token: URL-safe confirmation token

    Returns:
        Redirect to login or dashboard with flash message
    """
    from email_utils import confirm_token

    # Verify token and get email
    email = confirm_token(token)

    if email is None:
        flash('❌ The confirmation link is invalid or has expired (1 hour limit).', 'error')
        return redirect(url_for('auth.login'))

    # Find user
    user = get_user_by_email(email)

    if not user:
        flash('❌ User not found. Please register again.', 'error')
        return redirect(url_for('auth.register'))

    # Check if already confirmed
    if user.email_confirmed:
        flash('✅ Email already confirmed! You can log in.', 'info')
        return redirect(url_for('auth.login'))

    # Confirm email
    try:
        user.email_confirmed = True
        user.email_confirmed_at = datetime.now(timezone.utc)
        db.session.commit()

        logger.info(f"✅ Email confirmed for user: {email}")

        flash(
            '🎉 Email confirmed successfully! Your account is now active.',
            'success'
        )

        # If user is not logged in, redirect to login
        if not current_user.is_authenticated:
            return redirect(url_for('auth.login'))

        # If already logged in, redirect to dashboard
        return redirect(url_for('index'))

    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Error confirming email for {email}: {str(e)}")
        flash(f'❌ Error confirming email: {str(e)}', 'error')
        return redirect(url_for('auth.login'))


@auth_bp.route('/resend-confirmation', methods=['POST'])
@login_required
def resend_confirmation():
    """
    Resend confirmation email to current user.
    Only works if user is logged in but email not confirmed.

    Returns:
        JSON response with success status
    """
    # Log at the very start to confirm request is received
    logger.info(
        f"📧 RESEND EMAIL REQUEST received for user: {current_user.email}")

    from email_utils import send_confirmation_email

    # Check if already confirmed
    if current_user.email_confirmed:
        return jsonify({
            'success': False,
            'message': 'Email already confirmed!'
        }), 400

    try:
        # Get mail instance from current_app
        from flask_mail import Mail
        mail = Mail(current_app)

        # Use request host for dynamic IP support (works on any network)
        base_url = f"http://{request.host}"
        success, error = send_confirmation_email(current_user, mail, base_url)

        if success:
            logger.info(f"📧 Resent confirmation email to {current_user.email}")
            return jsonify({
                'success': True,
                'message': 'Confirmation email sent! Check your inbox.'
            }), 200
        else:
            logger.error(
                f"❌ Failed to resend confirmation to {current_user.email}: {error}")
            return jsonify({
                'success': False,
                'message': f'Failed to send email: {error}'
            }), 500

    except Exception as e:
        logger.error(
            f"❌ Error in resend_confirmation for {current_user.email}: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500

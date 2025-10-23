"""
Email Utilities Module for Binance Dashboard
─────────────────────────────────────────────
Handles email confirmation tokens, sending confirmation emails,
and alert notifications for Pro/Elite users.

Features:
- Secure token generation using itsdangerous
- Beautiful HTML email templates
- SendGrid/SMTP integration via Flask-Mail
- Email confirmation flow
- Alert email notifications (Pro tier)
"""

from flask import render_template, url_for, current_app
from flask_mail import Message, Mail
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
import logging
from typing import Optional, Tuple

# Get logger
logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════════════
# TOKEN GENERATION & VERIFICATION
# ══════════════════════════════════════════════════════════════════════════════

def get_serializer() -> URLSafeTimedSerializer:
    """
    Get the URLSafeTimedSerializer for token generation.
    Uses app's SECRET_KEY and EMAIL_CONFIRMATION_SALT from config.

    Returns:
        URLSafeTimedSerializer instance
    """
    return URLSafeTimedSerializer(current_app.config['SECRET_KEY'])


def generate_confirmation_token(email: str) -> str:
    """
    Generate a secure time-limited confirmation token for an email address.

    Args:
        email: User's email address

    Returns:
        Secure token string (URL-safe)

    Example:
        >>> token = generate_confirmation_token('user@example.com')
        >>> # token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    """
    serializer = get_serializer()
    # Use salt from config for additional security
    salt = current_app.config.get('EMAIL_CONFIRMATION_SALT', 'email-confirm')
    return serializer.dumps(email, salt=salt)


def confirm_token(token: str, expiration: int = 3600) -> Optional[str]:
    """
    Verify and decode a confirmation token.

    Args:
        token: The token to verify
        expiration: Maximum age in seconds (default: 3600 = 1 hour)

    Returns:
        Email address if valid, None if invalid/expired

    Example:
        >>> email = confirm_token('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
        >>> # email = 'user@example.com' or None
    """
    serializer = get_serializer()
    salt = current_app.config.get('EMAIL_CONFIRMATION_SALT', 'email-confirm')

    try:
        email = serializer.loads(
            token,
            salt=salt,
            max_age=expiration
        )
        return email
    except SignatureExpired:
        logger.warning(f"⏰ Email confirmation token expired")
        return None
    except BadSignature:
        logger.warning(f"❌ Invalid email confirmation token signature")
        return None
    except Exception as e:
        logger.error(f"❌ Error verifying token: {str(e)}")
        return None


# ══════════════════════════════════════════════════════════════════════════════
# EMAIL SENDING FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

def send_email(
    to: str,
    subject: str,
    html_body: str,
    text_body: str,
    mail: Mail
) -> Tuple[bool, Optional[str]]:
    """
    Send an email using SendGrid Web API (bypasses SMTP tracking issues).

    Args:
        to: Recipient email address
        subject: Email subject line
        html_body: HTML email content
        text_body: Plain text fallback content
        mail: Flask-Mail instance (not used with Web API, kept for compatibility)

    Returns:
        Tuple of (success: bool, error_message: Optional[str])

    Example:
        >>> success, error = send_email(
        ...     to='user@example.com',
        ...     subject='Welcome!',
        ...     html_body='<h1>Hello</h1>',
        ...     text_body='Hello',
        ...     mail=mail
        ... )
    """
    try:
        # Check if SendGrid API key is configured
        sendgrid_api_key = current_app.config.get('MAIL_PASSWORD')

        if sendgrid_api_key and sendgrid_api_key.startswith('SG.'):
            # Use SendGrid Web API for better tracking control
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail as SGMail, Email, To, Content, MailSettings, TrackingSettings, ClickTracking, OpenTracking

            sender_email = current_app.config.get(
                'MAIL_DEFAULT_SENDER',
                'noreply@binancedashboard.com'
            )

            # Create message with tracking disabled
            message = SGMail(
                from_email=Email(sender_email),
                to_emails=To(to),
                subject=subject,
                plain_text_content=Content("text/plain", text_body),
                html_content=Content("text/html", html_body)
            )

            # Disable click and open tracking
            message.tracking_settings = TrackingSettings(
                click_tracking=ClickTracking(enable=False, enable_text=False),
                open_tracking=OpenTracking(enable=False)
            )

            # Send via SendGrid API
            sg = SendGridAPIClient(sendgrid_api_key)
            response = sg.send(message)

            if response.status_code in [200, 201, 202]:
                logger.info(
                    f"📧 Email sent via SendGrid API to {to}: {subject} (tracking disabled)")
                return True, None
            else:
                error_msg = f"SendGrid API returned status {response.status_code}"
                logger.error(f"❌ {error_msg}")
                return False, error_msg

        else:
            # Fallback to Flask-Mail SMTP (for non-SendGrid setups)
            sender = current_app.config.get(
                'MAIL_DEFAULT_SENDER',
                'noreply@binancedashboard.com'
            )

            # Create message
            msg = Message(
                subject=subject,
                sender=sender,
                recipients=[to]
            )
            msg.body = text_body
            msg.html = html_body

            # Try to disable tracking via X-SMTPAPI header
            try:
                import json
                smtpapi_settings = {
                    "filters": {
                        "clicktrack": {"settings": {"enable": 0}},
                        "opentrack": {"settings": {"enable": 0}}
                    }
                }
                msg.extra_headers = {
                    'X-SMTPAPI': json.dumps(smtpapi_settings)
                }
                logger.info("📧 SendGrid SMTP tracking disabled via header")
            except Exception as e:
                logger.warning(
                    f"⚠️ Could not disable tracking (non-critical): {e}")

            # Send email
            mail.send(msg)

            logger.info(f"📧 Email sent via SMTP to {to}: {subject}")
            return True, None

    except Exception as e:
        error_msg = f"Failed to send email to {to}: {str(e)}"
        logger.error(f"❌ {error_msg}")
        return False, error_msg


def send_confirmation_email(user, mail: Mail, base_url: str = None) -> Tuple[bool, Optional[str]]:
    """
    Send email confirmation to a newly registered user.

    Args:
        user: User model instance (must have .email attribute)
        mail: Flask-Mail instance
        base_url: Base URL for the app (e.g., 'http://localhost:5000')
                  If None, uses current request context

    Returns:
        Tuple of (success: bool, error_message: Optional[str])

    Example:
        >>> success, error = send_confirmation_email(new_user, mail)
        >>> if success:
        ...     flash('Confirmation email sent!', 'success')
    """
    try:
        # Generate confirmation token
        token = generate_confirmation_token(user.email)

        # Build confirmation URL
        # Use provided base_url or generate from current app
        if base_url:
            confirmation_url = f"{base_url}/confirm/{token}"
        else:
            # This requires request context
            confirmation_url = url_for(
                'auth.confirm_email',
                token=token,
                _external=True
            )

        # Render email templates
        html_body = render_template(
            'emails/confirm_email.html',
            confirmation_url=confirmation_url,
            user=user,
            base_url=base_url or url_for('index', _external=True).rstrip('/')
        )

        text_body = render_template(
            'emails/confirm_email.txt',
            confirmation_url=confirmation_url,
            user=user,
            base_url=base_url or url_for('index', _external=True).rstrip('/')
        )

        # Send email
        success, error = send_email(
            to=user.email,
            subject='Confirm Your Email - Binance Dashboard',
            html_body=html_body,
            text_body=text_body,
            mail=mail
        )

        if success:
            logger.info(f"✅ Confirmation email sent to {user.email}")
        else:
            logger.error(
                f"❌ Failed to send confirmation email to {user.email}: {error}")

        return success, error

    except Exception as e:
        error_msg = f"Error sending confirmation email to {user.email}: {str(e)}"
        logger.error(f"❌ {error_msg}")
        return False, error_msg


def send_alert_email(
    user,
    alert_data: dict,
    mail: Mail
) -> Tuple[bool, Optional[str]]:
    """
    Send volume spike alert email to Pro/Elite tier users.

    This is a placeholder for Pro Tier Step 6 (Alert Enhancement).

    Args:
        user: User model instance (must have .email, .tier attributes)
        alert_data: Dictionary with alert information:
                    - symbol: Trading pair symbol
                    - volume_24h: 24h volume in USD
                    - volume_change: Volume change multiple (e.g., 3.2x)
                    - funding_rate: Current funding rate
                    - price: Current price
        mail: Flask-Mail instance

    Returns:
        Tuple of (success: bool, error_message: Optional[str])

    Example:
        >>> alert = {
        ...     'symbol': 'BTCUSDT',
        ...     'volume_24h': 5000000000,
        ...     'volume_change': 3.5,
        ...     'funding_rate': 0.01,
        ...     'price': 45000
        ... }
        >>> send_alert_email(user, alert, mail)
    """
    # Check if user has email alert feature (Pro or Elite tier)
    from config import has_feature

    if not has_feature(user.tier, 'email_alerts'):
        logger.warning(
            f"⚠️ User {user.email} (Tier {user.tier}) attempted to receive "
            f"email alert but doesn't have access to this feature"
        )
        return False, "Email alerts are only available for Pro and Elite tiers"

    try:
        # TODO: Create alert email template in Step 6
        # For now, send a simple notification

        symbol = alert_data.get('symbol', 'N/A')
        volume = alert_data.get('volume_24h', 0)
        volume_change = alert_data.get('volume_change', 0)

        subject = f"🚨 Volume Spike Alert: {symbol} ({volume_change}x)"

        # Simple HTML body (will be enhanced with proper template in Step 6)
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; background: #1a1a1a; color: #ffffff; padding: 20px;">
            <h2 style="color: #00ff88;">🚨 Volume Spike Detected!</h2>
            <p><strong>Symbol:</strong> {symbol}</p>
            <p><strong>24h Volume:</strong> ${volume:,.0f}</p>
            <p><strong>Volume Change:</strong> {volume_change}x</p>
            <p><strong>Funding Rate:</strong> {alert_data.get('funding_rate', 0):.4f}%</p>
            <p><strong>Price:</strong> ${alert_data.get('price', 0):,.2f}</p>
            <hr>
            <p style="color: #888888; font-size: 12px;">
                This is a Pro tier feature. Manage your alerts in the dashboard.
            </p>
        </body>
        </html>
        """

        text_body = f"""
        VOLUME SPIKE ALERT
        
        Symbol: {symbol}
        24h Volume: ${volume:,.0f}
        Volume Change: {volume_change}x
        Funding Rate: {alert_data.get('funding_rate', 0):.4f}%
        Price: ${alert_data.get('price', 0):,.2f}
        
        ---
        This is a Pro tier feature. Manage your alerts in the dashboard.
        """

        success, error = send_email(
            to=user.email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            mail=mail
        )

        if success:
            logger.info(f"📧 Alert email sent to {user.email} for {symbol}")

        return success, error

    except Exception as e:
        error_msg = f"Error sending alert email to {user.email}: {str(e)}"
        logger.error(f"❌ {error_msg}")
        return False, error_msg


# ══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

def is_email_configured() -> bool:
    """
    Check if email is properly configured in the app.

    Returns:
        True if email settings are configured, False otherwise
    """
    try:
        mail_server = current_app.config.get('MAIL_SERVER')
        mail_password = current_app.config.get('MAIL_PASSWORD')

        # Check if essential email settings are present
        configured = bool(mail_server and mail_password)

        if not configured:
            logger.warning(
                "⚠️ Email not configured. Set MAIL_SERVER and MAIL_PASSWORD "
                "in environment variables or config."
            )

        return configured

    except Exception as e:
        logger.error(f"❌ Error checking email configuration: {str(e)}")
        return False


def get_email_status() -> dict:
    """
    Get current email configuration status for debugging.

    Returns:
        Dictionary with email configuration status
    """
    return {
        'configured': is_email_configured(),
        'mail_server': current_app.config.get('MAIL_SERVER', 'Not set'),
        'mail_port': current_app.config.get('MAIL_PORT', 'Not set'),
        'mail_use_tls': current_app.config.get('MAIL_USE_TLS', False),
        'mail_username': current_app.config.get('MAIL_USERNAME', 'Not set'),
        'mail_default_sender': current_app.config.get('MAIL_DEFAULT_SENDER', 'Not set'),
        'has_password': bool(current_app.config.get('MAIL_PASSWORD')),
    }


# ══════════════════════════════════════════════════════════════════════════════
# TESTING & DEVELOPMENT
# ══════════════════════════════════════════════════════════════════════════════

def send_test_email(to: str, mail: Mail) -> Tuple[bool, Optional[str]]:
    """
    Send a test email to verify email configuration.

    Args:
        to: Recipient email address
        mail: Flask-Mail instance

    Returns:
        Tuple of (success: bool, error_message: Optional[str])
    """
    html_body = """
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>✅ Email Configuration Test</h2>
        <p>If you're reading this, your email configuration is working!</p>
        <p><strong>Binance Dashboard</strong> is ready to send confirmation emails and alerts.</p>
    </body>
    </html>
    """

    text_body = """
    EMAIL CONFIGURATION TEST
    
    If you're reading this, your email configuration is working!
    Binance Dashboard is ready to send confirmation emails and alerts.
    """

    return send_email(
        to=to,
        subject='✅ Test Email - Binance Dashboard',
        html_body=html_body,
        text_body=text_body,
        mail=mail
    )

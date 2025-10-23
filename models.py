"""
Database Models for Binance Dashboard
─────────────────────────────────────
Defines User and AlertPreferences models for tiered access control.
"""

from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

# Initialize SQLAlchemy
db = SQLAlchemy()


# ══════════════════════════════════════════════════════════════════════════════
# USER MODEL
# ══════════════════════════════════════════════════════════════════════════════

class User(UserMixin, db.Model):
    """
    User model for authentication and tier management.

    Attributes:
        id: Primary key
        email: Unique email address
        password_hash: Hashed password (never store plaintext!)
        tier: Integer tier level (0=Free, 1=Pro, 2=Elite)
        created_at: Account creation timestamp
        updated_at: Last update timestamp
        is_active: Account status (for soft deletes/bans)
        theme_preference: User's preferred theme ('dark' or 'light')
    """

    __tablename__ = 'users'

    # Primary Fields
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)

    # Tier & Status
    # 0=Free, 1=Pro, 2=Elite
    tier = db.Column(db.Integer, default=0, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    # Email Confirmation (Pro Tier feature)
    email_confirmed = db.Column(db.Boolean, default=False, nullable=False)
    email_confirmed_at = db.Column(db.DateTime, nullable=True)

    # Personalization
    theme_preference = db.Column(db.String(10), default='dark', nullable=False)

    # Pro Tier Customization (JSON field for flexible preferences)
    # Store user customizations
    preferences = db.Column(db.JSON, nullable=True)

    # Wallet Authentication (optional crypto sign-in)
    wallet_address = db.Column(
        db.String(42), nullable=True, unique=True, index=True)  # Ethereum address
    # For signature verification
    wallet_nonce = db.Column(db.String(64), nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(
        timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime,
                           default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc),
                           nullable=False)

    # Subscription metadata (for future payment integration)
    subscription_expires_at = db.Column(db.DateTime, nullable=True)
    stripe_customer_id = db.Column(db.String(100), nullable=True)

    # Relationships (one-to-one with AlertPreferences)
    alert_preferences = db.relationship('AlertPreferences',
                                        back_populates='user',
                                        uselist=False,
                                        cascade='all, delete-orphan')

    def __repr__(self):
        return f'<User {self.email} (Tier: {self.tier})>'

    # ─────────────────────────────────────────────────────────────────────────
    # Password Management
    # ─────────────────────────────────────────────────────────────────────────

    def set_password(self, password: str) -> None:
        """Hash and store password securely."""
        self.password_hash = generate_password_hash(
            password, method='pbkdf2:sha256')

    def check_password(self, password: str) -> bool:
        """Verify password against stored hash."""
        return check_password_hash(self.password_hash, password)

    # ─────────────────────────────────────────────────────────────────────────
    # Tier Management
    # ─────────────────────────────────────────────────────────────────────────

    @property
    def tier_name(self) -> str:
        """Get human-readable tier name."""
        tier_names = {0: 'Free', 1: 'Pro', 2: 'Elite'}
        return tier_names.get(self.tier, 'Unknown')

    def upgrade_tier(self, new_tier: int) -> None:
        """
        Upgrade user to a new tier.

        Args:
            new_tier: Target tier level (1=Pro, 2=Elite)
        """
        if new_tier > self.tier:
            self.tier = new_tier
            self.updated_at = datetime.now(timezone.utc)

    def downgrade_tier(self, new_tier: int) -> None:
        """
        Downgrade user to a lower tier.

        Args:
            new_tier: Target tier level (0=Free, 1=Pro)
        """
        if new_tier < self.tier:
            self.tier = new_tier
            self.updated_at = datetime.now(timezone.utc)

    @property
    def is_free_tier(self) -> bool:
        """Check if user is on Free tier."""
        return self.tier == 0

    @property
    def is_pro_tier(self) -> bool:
        """Check if user is on Pro tier."""
        return self.tier == 1

    @property
    def is_elite_tier(self) -> bool:
        """Check if user is on Elite tier."""
        return self.tier == 2

    @property
    def is_paid_tier(self) -> bool:
        """Check if user is on any paid tier (Pro or Elite)."""
        return self.tier >= 1

    # ─────────────────────────────────────────────────────────────────────────
    # Subscription Management
    # ─────────────────────────────────────────────────────────────────────────

    @property
    def subscription_active(self) -> bool:
        """Check if subscription is active (for paid tiers)."""
        if self.tier == 0:
            return True  # Free tier always active

        if not self.subscription_expires_at:
            return False

        return datetime.now(timezone.utc) < self.subscription_expires_at

    def extend_subscription(self, days: int) -> None:
        """
        Extend subscription by given number of days.

        Args:
            days: Number of days to extend
        """
        from datetime import timedelta

        if not self.subscription_expires_at:
            self.subscription_expires_at = datetime.now(timezone.utc)

        self.subscription_expires_at += timedelta(days=days)

    # ─────────────────────────────────────────────────────────────────────────
    # Preferences Management (Pro Tier)
    # ─────────────────────────────────────────────────────────────────────────

    def get_preference(self, key: str, default=None):
        """Get a user preference value."""
        if not self.preferences:
            return default
        return self.preferences.get(key, default)

    def set_preference(self, key: str, value) -> None:
        """Set a user preference value."""
        if not self.preferences:
            self.preferences = {}
        self.preferences[key] = value
        self.updated_at = datetime.now(timezone.utc)

    def update_preferences(self, preferences_dict: dict) -> None:
        """Update multiple preferences at once."""
        if not self.preferences:
            self.preferences = {}
        self.preferences.update(preferences_dict)
        self.updated_at = datetime.now(timezone.utc)

    # ─────────────────────────────────────────────────────────────────────────
    # Serialization (for API responses)
    # ─────────────────────────────────────────────────────────────────────────

    def to_dict(self, include_sensitive=False) -> dict:
        """
        Convert user to dictionary for API responses.

        Args:
            include_sensitive: Include sensitive fields like email

        Returns:
            Dictionary representation of user
        """
        data = {
            'id': self.id,
            'tier': self.tier,
            'tier_name': self.tier_name,
            'is_active': self.is_active,
            'theme_preference': self.theme_preference,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'email_confirmed': self.email_confirmed,
            'has_wallet': self.wallet_address is not None,
        }

        if include_sensitive:
            data['email'] = self.email
            data['wallet_address'] = self.wallet_address
            data['email_confirmed_at'] = (
                self.email_confirmed_at.isoformat()
                if self.email_confirmed_at else None
            )
            data['subscription_expires_at'] = (
                self.subscription_expires_at.isoformat()
                if self.subscription_expires_at else None
            )
            data['subscription_active'] = self.subscription_active

        return data


# ══════════════════════════════════════════════════════════════════════════════
# ALERT PREFERENCES MODEL (STUB FOR FUTURE USE)
# ══════════════════════════════════════════════════════════════════════════════

class AlertPreferences(db.Model):
    """
    User-specific alert preferences (Pro/Elite tiers).

    This is a stub for future implementation. Will store customizable thresholds,
    notification channels, and alert filtering preferences.

    Attributes:
        id: Primary key
        user_id: Foreign key to User
        volume_multiple: Custom volume spike threshold (default: 3x)
        min_quote_volume: Minimum quote volume for alerts (default: $3M)
        email_alerts_enabled: Enable email notifications
        email_address: Email address for alerts (can differ from login email)
        sms_alerts_enabled: Enable SMS notifications (Elite tier)
        sms_number: Phone number for SMS alerts
        telegram_enabled: Enable Telegram notifications
        telegram_chat_id: Telegram chat ID
        discord_enabled: Enable Discord notifications
        discord_webhook_url: Discord webhook URL
    """

    __tablename__ = 'alert_preferences'

    # Primary Fields
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey(
        'users.id'), nullable=False, unique=True)

    # Volume Alert Thresholds (Pro/Elite only)
    volume_multiple = db.Column(db.Float, default=3.0, nullable=False)
    min_quote_volume = db.Column(
        db.BigInteger, default=3_000_000, nullable=False)

    # Email Notifications (Pro/Elite)
    email_alerts_enabled = db.Column(db.Boolean, default=False, nullable=False)
    email_address = db.Column(db.String(120), nullable=True)

    # SMS Notifications (Elite only)
    sms_alerts_enabled = db.Column(db.Boolean, default=False, nullable=False)
    sms_number = db.Column(db.String(20), nullable=True)

    # Telegram Notifications (Elite only)
    telegram_enabled = db.Column(db.Boolean, default=False, nullable=False)
    telegram_chat_id = db.Column(db.String(100), nullable=True)

    # Discord Notifications (Elite only)
    discord_enabled = db.Column(db.Boolean, default=False, nullable=False)
    discord_webhook_url = db.Column(db.String(255), nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(
        timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime,
                           default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc),
                           nullable=False)

    # Relationship
    user = db.relationship('User', back_populates='alert_preferences')

    def __repr__(self):
        return f'<AlertPreferences for User {self.user_id}>'

    def to_dict(self) -> dict:
        """Convert alert preferences to dictionary."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'volume_multiple': self.volume_multiple,
            'min_quote_volume': self.min_quote_volume,
            'email_alerts_enabled': self.email_alerts_enabled,
            'sms_alerts_enabled': self.sms_alerts_enabled,
            'telegram_enabled': self.telegram_enabled,
            'discord_enabled': self.discord_enabled,
        }


# ══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

def create_default_alert_preferences(user: User) -> AlertPreferences:
    """
    Create default alert preferences for a new user.

    Args:
        user: User instance

    Returns:
        AlertPreferences instance
    """
    preferences = AlertPreferences(
        user_id=user.id,
        volume_multiple=3.0,
        min_quote_volume=3_000_000,
        email_alerts_enabled=False
    )
    return preferences


def get_user_by_email(email: str) -> User | None:
    """
    Retrieve user by email address.

    Args:
        email: Email address to search for

    Returns:
        User instance or None if not found
    """
    return User.query.filter_by(email=email).first()


def get_user_by_id(user_id: int) -> User | None:
    """
    Retrieve user by ID.

    Args:
        user_id: User ID to search for

    Returns:
        User instance or None if not found
    """
    return User.query.get(user_id)


# ══════════════════════════════════════════════════════════════════════════════
# SUBSCRIPTION MODEL (FOR STRIPE INTEGRATION)
# ══════════════════════════════════════════════════════════════════════════════

class Subscription(db.Model):
    """
    Subscription model for tracking Stripe subscriptions.

    This model stores Stripe subscription data and links it to users.
    Used for Pro Tier payment integration (Step 4).

    Attributes:
        id: Primary key
        user_id: Foreign key to User
        stripe_subscription_id: Stripe subscription ID (e.g., 'sub_1234...')
        stripe_customer_id: Stripe customer ID (e.g., 'cus_1234...')
        stripe_price_id: Stripe price ID (e.g., 'price_1234...')
        status: Subscription status (active, canceled, past_due, etc.)
        tier: Target tier level (1=Pro, 2=Elite)
        billing_cycle: 'monthly' or 'yearly'
        current_period_start: Start of current billing period
        current_period_end: End of current billing period
        cancel_at_period_end: Whether subscription will cancel at period end
        canceled_at: When subscription was canceled
        created_at: Subscription creation timestamp
        updated_at: Last update timestamp
    """

    __tablename__ = 'subscriptions'

    # Primary Fields
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey(
        'users.id'), nullable=False, index=True)

    # Stripe IDs
    stripe_subscription_id = db.Column(
        db.String(100), unique=True, nullable=False, index=True)
    stripe_customer_id = db.Column(db.String(100), nullable=False, index=True)
    stripe_price_id = db.Column(db.String(100), nullable=False)

    # Subscription Details
    status = db.Column(db.String(20), nullable=False, default='incomplete')
    # Status values: incomplete, incomplete_expired, trialing, active, past_due, canceled, unpaid

    tier = db.Column(db.Integer, nullable=False)  # 1=Pro, 2=Elite
    # 'monthly' or 'yearly'
    billing_cycle = db.Column(db.String(10), nullable=False)

    # Billing Period
    current_period_start = db.Column(db.DateTime, nullable=True)
    current_period_end = db.Column(db.DateTime, nullable=True)

    # Cancellation
    cancel_at_period_end = db.Column(db.Boolean, default=False, nullable=False)
    canceled_at = db.Column(db.DateTime, nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(
        timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime,
                           default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc),
                           nullable=False)

    # Relationship
    user = db.relationship('User', backref=db.backref(
        'subscriptions', lazy='dynamic'))

    def __repr__(self):
        return f'<Subscription {self.stripe_subscription_id} for User {self.user_id} (Status: {self.status})>'

    @property
    def is_active(self) -> bool:
        """Check if subscription is currently active."""
        return self.status in ['active', 'trialing']

    @property
    def is_canceled(self) -> bool:
        """Check if subscription is canceled."""
        return self.status == 'canceled'

    @property
    def will_renew(self) -> bool:
        """Check if subscription will automatically renew."""
        return self.is_active and not self.cancel_at_period_end

    def to_dict(self) -> dict:
        """Convert subscription to dictionary."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'stripe_subscription_id': self.stripe_subscription_id,
            'stripe_customer_id': self.stripe_customer_id,
            'stripe_price_id': self.stripe_price_id,
            'status': self.status,
            'tier': self.tier,
            'billing_cycle': self.billing_cycle,
            'current_period_start': self.current_period_start.isoformat() if self.current_period_start else None,
            'current_period_end': self.current_period_end.isoformat() if self.current_period_end else None,
            'cancel_at_period_end': self.cancel_at_period_end,
            'canceled_at': self.canceled_at.isoformat() if self.canceled_at else None,
            'is_active': self.is_active,
            'will_renew': self.will_renew,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


# ══════════════════════════════════════════════════════════════════════════════
# AUDIT LOG MODEL (FOR PAYMENT & SECURITY EVENTS)
# ══════════════════════════════════════════════════════════════════════════════

class AuditLog(db.Model):
    """
    Audit log for tracking important events (payments, tier changes, security).

    Used for compliance, debugging, and security monitoring.

    Attributes:
        id: Primary key
        user_id: Foreign key to User (nullable for system events)
        event_type: Type of event (e.g., 'payment_success', 'tier_upgrade')
        event_data: JSON data with event details
        ip_address: User's IP address (if applicable)
        user_agent: User's browser/device info (if applicable)
        created_at: Event timestamp
    """

    __tablename__ = 'audit_logs'

    # Primary Fields
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey(
        'users.id'), nullable=True, index=True)

    # Event Details
    event_type = db.Column(db.String(50), nullable=False, index=True)
    # Event types: payment_success, payment_failed, tier_upgrade, tier_downgrade,
    #              subscription_created, subscription_canceled, login_success, etc.

    # JSON string with event details
    event_data = db.Column(db.Text, nullable=True)

    # Request Context
    ip_address = db.Column(db.String(45), nullable=True)  # IPv6 max length
    user_agent = db.Column(db.String(255), nullable=True)

    # Timestamp
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(
        timezone.utc), nullable=False, index=True)

    # Relationship
    user = db.relationship('User', backref=db.backref(
        'audit_logs', lazy='dynamic'))

    def __repr__(self):
        return f'<AuditLog {self.event_type} for User {self.user_id} at {self.created_at}>'

    def to_dict(self) -> dict:
        """Convert audit log to dictionary."""
        import json

        return {
            'id': self.id,
            'user_id': self.user_id,
            'event_type': self.event_type,
            'event_data': json.loads(self.event_data) if self.event_data else None,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


# ══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS FOR SUBSCRIPTIONS
# ══════════════════════════════════════════════════════════════════════════════

def get_active_subscription(user: User) -> Subscription | None:
    """
    Get user's active subscription if exists.

    Args:
        user: User instance

    Returns:
        Active Subscription instance or None
    """
    return Subscription.query.filter_by(
        user_id=user.id,
        status='active'
    ).first()


def log_event(
    event_type: str,
    user_id: int | None = None,
    event_data: dict | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None
) -> AuditLog:
    """
    Create an audit log entry.

    Args:
        event_type: Type of event
        user_id: User ID (optional)
        event_data: Dictionary with event details (optional)
        ip_address: User's IP address (optional)
        user_agent: User's browser/device info (optional)

    Returns:
        AuditLog instance

    Example:
        >>> log_event('payment_success', user_id=1, event_data={'amount': 9.99, 'tier': 1})
    """
    import json

    log_entry = AuditLog(
        user_id=user_id,
        event_type=event_type,
        event_data=json.dumps(event_data) if event_data else None,
        ip_address=ip_address,
        user_agent=user_agent
    )

    db.session.add(log_entry)

    return log_entry

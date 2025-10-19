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

    # Personalization
    theme_preference = db.Column(db.String(10), default='dark', nullable=False)

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
        }

        if include_sensitive:
            data['email'] = self.email
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

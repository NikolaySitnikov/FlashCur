"""
Database Models (Async)
======================
Modern async SQLAlchemy models for FlashCur.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.asyncio import AsyncAttrs
from .database import Base


class User(AsyncAttrs, Base):
    """User model with async support."""
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=False)

    # Tier & Status
    tier = Column(Integer, default=0, nullable=False)  # 0=Free, 1=Pro, 2=Elite
    is_active = Column(Boolean, default=True, nullable=False)

    # Email Confirmation
    email_confirmed = Column(Boolean, default=False, nullable=False)
    email_confirmed_at = Column(DateTime, nullable=True)

    # Web3 Authentication
    wallet_address = Column(String(42), nullable=True, unique=True, index=True)
    wallet_nonce = Column(String(64), nullable=True)

    # Stripe Integration
    stripe_customer_id = Column(String(100), nullable=True)
    subscription_expires_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(
        timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    subscriptions = relationship("Subscription", back_populates="user")
    alert_preferences = relationship(
        "AlertPreferences", back_populates="user", uselist=False)
    audit_logs = relationship("AuditLog", back_populates="user")


class Subscription(AsyncAttrs, Base):
    """Stripe subscription model."""
    __tablename__ = 'subscriptions'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    stripe_subscription_id = Column(String(100), unique=True, nullable=False)
    stripe_customer_id = Column(String(100), nullable=False)
    price_id = Column(String(100), nullable=False)
    # active, canceled, incomplete, etc.
    status = Column(String(20), nullable=False)
    tier = Column(Integer, nullable=False)  # 1=Pro, 2=Elite
    billing_cycle = Column(String(10), nullable=False)  # monthly, yearly

    # Period tracking
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)

    # Cancellation
    canceled_at = Column(DateTime, nullable=True)
    cancel_at_period_end = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(
        timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="subscriptions")


class AlertPreferences(AsyncAttrs, Base):
    """User alert preferences."""
    __tablename__ = 'alert_preferences'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'),
                     nullable=False, unique=True)

    # Volume Alert Settings
    volume_multiple = Column(Float, default=3.0, nullable=False)
    min_quote_volume = Column(Integer, default=3_000_000, nullable=False)

    # Notification Channels
    email_alerts_enabled = Column(Boolean, default=False, nullable=False)
    email_address = Column(String(120), nullable=True)

    sms_alerts_enabled = Column(Boolean, default=False, nullable=False)
    sms_number = Column(String(20), nullable=True)

    telegram_enabled = Column(Boolean, default=False, nullable=False)
    telegram_chat_id = Column(String(100), nullable=True)

    discord_enabled = Column(Boolean, default=False, nullable=False)
    discord_webhook_url = Column(String(255), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(
        timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="alert_preferences")


class AuditLog(AsyncAttrs, Base):
    """Audit log for security and compliance."""
    __tablename__ = 'audit_logs'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    event_type = Column(String(50), nullable=False)
    event_data = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(
        timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="audit_logs")

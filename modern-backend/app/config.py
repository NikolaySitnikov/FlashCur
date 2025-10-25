"""
Configuration Settings
=====================
Centralized configuration for the modern FlashCur backend.
"""

import os
from typing import List
from pydantic import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # Application
    APP_NAME: str = "FlashCur API"
    VERSION: str = "2.0.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost/flashcur"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Binance API
    BINANCE_API_BASE: str = "https://api.binance.com"
    BINANCE_FUTURES_API_BASE: str = "https://fapi.binance.com"

    # Data Pipeline
    DATA_REFRESH_INTERVAL: int = 30  # seconds
    CACHE_TTL: int = 300  # 5 minutes
    MIN_QUOTE_VOLUME: float = 3_000_000  # $3M minimum

    # WebSocket
    WS_HEARTBEAT_INTERVAL: int = 30  # seconds

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "https://flashcur.com",
        "https://www.flashcur.com"
    ]

    # Stripe
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # Email
    SENDGRID_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@flashcur.com"

    # SMS (Elite tier)
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""

    # Security
    SECRET_KEY: str = "your-super-secret-key-change-this-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # Tier Configuration
    FREE_TIER_LIMIT: int = 50
    PRO_TIER_LIMIT: int = 500
    ELITE_TIER_LIMIT: int = 1000

    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()

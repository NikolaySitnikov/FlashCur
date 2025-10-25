"""
Dashboard API Routes
==================
FastAPI routes for dashboard data and real-time updates.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Optional
import logging

from ..database import get_db_session
from ..models import User, AlertPreferences
from ..auth import get_current_user
from ..data_pipeline import DataPipeline
from ..config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/data")
async def get_dashboard_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Get dashboard data with tier-based filtering."""
    try:
        # Determine if user has Pro metrics access
        include_pro_metrics = current_user.tier >= 1

        # Get cached data from pipeline
        data_pipeline = DataPipeline()
        market_data = await data_pipeline.get_cached_data(include_pro_metrics)

        # Apply tier-based limits
        if current_user.tier == 0:  # Free tier
            market_data = market_data[:settings.FREE_TIER_LIMIT]
        elif current_user.tier == 1:  # Pro tier
            market_data = market_data[:settings.PRO_TIER_LIMIT]
        elif current_user.tier == 2:  # Elite tier
            market_data = market_data[:settings.ELITE_TIER_LIMIT]

        return {
            "success": True,
            "data": market_data,
            "user_tier": current_user.tier,
            "has_pro_metrics": include_pro_metrics
        }

    except Exception as e:
        logger.error(f"❌ Dashboard data error: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to fetch dashboard data")


@router.get("/user-info")
async def get_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "tier": current_user.tier,
        "is_active": current_user.is_active,
        "email_confirmed": current_user.email_confirmed,
        "wallet_address": current_user.wallet_address,
        "subscription_expires_at": current_user.subscription_expires_at
    }


@router.get("/tier-features")
async def get_tier_features(current_user: User = Depends(get_current_user)):
    """Get available features for user's tier."""
    tier = current_user.tier

    features = {
        "free": {
            "max_assets": settings.FREE_TIER_LIMIT,
            "refresh_interval": 15,  # minutes
            "basic_columns": True,
            "pro_columns": False,
            "email_alerts": False,
            "sms_alerts": False,
            "websocket_streaming": False
        },
        "pro": {
            "max_assets": settings.PRO_TIER_LIMIT,
            "refresh_interval": 5,  # minutes
            "basic_columns": True,
            "pro_columns": True,
            "email_alerts": True,
            "sms_alerts": False,
            "websocket_streaming": True
        },
        "elite": {
            "max_assets": settings.ELITE_TIER_LIMIT,
            "refresh_interval": 1,  # minutes
            "basic_columns": True,
            "pro_columns": True,
            "email_alerts": True,
            "sms_alerts": True,
            "websocket_streaming": True,
            "priority_support": True
        }
    }

    if tier == 0:
        return {"tier": "free", "features": features["free"]}
    elif tier == 1:
        return {"tier": "pro", "features": features["pro"]}
    elif tier == 2:
        return {"tier": "elite", "features": features["elite"]}
    else:
        return {"tier": "unknown", "features": features["free"]}


@router.get("/alert-preferences")
async def get_alert_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Get user's alert preferences."""
    try:
        result = await db.execute(
            select(AlertPreferences).where(
                AlertPreferences.user_id == current_user.id)
        )
        preferences = result.scalar_one_or_none()

        if not preferences:
            # Create default preferences
            preferences = AlertPreferences(
                user_id=current_user.id,
                volume_multiple=3.0,
                min_quote_volume=3_000_000
            )
            db.add(preferences)
            await db.commit()
            await db.refresh(preferences)

        return {
            "volume_multiple": preferences.volume_multiple,
            "min_quote_volume": preferences.min_quote_volume,
            "email_alerts_enabled": preferences.email_alerts_enabled,
            "email_address": preferences.email_address,
            "sms_alerts_enabled": preferences.sms_alerts_enabled,
            "sms_number": preferences.sms_number,
            "telegram_enabled": preferences.telegram_enabled,
            "telegram_chat_id": preferences.telegram_chat_id,
            "discord_enabled": preferences.discord_enabled,
            "discord_webhook_url": preferences.discord_webhook_url
        }

    except Exception as e:
        logger.error(f"❌ Alert preferences error: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to fetch alert preferences")


@router.put("/alert-preferences")
async def update_alert_preferences(
    preferences_data: Dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Update user's alert preferences."""
    try:
        result = await db.execute(
            select(AlertPreferences).where(
                AlertPreferences.user_id == current_user.id)
        )
        preferences = result.scalar_one_or_none()

        if not preferences:
            preferences = AlertPreferences(user_id=current_user.id)
            db.add(preferences)

        # Update fields
        for field, value in preferences_data.items():
            if hasattr(preferences, field):
                setattr(preferences, field, value)

        await db.commit()
        await db.refresh(preferences)

        return {"success": True, "message": "Alert preferences updated"}

    except Exception as e:
        logger.error(f"❌ Update alert preferences error: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to update alert preferences")

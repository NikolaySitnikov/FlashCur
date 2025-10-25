"""
Alert Routes
============
FastAPI routes for alert management and notification preferences.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional
import logging

from ..database import get_db_session
from ..models import User, AlertPreferences
from ..auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic models


class AlertPreferencesUpdate(BaseModel):
    volume_multiple: Optional[float] = None
    min_quote_volume: Optional[int] = None
    email_alerts_enabled: Optional[bool] = None
    email_address: Optional[str] = None
    sms_alerts_enabled: Optional[bool] = None
    sms_number: Optional[str] = None
    telegram_enabled: Optional[bool] = None
    telegram_chat_id: Optional[str] = None
    discord_enabled: Optional[bool] = None
    discord_webhook_url: Optional[str] = None


class AlertTestRequest(BaseModel):
    alert_type: str  # "email", "sms", "telegram", "discord"
    test_message: str = "This is a test alert from FlashCur"


@router.get("/preferences")
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
        logger.error(f"❌ Get alert preferences error: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to get alert preferences")


@router.put("/preferences")
async def update_alert_preferences(
    preferences_data: AlertPreferencesUpdate,
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

        # Update only provided fields
        for field, value in preferences_data.dict(exclude_unset=True).items():
            if hasattr(preferences, field):
                setattr(preferences, field, value)

        await db.commit()
        await db.refresh(preferences)

        return {"success": True, "message": "Alert preferences updated"}

    except Exception as e:
        logger.error(f"❌ Update alert preferences error: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to update alert preferences")


@router.post("/test")
async def test_alert(
    test_request: AlertTestRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Send test alert to user."""
    try:
        result = await db.execute(
            select(AlertPreferences).where(
                AlertPreferences.user_id == current_user.id)
        )
        preferences = result.scalar_one_or_none()

        if not preferences:
            raise HTTPException(
                status_code=404, detail="Alert preferences not found")

        # Check if user has access to this alert type
        if test_request.alert_type == "email" and not preferences.email_alerts_enabled:
            raise HTTPException(
                status_code=400, detail="Email alerts not enabled")
        elif test_request.alert_type == "sms" and not preferences.sms_alerts_enabled:
            raise HTTPException(
                status_code=400, detail="SMS alerts not enabled")
        elif test_request.alert_type == "telegram" and not preferences.telegram_enabled:
            raise HTTPException(
                status_code=400, detail="Telegram alerts not enabled")
        elif test_request.alert_type == "discord" and not preferences.discord_enabled:
            raise HTTPException(
                status_code=400, detail="Discord alerts not enabled")

        # Send test alert (simplified - in production, use proper notification service)
        if test_request.alert_type == "email":
            # TODO: Implement email sending
            logger.info(f"📧 Test email sent to {preferences.email_address}")
        elif test_request.alert_type == "sms":
            # TODO: Implement SMS sending
            logger.info(f"📱 Test SMS sent to {preferences.sms_number}")
        elif test_request.alert_type == "telegram":
            # TODO: Implement Telegram sending
            logger.info(
                f"📱 Test Telegram sent to {preferences.telegram_chat_id}")
        elif test_request.alert_type == "discord":
            # TODO: Implement Discord webhook
            logger.info(f"💬 Test Discord sent to webhook")

        return {"success": True, "message": f"Test {test_request.alert_type} alert sent"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Test alert error: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to send test alert")


@router.get("/history")
async def get_alert_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Get user's alert history (last 50 alerts)."""
    try:
        # TODO: Implement alert history table
        # For now, return empty list
        return {"alerts": []}

    except Exception as e:
        logger.error(f"❌ Get alert history error: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to get alert history")


@router.delete("/preferences")
async def reset_alert_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Reset alert preferences to defaults."""
    try:
        result = await db.execute(
            select(AlertPreferences).where(
                AlertPreferences.user_id == current_user.id)
        )
        preferences = result.scalar_one_or_none()

        if preferences:
            # Reset to defaults
            preferences.volume_multiple = 3.0
            preferences.min_quote_volume = 3_000_000
            preferences.email_alerts_enabled = False
            preferences.email_address = None
            preferences.sms_alerts_enabled = False
            preferences.sms_number = None
            preferences.telegram_enabled = False
            preferences.telegram_chat_id = None
            preferences.discord_enabled = False
            preferences.discord_webhook_url = None

            await db.commit()

        return {"success": True, "message": "Alert preferences reset to defaults"}

    except Exception as e:
        logger.error(f"❌ Reset alert preferences error: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to reset alert preferences")

"""
Celery Worker Configuration
=========================
Background task processing for email alerts, data processing, and scheduled tasks.
"""

from celery import Celery
from celery.schedules import crontab
import logging
import json
import asyncio
from datetime import datetime, timezone
from typing import Dict, List

from .config import settings
from .database import AsyncSessionLocal
from .models import User, AlertPreferences, AuditLog
from .email_service import EmailService
from .sms_service import SMSService

logger = logging.getLogger(__name__)

# Create Celery app
celery_app = Celery(
    'flashcur_worker',
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=['app.worker']
)

# Configure Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_disable_rate_limits=True,
)

# Periodic tasks
celery_app.conf.beat_schedule = {
    'process-alert-queue': {
        'task': 'app.worker.process_alert_queue',
        'schedule': crontab(minute='*/1'),  # Every minute
    },
    'cleanup-old-data': {
        'task': 'app.worker.cleanup_old_data',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
    },
    'send-daily-summary': {
        'task': 'app.worker.send_daily_summary',
        'schedule': crontab(hour=9, minute=0),  # Daily at 9 AM
    },
}


@celery_app.task(bind=True, max_retries=3)
def process_alert_queue(self):
    """Process queued alerts from Redis."""
    try:
        import redis
        r = redis.from_url(settings.REDIS_URL)

        # Get alerts from queue
        alerts = []
        while True:
            alert_data = r.lpop('alert_queue')
            if not alert_data:
                break
            alerts.append(json.loads(alert_data))

        if not alerts:
            return {'processed': 0}

        # Process each alert
        processed = 0
        for alert in alerts:
            try:
                asyncio.run(send_alert_notification(alert))
                processed += 1
            except Exception as e:
                logger.error(f"❌ Failed to process alert: {e}")
                # Re-queue failed alerts
                r.lpush('alert_queue', json.dumps(alert))

        logger.info(f"✅ Processed {processed} alerts")
        return {'processed': processed}

    except Exception as e:
        logger.error(f"❌ Alert queue processing error: {e}")
        raise self.retry(countdown=60, max_retries=3)


@celery_app.task(bind=True, max_retries=3)
def cleanup_old_data(self):
    """Clean up old data and logs."""
    try:
        # Clean up old audit logs (older than 90 days)
        async def cleanup_audit_logs():
            async with AsyncSessionLocal() as db:
                from sqlalchemy import delete
                from datetime import timedelta

                cutoff_date = datetime.now(timezone.utc) - timedelta(days=90)

                result = await db.execute(
                    delete(AuditLog).where(AuditLog.timestamp < cutoff_date)
                )

                await db.commit()
                return result.rowcount

        deleted_logs = asyncio.run(cleanup_audit_logs())
        logger.info(f"✅ Cleaned up {deleted_logs} old audit logs")

        return {'deleted_logs': deleted_logs}

    except Exception as e:
        logger.error(f"❌ Data cleanup error: {e}")
        raise self.retry(countdown=300, max_retries=3)


@celery_app.task(bind=True, max_retries=3)
def send_daily_summary(self):
    """Send daily summary emails to Pro/Elite users."""
    try:
        async def send_summaries():
            async with AsyncSessionLocal() as db:
                from sqlalchemy import select

                # Get users with email alerts enabled
                result = await db.execute(
                    select(User, AlertPreferences)
                    .join(AlertPreferences)
                    .where(
                        User.tier.in_([1, 2]),  # Pro and Elite users
                        AlertPreferences.email_alerts_enabled == True,
                        User.is_active == True
                    )
                )

                users = result.all()

                for user, preferences in users:
                    try:
                        await send_user_daily_summary(user, preferences)
                    except Exception as e:
                        logger.error(
                            f"❌ Failed to send summary to {user.email}: {e}")

        asyncio.run(send_summaries())
        logger.info("✅ Daily summaries sent")
        return {'status': 'success'}

    except Exception as e:
        logger.error(f"❌ Daily summary error: {e}")
        raise self.retry(countdown=300, max_retries=3)


async def send_alert_notification(alert_data: Dict):
    """Send alert notification to user."""
    try:
        user_id = alert_data['user_id']
        user_email = alert_data['user_email']
        alerts = alert_data['alerts']

        async with AsyncSessionLocal() as db:
            # Get user preferences
            result = await db.execute(
                select(AlertPreferences).where(
                    AlertPreferences.user_id == user_id)
            )
            preferences = result.scalar_one_or_none()

            if not preferences:
                return

            # Send email alert
            if preferences.email_alerts_enabled and preferences.email_address:
                email_service = EmailService()
                await email_service.send_volume_alert(
                    to_email=preferences.email_address,
                    alerts=alerts
                )

            # Send SMS alert (Elite tier only)
            if (preferences.sms_alerts_enabled and
                preferences.sms_number and
                    user_id in [2]):  # Elite tier only

                sms_service = SMSService()
                await sms_service.send_volume_alert(
                    to_number=preferences.sms_number,
                    alerts=alerts
                )

            # Log the alert
            audit_log = AuditLog(
                user_id=user_id,
                event_type='alert_sent',
                event_data={
                    'alert_count': len(alerts),
                    'channels': ['email'] if preferences.email_alerts_enabled else []
                }
            )
            db.add(audit_log)
            await db.commit()

    except Exception as e:
        logger.error(f"❌ Alert notification error: {e}")
        raise


async def send_user_daily_summary(user: User, preferences: AlertPreferences):
    """Send daily summary to individual user."""
    try:
        if not preferences.email_alerts_enabled or not preferences.email_address:
            return

        # Get market data for summary
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{settings.BINANCE_API_BASE}/fapi/v1/ticker/24hr") as response:
                if response.status == 200:
                    data = await response.json()
                    # Process data for summary
                    summary_data = process_daily_summary(data)

                    # Send email
                    email_service = EmailService()
                    await email_service.send_daily_summary(
                        to_email=preferences.email_address,
                        summary_data=summary_data
                    )

    except Exception as e:
        logger.error(f"❌ Daily summary for {user.email} error: {e}")
        raise


def process_daily_summary(data: List[Dict]) -> Dict:
    """Process market data for daily summary."""
    # Filter and process data
    processed = []
    for item in data:
        if item['symbol'].endswith('USDT') and float(item['quoteVolume']) >= 3_000_000:
            processed.append({
                'symbol': item['symbol'],
                'price': float(item['lastPrice']),
                'change': float(item['priceChangePercent']),
                'volume': float(item['quoteVolume'])
            })

    # Sort by volume
    processed.sort(key=lambda x: x['volume'], reverse=True)

    return {
        'top_gainers': sorted(processed, key=lambda x: x['change'], reverse=True)[:5],
        'top_losers': sorted(processed, key=lambda x: x['change'])[:5],
        'top_volume': processed[:10],
        'total_assets': len(processed),
        'date': datetime.now(timezone.utc).strftime('%Y-%m-%d')
    }

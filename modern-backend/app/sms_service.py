"""
SMS Service
===========
Twilio integration for SMS notifications (Elite tier feature).
"""

import logging
from typing import List, Dict
from twilio.rest import Client
from twilio.base.exceptions import TwilioException

from .config import settings

logger = logging.getLogger(__name__)


class SMSService:
    """SMS service using Twilio."""

    def __init__(self):
        self.client = Client(
            settings.TWILIO_ACCOUNT_SID,
            settings.TWILIO_AUTH_TOKEN
        )
        self.from_number = settings.TWILIO_PHONE_NUMBER

    async def send_volume_alert(
        self,
        to_number: str,
        alerts: List[Dict]
    ) -> bool:
        """Send volume spike alert SMS."""
        try:
            # Format alert message
            message = self._format_alert_message(alerts)

            # Send SMS
            message_obj = self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=to_number
            )

            if message_obj.sid:
                logger.info(f"✅ SMS alert sent to {to_number}")
                return True
            else:
                logger.error(f"❌ SMS send failed")
                return False

        except TwilioException as e:
            logger.error(f"❌ Twilio SMS error: {e}")
            return False
        except Exception as e:
            logger.error(f"❌ SMS service error: {e}")
            return False

    async def send_welcome_sms(self, to_number: str, user_name: str = None) -> bool:
        """Send welcome SMS to new Elite users."""
        try:
            message = f"🎉 Welcome to FlashCur Elite! You now have access to SMS alerts and priority support. Visit flashcur.com/dashboard to get started!"

            # Send SMS
            message_obj = self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=to_number
            )

            if message_obj.sid:
                logger.info(f"✅ Welcome SMS sent to {to_number}")
                return True
            else:
                logger.error(f"❌ SMS send failed")
                return False

        except TwilioException as e:
            logger.error(f"❌ Twilio SMS error: {e}")
            return False
        except Exception as e:
            logger.error(f"❌ SMS service error: {e}")
            return False

    def _format_alert_message(self, alerts: List[Dict]) -> str:
        """Format alert data into SMS message."""
        if len(alerts) == 1:
            alert = alerts[0]
            return (
                f"🚨 FlashCur Alert: {alert['symbol']} "
                f"${alert['price']:.4f} "
                f"({alert['price_change_percent']:+.2f}%) "
                f"Volume: ${alert['current_volume']:,.0f}"
            )
        else:
            # Multiple alerts - create summary
            symbols = [alert['symbol'] for alert in alerts[:3]]  # Top 3
            return (
                f"🚨 FlashCur Alert: {len(alerts)} assets spiking! "
                f"Top: {', '.join(symbols)} "
                f"View: flashcur.com/dashboard"
            )

    async def send_test_sms(self, to_number: str) -> bool:
        """Send test SMS to verify number."""
        try:
            message = "🧪 FlashCur SMS test successful! Your alerts are now active."

            message_obj = self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=to_number
            )

            if message_obj.sid:
                logger.info(f"✅ Test SMS sent to {to_number}")
                return True
            else:
                logger.error(f"❌ SMS send failed")
                return False

        except TwilioException as e:
            logger.error(f"❌ Twilio SMS error: {e}")
            return False
        except Exception as e:
            logger.error(f"❌ SMS service error: {e}")
            return False

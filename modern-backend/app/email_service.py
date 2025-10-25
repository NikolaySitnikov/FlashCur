"""
Email Service
============
SendGrid integration for email notifications and alerts.
"""

import logging
from typing import List, Dict, Optional
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from jinja2 import Template
import os

from .config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Email service using SendGrid."""

    def __init__(self):
        self.sg = SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        self.from_email = settings.FROM_EMAIL

    async def send_volume_alert(
        self,
        to_email: str,
        alerts: List[Dict],
        user_name: Optional[str] = None
    ) -> bool:
        """Send volume spike alert email."""
        try:
            subject = f"🚨 Volume Alert: {len(alerts)} assets spiking"

            # Create HTML content
            html_content = self._create_alert_html(alerts, user_name)

            message = Mail(
                from_email=Email(self.from_email, "FlashCur Alerts"),
                to_emails=To(to_email),
                subject=subject,
                html_content=Content("text/html", html_content)
            )

            response = self.sg.send(message)

            if response.status_code == 202:
                logger.info(f"✅ Alert email sent to {to_email}")
                return True
            else:
                logger.error(f"❌ Email send failed: {response.status_code}")
                return False

        except Exception as e:
            logger.error(f"❌ Email service error: {e}")
            return False

    async def send_daily_summary(
        self,
        to_email: str,
        summary_data: Dict,
        user_name: Optional[str] = None
    ) -> bool:
        """Send daily market summary email."""
        try:
            subject = f"📊 Daily Market Summary - {summary_data['date']}"

            # Create HTML content
            html_content = self._create_summary_html(summary_data, user_name)

            message = Mail(
                from_email=Email(self.from_email, "FlashCur Daily"),
                to_emails=To(to_email),
                subject=subject,
                html_content=Content("text/html", html_content)
            )

            response = self.sg.send(message)

            if response.status_code == 202:
                logger.info(f"✅ Summary email sent to {to_email}")
                return True
            else:
                logger.error(f"❌ Email send failed: {response.status_code}")
                return False

        except Exception as e:
            logger.error(f"❌ Email service error: {e}")
            return False

    async def send_welcome_email(self, to_email: str, user_name: Optional[str] = None) -> bool:
        """Send welcome email to new users."""
        try:
            subject = "🎉 Welcome to FlashCur - Your Trading Dashboard"

            html_content = self._create_welcome_html(user_name)

            message = Mail(
                from_email=Email(self.from_email, "FlashCur Team"),
                to_emails=To(to_email),
                subject=subject,
                html_content=Content("text/html", html_content)
            )

            response = self.sg.send(message)

            if response.status_code == 202:
                logger.info(f"✅ Welcome email sent to {to_email}")
                return True
            else:
                logger.error(f"❌ Email send failed: {response.status_code}")
                return False

        except Exception as e:
            logger.error(f"❌ Email service error: {e}")
            return False

    def _create_alert_html(self, alerts: List[Dict], user_name: Optional[str] = None) -> str:
        """Create HTML content for volume alerts."""
        template = Template("""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Volume Alert - FlashCur</title>
            <style>
                body { font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #00ff88, #16a34a); padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                .alert-item { background: #1e293b; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #00ff88; }
                .symbol { font-weight: bold; color: #00ff88; }
                .price { color: #f8fafc; }
                .volume { color: #94a3b8; }
                .footer { text-align: center; margin-top: 30px; color: #64748b; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🚨 Volume Alert</h1>
                    <p>Hi {{ user_name or 'Trader' }}, we detected volume spikes in {{ alerts|length }} assets!</p>
                </div>
                
                {% for alert in alerts %}
                <div class="alert-item">
                    <div class="symbol">{{ alert.symbol }}</div>
                    <div class="price">${{ "%.4f"|format(alert.price) }}</div>
                    <div class="volume">Volume: ${{ "%.0f"|format(alert.current_volume) }}</div>
                    <div class="volume">Change: {{ "%.2f"|format(alert.price_change_percent) }}%</div>
                </div>
                {% endfor %}
                
                <div class="footer">
                    <p>FlashCur - Real-time trading insights</p>
                    <p><a href="https://flashcur.com/dashboard" style="color: #00ff88;">View Dashboard</a></p>
                </div>
            </div>
        </body>
        </html>
        """)

        return template.render(alerts=alerts, user_name=user_name)

    def _create_summary_html(self, summary_data: Dict, user_name: Optional[str] = None) -> str:
        """Create HTML content for daily summary."""
        template = Template("""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Daily Summary - FlashCur</title>
            <style>
                body { font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #00ff88, #16a34a); padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                .section { background: #1e293b; padding: 20px; margin: 15px 0; border-radius: 6px; }
                .section h3 { color: #00ff88; margin-top: 0; }
                .asset { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #334155; }
                .asset:last-child { border-bottom: none; }
                .symbol { font-weight: bold; }
                .positive { color: #22c55e; }
                .negative { color: #ef4444; }
                .footer { text-align: center; margin-top: 30px; color: #64748b; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📊 Daily Market Summary</h1>
                    <p>Hi {{ user_name or 'Trader' }}, here's your market overview for {{ summary_data.date }}.</p>
                </div>
                
                <div class="section">
                    <h3>📈 Top Gainers</h3>
                    {% for asset in summary_data.top_gainers %}
                    <div class="asset">
                        <span class="symbol">{{ asset.symbol }}</span>
                        <span class="positive">+{{ "%.2f"|format(asset.change) }}%</span>
                    </div>
                    {% endfor %}
                </div>
                
                <div class="section">
                    <h3>📉 Top Losers</h3>
                    {% for asset in summary_data.top_losers %}
                    <div class="asset">
                        <span class="symbol">{{ asset.symbol }}</span>
                        <span class="negative">{{ "%.2f"|format(asset.change) }}%</span>
                    </div>
                    {% endfor %}
                </div>
                
                <div class="section">
                    <h3>🔥 Top Volume</h3>
                    {% for asset in summary_data.top_volume %}
                    <div class="asset">
                        <span class="symbol">{{ asset.symbol }}</span>
                        <span>${{ "%.0f"|format(asset.volume) }}</span>
                    </div>
                    {% endfor %}
                </div>
                
                <div class="footer">
                    <p>FlashCur - Real-time trading insights</p>
                    <p><a href="https://flashcur.com/dashboard" style="color: #00ff88;">View Dashboard</a></p>
                </div>
            </div>
        </body>
        </html>
        """)

        return template.render(summary_data=summary_data, user_name=user_name)

    def _create_welcome_html(self, user_name: Optional[str] = None) -> str:
        """Create HTML content for welcome email."""
        template = Template("""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to FlashCur</title>
            <style>
                body { font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #00ff88, #16a34a); padding: 30px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
                .content { background: #1e293b; padding: 30px; border-radius: 6px; }
                .feature { margin: 20px 0; padding: 15px; background: #334155; border-radius: 4px; }
                .button { display: inline-block; background: #00ff88; color: #0f172a; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
                .footer { text-align: center; margin-top: 30px; color: #64748b; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Welcome to FlashCur!</h1>
                    <p>Hi {{ user_name or 'Trader' }}, you're now part of the FlashCur community!</p>
                </div>
                
                <div class="content">
                    <h2>What you can do with FlashCur:</h2>
                    
                    <div class="feature">
                        <h3>📊 Real-time Dashboard</h3>
                        <p>Monitor Binance perpetual futures with live data updates and volume analysis.</p>
                    </div>
                    
                    <div class="feature">
                        <h3>🚨 Volume Alerts</h3>
                        <p>Get notified when assets experience unusual volume spikes (Pro/Elite feature).</p>
                    </div>
                    
                    <div class="feature">
                        <h3>🔗 Web3 Integration</h3>
                        <p>Connect your crypto wallet for seamless authentication and trading insights.</p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://flashcur.com/dashboard" class="button">Start Trading</a>
                    </div>
                </div>
                
                <div class="footer">
                    <p>FlashCur - Real-time trading insights</p>
                    <p>Questions? Reply to this email or visit our <a href="https://flashcur.com/support" style="color: #00ff88;">support center</a>.</p>
                </div>
            </div>
        </body>
        </html>
        """)

        return template.render(user_name=user_name)

"""
Forms for Binance Dashboard Settings
─────────────────────────────────────
Flask-WTF forms for Pro tier customization and settings.
"""

from flask_wtf import FlaskForm
from wtforms import StringField, IntegerField, FloatField, SelectField, BooleanField, TextAreaField
from wtforms.validators import DataRequired, NumberRange, Length, Optional
from wtforms.widgets import TextArea


class AlertSettingsForm(FlaskForm):
    """Form for Pro tier alert customization."""

    # Volume Alert Settings
    volume_multiple = FloatField(
        'Volume Spike Multiple',
        validators=[NumberRange(min=1.0, max=10.0)],
        default=3.0,
        description="Alert when volume is X times the average (1.0-10.0)"
    )

    min_quote_volume = IntegerField(
        'Minimum Quote Volume ($)',
        validators=[NumberRange(min=100000, max=10000000)],
        default=3000000,
        description="Only alert for assets with volume above this amount"
    )

    # Email Notifications
    email_alerts = BooleanField(
        'Email Notifications',
        default=True,
        description="Receive email alerts for volume spikes"
    )

    # Alert History
    alert_history_limit = IntegerField(
        'Alert History Limit',
        validators=[NumberRange(min=10, max=100)],
        default=30,
        description="Number of alerts to keep in history (10-100)"
    )


class DisplaySettingsForm(FlaskForm):
    """Form for display and UI customization."""

    # Refresh Settings
    auto_refresh_interval = IntegerField(
        'Auto Refresh Interval (minutes)',
        validators=[NumberRange(min=1, max=30)],
        default=5,
        description="How often to refresh data automatically (1-30 minutes)"
    )

    # Display Options
    show_ads = BooleanField(
        'Show Advertisements',
        default=False,
        description="Display promotional content (Pro users can disable)"
    )

    # Data Columns
    show_price_change = BooleanField(
        'Show 24h Price Change',
        default=True,
        description="Display 24-hour price change percentage"
    )

    show_open_interest = BooleanField(
        'Show Open Interest',
        default=True,
        description="Display open interest data"
    )


class ExportSettingsForm(FlaskForm):
    """Form for export and data access settings."""

    # Export Format
    default_export_format = SelectField(
        'Default Export Format',
        choices=[
            ('txt', 'Text (.txt)'),
            ('csv', 'CSV (.csv)'),
            ('json', 'JSON (.json)')
        ],
        default='csv',
        description="Default format for watchlist exports"
    )

    # Export Limits
    max_export_assets = IntegerField(
        'Maximum Export Assets',
        validators=[NumberRange(min=50, max=1000)],
        default=1000,
        description="Maximum number of assets to include in exports"
    )

    # API Access
    enable_api_access = BooleanField(
        'Enable API Access',
        default=False,
        description="Allow programmatic access to your data (Elite tier feature)"
    )


class NotificationSettingsForm(FlaskForm):
    """Form for notification preferences."""

    # Email Settings
    email_frequency = SelectField(
        'Email Alert Frequency',
        choices=[
            ('immediate', 'Immediate'),
            ('hourly', 'Hourly Digest'),
            ('daily', 'Daily Digest')
        ],
        default='immediate',
        description="How often to receive email notifications"
    )

    # Alert Types
    volume_spike_alerts = BooleanField(
        'Volume Spike Alerts',
        default=True,
        description="Get notified of unusual volume activity"
    )

    funding_rate_alerts = BooleanField(
        'Funding Rate Alerts',
        default=False,
        description="Get notified of extreme funding rates"
    )

    # Quiet Hours
    quiet_hours_enabled = BooleanField(
        'Enable Quiet Hours',
        default=False,
        description="Disable notifications during specified hours"
    )

    quiet_start_hour = IntegerField(
        'Quiet Hours Start',
        validators=[NumberRange(min=0, max=23)],
        default=22,
        description="Hour to start quiet period (0-23)"
    )

    quiet_end_hour = IntegerField(
        'Quiet Hours End',
        validators=[NumberRange(min=0, max=23)],
        default=8,
        description="Hour to end quiet period (0-23)"
    )


class AdvancedSettingsForm(FlaskForm):
    """Form for advanced Pro tier features."""

    # Custom Filters
    custom_filters = TextAreaField(
        'Custom Filters (JSON)',
        validators=[Optional(), Length(max=1000)],
        description="Advanced filtering options in JSON format",
        widget=TextArea(),
        render_kw={
            'rows': 4, 'placeholder': '{"min_funding_rate": -0.01, "max_funding_rate": 0.01}'}
    )

    # Data Retention
    data_retention_days = IntegerField(
        'Data Retention (days)',
        validators=[NumberRange(min=7, max=365)],
        default=30,
        description="How long to keep historical data (7-365 days)"
    )

    # Performance Settings
    max_concurrent_requests = IntegerField(
        'Max Concurrent API Requests',
        validators=[NumberRange(min=1, max=10)],
        default=3,
        description="Maximum simultaneous API requests (1-10)"
    )

    # Debug Mode
    debug_mode = BooleanField(
        'Debug Mode',
        default=False,
        description="Enable detailed logging and error reporting"
    )

"""
Settings Module for Binance Dashboard
─────────────────────────────────────
Handles Pro tier customization and user preferences.
"""

from flask import Blueprint, render_template, request, jsonify, flash, redirect, url_for
from flask_login import login_required, current_user
from models import db, User
from forms import (
    AlertSettingsForm,
    DisplaySettingsForm,
    ExportSettingsForm,
    NotificationSettingsForm,
    AdvancedSettingsForm
)
import logging

# Create settings blueprint
settings_bp = Blueprint('settings', __name__)

# Configure logging
logger = logging.getLogger(__name__)


@settings_bp.route('/settings')
@login_required
def settings():
    """
    Settings page for Pro tier users.
    Only accessible to Pro and Elite tier users.
    """
    # Check if user has Pro tier access
    if not current_user.is_paid_tier:
        # Only flash if not already redirected from this route
        if not request.args.get('redirected'):
            flash("You need a Pro or Elite subscription to access settings.", "warning")
        return redirect(url_for('pricing') + '?from=settings')

    # Initialize forms with current user preferences
    alert_form = AlertSettingsForm()
    display_form = DisplaySettingsForm()
    export_form = ExportSettingsForm()
    notification_form = NotificationSettingsForm()
    advanced_form = AdvancedSettingsForm()

    # Populate forms with current user preferences
    _populate_forms_with_preferences(
        alert_form, display_form, export_form,
        notification_form, advanced_form
    )

    return render_template('settings.html',
                           alert_form=alert_form,
                           display_form=display_form,
                           export_form=export_form,
                           notification_form=notification_form,
                           advanced_form=advanced_form,
                           current_user=current_user)


@settings_bp.route('/settings/update', methods=['POST'])
@login_required
def update_settings():
    """
    Update user settings based on form submission.
    """
    if not current_user.is_paid_tier:
        return jsonify({'success': False, 'error': 'Pro tier required'}), 403

    try:
        # Get the form type from the request
        form_type = request.form.get('form_type')

        if form_type == 'alert':
            form = AlertSettingsForm(request.form)
            if form.validate_on_submit():
                _update_alert_settings(form)
                flash("Alert settings updated successfully!", "success")
            else:
                flash("Invalid alert settings. Please check your inputs.", "error")

        elif form_type == 'display':
            form = DisplaySettingsForm(request.form)
            if form.validate_on_submit():
                _update_display_settings(form)
                flash("Display settings updated successfully!", "success")
            else:
                flash("Invalid display settings. Please check your inputs.", "error")

        elif form_type == 'export':
            form = ExportSettingsForm(request.form)
            if form.validate_on_submit():
                _update_export_settings(form)
                flash("Export settings updated successfully!", "success")
            else:
                flash("Invalid export settings. Please check your inputs.", "error")

        elif form_type == 'notification':
            form = NotificationSettingsForm(request.form)
            if form.validate_on_submit():
                _update_notification_settings(form)
                flash("Notification settings updated successfully!", "success")
            else:
                flash(
                    "Invalid notification settings. Please check your inputs.", "error")

        elif form_type == 'advanced':
            form = AdvancedSettingsForm(request.form)
            if form.validate_on_submit():
                _update_advanced_settings(form)
                flash("Advanced settings updated successfully!", "success")
            else:
                flash("Invalid advanced settings. Please check your inputs.", "error")
        else:
            flash("Invalid form type.", "error")

    except Exception as e:
        logger.error(
            f"Error updating settings for user {current_user.email}: {str(e)}")
        flash("An error occurred while updating settings.", "error")

    return redirect(url_for('settings.settings'))


@settings_bp.route('/api/preferences')
@login_required
def get_preferences():
    """
    API endpoint to get user preferences as JSON.
    Used by frontend JavaScript for dynamic updates.
    """
    if not current_user.is_paid_tier:
        return jsonify({'error': 'Pro tier required'}), 403

    return jsonify({
        'success': True,
        'preferences': current_user.preferences or {}
    })


@settings_bp.route('/api/preferences', methods=['POST'])
@login_required
def update_preferences():
    """
    API endpoint to update user preferences via JSON.
    Used by frontend JavaScript for real-time updates.
    """
    if not current_user.is_paid_tier:
        return jsonify({'error': 'Pro tier required'}), 403

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Update preferences
        current_user.update_preferences(data)
        db.session.commit()

        logger.info(f"Updated preferences for user {current_user.email}")
        return jsonify({'success': True, 'message': 'Preferences updated'})

    except Exception as e:
        logger.error(
            f"Error updating preferences for user {current_user.email}: {str(e)}")
        return jsonify({'error': 'Failed to update preferences'}), 500


def _populate_forms_with_preferences(alert_form, display_form, export_form, notification_form, advanced_form):
    """Populate forms with current user preferences."""
    prefs = current_user.preferences or {}

    # Alert settings
    alert_form.volume_multiple.data = prefs.get('volume_multiple', 3.0)
    alert_form.min_quote_volume.data = prefs.get('min_quote_volume', 3000000)
    alert_form.email_alerts.data = prefs.get('email_alerts', True)
    alert_form.alert_history_limit.data = prefs.get('alert_history_limit', 30)

    # Display settings
    display_form.auto_refresh_interval.data = prefs.get(
        'auto_refresh_interval', 5)
    display_form.show_ads.data = prefs.get('show_ads', False)
    display_form.show_price_change.data = prefs.get('show_price_change', True)
    display_form.show_open_interest.data = prefs.get(
        'show_open_interest', True)

    # Export settings
    export_form.default_export_format.data = prefs.get(
        'default_export_format', 'csv')
    export_form.max_export_assets.data = prefs.get('max_export_assets', 1000)
    export_form.enable_api_access.data = prefs.get('enable_api_access', False)

    # Notification settings
    notification_form.email_frequency.data = prefs.get(
        'email_frequency', 'immediate')
    notification_form.volume_spike_alerts.data = prefs.get(
        'volume_spike_alerts', True)
    notification_form.funding_rate_alerts.data = prefs.get(
        'funding_rate_alerts', False)
    notification_form.quiet_hours_enabled.data = prefs.get(
        'quiet_hours_enabled', False)
    notification_form.quiet_start_hour.data = prefs.get('quiet_start_hour', 22)
    notification_form.quiet_end_hour.data = prefs.get('quiet_end_hour', 8)

    # Advanced settings
    advanced_form.custom_filters.data = prefs.get('custom_filters', '')
    advanced_form.data_retention_days.data = prefs.get(
        'data_retention_days', 30)
    advanced_form.max_concurrent_requests.data = prefs.get(
        'max_concurrent_requests', 3)
    advanced_form.debug_mode.data = prefs.get('debug_mode', False)


def _update_alert_settings(form):
    """Update alert-related settings."""
    current_user.set_preference('volume_multiple', form.volume_multiple.data)
    current_user.set_preference('min_quote_volume', form.min_quote_volume.data)
    current_user.set_preference('email_alerts', form.email_alerts.data)
    current_user.set_preference(
        'alert_history_limit', form.alert_history_limit.data)
    db.session.commit()


def _update_display_settings(form):
    """Update display-related settings."""
    current_user.set_preference(
        'auto_refresh_interval', form.auto_refresh_interval.data)
    current_user.set_preference('show_ads', form.show_ads.data)
    current_user.set_preference(
        'show_price_change', form.show_price_change.data)
    current_user.set_preference(
        'show_open_interest', form.show_open_interest.data)
    db.session.commit()


def _update_export_settings(form):
    """Update export-related settings."""
    current_user.set_preference(
        'default_export_format', form.default_export_format.data)
    current_user.set_preference(
        'max_export_assets', form.max_export_assets.data)
    current_user.set_preference(
        'enable_api_access', form.enable_api_access.data)
    db.session.commit()


def _update_notification_settings(form):
    """Update notification-related settings."""
    current_user.set_preference('email_frequency', form.email_frequency.data)
    current_user.set_preference(
        'volume_spike_alerts', form.volume_spike_alerts.data)
    current_user.set_preference(
        'funding_rate_alerts', form.funding_rate_alerts.data)
    current_user.set_preference(
        'quiet_hours_enabled', form.quiet_hours_enabled.data)
    current_user.set_preference('quiet_start_hour', form.quiet_start_hour.data)
    current_user.set_preference('quiet_end_hour', form.quiet_end_hour.data)
    db.session.commit()


def _update_advanced_settings(form):
    """Update advanced settings."""
    current_user.set_preference('custom_filters', form.custom_filters.data)
    current_user.set_preference(
        'data_retention_days', form.data_retention_days.data)
    current_user.set_preference(
        'max_concurrent_requests', form.max_concurrent_requests.data)
    current_user.set_preference('debug_mode', form.debug_mode.data)
    db.session.commit()

"""
Payments Module for Binance Dashboard
──────────────────────────────────────
Handles Stripe payment integration for Pro and Elite tiers.

Features:
- Stripe Checkout session creation
- Webhook handling for subscription events
- Subscription management (create, update, cancel)
- Customer management
- Audit logging for all payment events
"""

import stripe
from flask import current_app, request
from typing import Tuple, Optional, Dict
import logging
from datetime import datetime, timezone

# Get logger (will be configured by app.py)
logger = logging.getLogger('payments')


# ══════════════════════════════════════════════════════════════════════════════
# STRIPE INITIALIZATION
# ══════════════════════════════════════════════════════════════════════════════

def init_stripe() -> bool:
    """
    Initialize Stripe with API key from config.

    Returns:
        True if initialized successfully, False otherwise
    """
    try:
        stripe_key = current_app.config.get('STRIPE_SECRET_KEY')

        if not stripe_key:
            logger.warning(
                "⚠️ STRIPE_SECRET_KEY not configured. Payment features disabled.")
            return False

        stripe.api_key = stripe_key
        logger.info("✅ Stripe API initialized")
        return True

    except Exception as e:
        logger.error(f"❌ Failed to initialize Stripe: {e}")
        return False


def is_stripe_configured() -> bool:
    """
    Check if Stripe is properly configured.

    Returns:
        True if Stripe keys are set, False otherwise
    """
    stripe_key = current_app.config.get('STRIPE_SECRET_KEY')
    stripe_pub_key = current_app.config.get('STRIPE_PUBLISHABLE_KEY')

    return bool(stripe_key and stripe_pub_key)


# ══════════════════════════════════════════════════════════════════════════════
# CUSTOMER MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════

def get_or_create_customer(user) -> Tuple[Optional[str], Optional[str]]:
    """
    Get existing Stripe customer ID or create new customer.

    Args:
        user: User model instance

    Returns:
        Tuple of (customer_id: str, error_message: str)

    Example:
        >>> customer_id, error = get_or_create_customer(user)
        >>> if customer_id:
        ...     print(f"Customer ID: {customer_id}")
    """
    try:
        # Debug logging
        logger.info(
            f"get_or_create_customer called with user type: {type(user)}")
        if hasattr(user, 'id'):
            logger.info(f"User ID: {user.id}, Email: {user.email}")
        else:
            logger.error(f"User object missing 'id' attribute: {user}")
            return None, "Invalid user object"
        # Check if user already has a Stripe customer ID
        if user.stripe_customer_id:
            # Verify customer still exists in Stripe
            try:
                customer = stripe.Customer.retrieve(user.stripe_customer_id)
                if customer.get('deleted'):
                    # Customer was deleted, create new one
                    logger.warning(
                        f"Customer {user.stripe_customer_id} was deleted, creating new one")
                else:
                    return user.stripe_customer_id, None
            except stripe.error.InvalidRequestError:
                # Customer doesn't exist, create new one
                logger.warning(
                    f"Customer {user.stripe_customer_id} not found, creating new one")

        # Create new Stripe customer
        logger.info(
            f"Creating Stripe customer for user: {user.email}, tier: {user.tier}, tier_name: {user.tier_name}")
        customer = stripe.Customer.create(
            email=user.email,
            metadata={
                'user_id': user.id,
                'tier': user.tier,
                'tier_name': user.tier_name
            }
        )

        customer_id = customer.id

        # Update user with customer ID
        from models import db
        user.stripe_customer_id = customer_id
        db.session.commit()

        logger.info(
            f"✅ Created Stripe customer {customer_id} for user {user.email}")

        return customer_id, None

    except Exception as e:
        error_msg = f"Failed to create/retrieve Stripe customer: {str(e)}"
        logger.error(f"❌ {error_msg}")
        return None, error_msg


# ══════════════════════════════════════════════════════════════════════════════
# CHECKOUT SESSION MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════

def create_checkout_session(
    user,
    tier: int,
    billing_cycle: str,
    success_url: str,
    cancel_url: str
) -> Tuple[Optional[str], Optional[str]]:
    """
    Create a Stripe Checkout session for subscription payment.

    Args:
        user: User model instance
        tier: Target tier (1=Pro, 2=Elite)
        billing_cycle: 'monthly' or 'yearly'
        success_url: URL to redirect after successful payment
        cancel_url: URL to redirect if payment is canceled

    Returns:
        Tuple of (checkout_session_id: str, error_message: str)

    Example:
        >>> session_id, error = create_checkout_session(
        ...     user=current_user,
        ...     tier=1,
        ...     billing_cycle='monthly',
        ...     success_url='https://example.com/success',
        ...     cancel_url='https://example.com/cancel'
        ... )
    """
    try:
        # Initialize Stripe
        if not init_stripe():
            return None, "Stripe not configured"

        # Get or create Stripe customer
        logger.info(
            f"Getting/creating customer for user: {user.email} (ID: {user.id})")
        customer_id, error = get_or_create_customer(user)
        if error:
            logger.error(f"Failed to get/create customer: {error}")
            return None, error
        logger.info(f"Customer ID: {customer_id}")

        # Get price ID from config
        from config import STRIPE_PRODUCTS

        price_key_map = {
            (1, 'monthly'): 'pro_monthly',
            (1, 'yearly'): 'pro_yearly',
            (2, 'monthly'): 'elite_monthly',
            (2, 'yearly'): 'elite_yearly',
        }

        price_key = price_key_map.get((tier, billing_cycle))
        if not price_key:
            return None, f"Invalid tier ({tier}) or billing cycle ({billing_cycle})"

        price_id = STRIPE_PRODUCTS.get(price_key)
        if not price_id:
            return None, f"Stripe price ID not configured for {price_key}"

        # Create checkout session
        session_metadata = {
            'user_id': str(user.id),  # Convert to string for Stripe
            'tier': str(tier),
            'billing_cycle': billing_cycle
        }

        logger.info(f"🔍 Creating checkout with metadata: {session_metadata}")

        checkout_session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=session_metadata,
            # Allow promotion codes (coupons)
            allow_promotion_codes=True,
            # Automatically send invoice emails
            subscription_data={
                'metadata': session_metadata  # Use same metadata object
            }
        )

        logger.info(
            f"✅ Created checkout session {checkout_session.id} for user {user.email}")
        logger.info(f"🔍 Session metadata: {checkout_session.metadata}")
        logger.info(
            f"🔍 Subscription data: {checkout_session.get('subscription_data', {})}")

        # Log event
        from models import log_event
        try:
            log_event(
                event_type='checkout_session_created',
                user_id=user.id,
                event_data={
                    'session_id': checkout_session.id,
                    'tier': tier,
                    'billing_cycle': billing_cycle,
                    'price_id': price_id
                },
                ip_address=request.remote_addr if request else None,
                user_agent=request.headers.get(
                    'User-Agent') if request else None
            )
        except Exception as log_error:
            logger.warning(f"Failed to log event: {log_error}")
            # Continue without logging

        return checkout_session.id, None

    except Exception as e:
        error_msg = f"Failed to create checkout session: {str(e)}"
        logger.error(f"❌ {error_msg}")
        return None, error_msg


# ══════════════════════════════════════════════════════════════════════════════
# SUBSCRIPTION MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════

def handle_subscription_created(subscription_data: Dict) -> bool:
    """
    Handle subscription.created webhook event.

    Args:
        subscription_data: Stripe subscription object

    Returns:
        True if handled successfully, False otherwise
    """
    try:
        from models import db, User, Subscription, log_event

        subscription_id = subscription_data['id']
        customer_id = subscription_data['customer']
        status = subscription_data['status']

        # Get metadata
        metadata = subscription_data.get('metadata', {})
        user_id_raw = metadata.get('user_id')
        tier = int(metadata.get('tier', 0))
        billing_cycle = metadata.get('billing_cycle', 'monthly')

        # Debug logging
        logger.info(f"🔍 DEBUG: Starting handle_subscription_created")
        logger.info(f"🔍 Subscription {subscription_id} metadata: {metadata}")
        logger.info(f"🔍 Customer ID: {customer_id}")

        if not user_id_raw:
            logger.warning(
                f"⚠️ Subscription {subscription_id} missing user_id in metadata, trying customer ID lookup")
            # Try to find user by customer ID
            user = User.query.filter_by(stripe_customer_id=customer_id).first()
            if not user:
                logger.error(
                    f"❌ No user found for customer ID {customer_id}")
                return False
            user_id = user.id
            logger.info(
                f"✅ Found user {user.email} (ID: {user_id}) by customer ID")
        else:
            # Cast user_id to int (metadata comes as string)
            try:
                user_id = int(user_id_raw)
            except (TypeError, ValueError):
                logger.error(
                    f"❌ Invalid user_id in subscription metadata: {user_id_raw!r}")
                return False

            # Get user
            user = User.query.get(user_id)
            if not user:
                logger.error(
                    f"❌ User {user_id} not found for subscription {subscription_id}")
                return False

        # Get price ID (safely)
        items = subscription_data.get('items', {}).get('data', [])
        if not items:
            logger.error(f"❌ Subscription {subscription_id} has no items")
            return False
        price_id = items[0].get('price', {}).get('id')
        if not price_id:
            logger.error(f"❌ Subscription {subscription_id} has no price ID")
            return False

        # Get billing period (safely, may not exist in test events)
        current_period_start = subscription_data.get('current_period_start')
        current_period_end = subscription_data.get('current_period_end')

        if current_period_start:
            current_period_start = datetime.fromtimestamp(
                current_period_start, tz=timezone.utc)
        else:
            # Use current time as fallback for test events
            current_period_start = datetime.now(timezone.utc)
            logger.warning(
                f"⚠️ Subscription {subscription_id} missing current_period_start, using current time")

        if current_period_end:
            current_period_end = datetime.fromtimestamp(
                current_period_end, tz=timezone.utc)
        else:
            # Use 30 days from now as fallback for test events
            from datetime import timedelta
            current_period_end = current_period_start + timedelta(days=30)
            logger.warning(
                f"⚠️ Subscription {subscription_id} missing current_period_end, using 30 days from start")

        # Create subscription record
        subscription = Subscription(
            user_id=user.id,
            stripe_subscription_id=subscription_id,
            stripe_customer_id=customer_id,
            stripe_price_id=price_id,
            status=status,
            tier=tier,
            billing_cycle=billing_cycle,
            current_period_start=current_period_start,
            current_period_end=current_period_end
        )

        db.session.add(subscription)

        # Update user tier if subscription is active
        if status == 'active':
            user.upgrade_tier(tier)
            user.subscription_expires_at = current_period_end

        db.session.commit()

        # Log event
        log_event(
            event_type='subscription_created',
            user_id=user.id,
            event_data={
                'subscription_id': subscription_id,
                'tier': tier,
                'billing_cycle': billing_cycle,
                'status': status
            }
        )
        db.session.commit()

        logger.info(
            f"✅ Subscription {subscription_id} created for user {user.email} (Tier: {tier})")

        return True

    except Exception as e:
        logger.exception(f"❌ Failed to handle subscription.created: {e}")
        from models import db
        db.session.rollback()
        return False


def handle_subscription_updated(subscription_data: Dict) -> bool:
    """
    Handle subscription.updated webhook event.

    Args:
        subscription_data: Stripe subscription object

    Returns:
        True if handled successfully, False otherwise
    """
    try:
        from models import db, Subscription, log_event

        subscription_id = subscription_data['id']
        status = subscription_data['status']

        # Find subscription in database
        subscription = Subscription.query.filter_by(
            stripe_subscription_id=subscription_id
        ).first()

        if not subscription:
            logger.warning(
                f"⚠️ Subscription {subscription_id} not found in database")
            # Try to create it
            return handle_subscription_created(subscription_data)

        # Update subscription details
        subscription.status = status

        # Update periods if present (may not exist in test events)
        if subscription_data.get('current_period_start'):
            subscription.current_period_start = datetime.fromtimestamp(
                subscription_data['current_period_start'],
                tz=timezone.utc
            )
        if subscription_data.get('current_period_end'):
            subscription.current_period_end = datetime.fromtimestamp(
                subscription_data['current_period_end'],
                tz=timezone.utc
            )
        subscription.cancel_at_period_end = subscription_data.get(
            'cancel_at_period_end', False)

        if subscription_data.get('canceled_at'):
            subscription.canceled_at = datetime.fromtimestamp(
                subscription_data['canceled_at'],
                tz=timezone.utc
            )

        # Update user tier based on status
        user = subscription.user
        if status == 'active':
            user.upgrade_tier(subscription.tier)
            user.subscription_expires_at = subscription.current_period_end
        elif status in ['canceled', 'unpaid', 'past_due']:
            # Downgrade to free tier
            user.downgrade_tier(0)
            user.subscription_expires_at = None

        db.session.commit()

        # Log event
        log_event(
            event_type='subscription_updated',
            user_id=user.id,
            event_data={
                'subscription_id': subscription_id,
                'status': status,
                'cancel_at_period_end': subscription.cancel_at_period_end
            }
        )
        db.session.commit()

        logger.info(
            f"✅ Subscription {subscription_id} updated for user {user.email} (Status: {status})")

        return True

    except Exception as e:
        logger.error(f"❌ Failed to handle subscription.updated: {e}")
        from models import db
        db.session.rollback()
        return False


def handle_subscription_deleted(subscription_data: Dict) -> bool:
    """
    Handle subscription.deleted webhook event (subscription canceled).

    Args:
        subscription_data: Stripe subscription object

    Returns:
        True if handled successfully, False otherwise
    """
    try:
        from models import db, Subscription, log_event

        subscription_id = subscription_data['id']

        # Find subscription in database
        subscription = Subscription.query.filter_by(
            stripe_subscription_id=subscription_id
        ).first()

        if not subscription:
            logger.warning(
                f"⚠️ Subscription {subscription_id} not found in database")
            return False

        # Update subscription status
        subscription.status = 'canceled'
        subscription.canceled_at = datetime.now(timezone.utc)

        # Downgrade user to free tier
        user = subscription.user
        user.downgrade_tier(0)
        user.subscription_expires_at = None

        db.session.commit()

        # Log event
        log_event(
            event_type='subscription_canceled',
            user_id=user.id,
            event_data={
                'subscription_id': subscription_id
            }
        )
        db.session.commit()

        logger.info(
            f"✅ Subscription {subscription_id} canceled for user {user.email}")

        return True

    except Exception as e:
        logger.error(f"❌ Failed to handle subscription.deleted: {e}")
        from models import db
        db.session.rollback()
        return False


def handle_invoice_paid(invoice_data: Dict) -> bool:
    """
    Handle invoice.paid webhook event (payment successful).
    Upgrade user tier and sync subscription when a payment succeeds.

    Args:
        invoice_data: Stripe invoice object

    Returns:
        True if handled successfully, False otherwise
    """
    try:
        from models import db, Subscription, log_event

        # 1) Identify which subscription this invoice is for
        subscription_id = invoice_data.get('subscription')
        if not subscription_id:
            logger.error("❌ invoice.paid missing 'subscription' field")
            return False

        # 2) Load our Subscription row
        subscription = Subscription.query.filter_by(
            stripe_subscription_id=subscription_id
        ).first()

        if not subscription:
            logger.warning(f"⚠️ No local Subscription for {subscription_id}. "
                           "Cannot upgrade user without subscription record.")
            return False

        # 3) Upgrade the user now that payment succeeded
        user = subscription.user
        if not user:
            logger.error(
                f"❌ Subscription {subscription_id} has no associated user")
            return False

        # Amount sanity (optional)
        amount_paid = (invoice_data.get('amount_paid') or 0) / 100.0

        # Keep our local period in sync if present on invoice
        lines = invoice_data.get('lines', {}).get('data', [])
        current_period_end = None
        if lines:
            # Take the first sub line (usual for simple subscriptions)
            period = lines[0].get('period', {})
            current_period_end = period.get('end')  # epoch seconds

        # ⬇️ The important part: upgrade + set expiry
        user.upgrade_tier(subscription.tier)
        if current_period_end:
            from datetime import datetime, timezone
            user.subscription_expires_at = datetime.fromtimestamp(
                current_period_end, tz=timezone.utc)

        db.session.commit()

        # 4) Audit log (optional but useful)
        log_event(
            event_type='payment_success',
            user_id=user.id,
            event_data={
                'subscription_id': subscription_id,
                'invoice_id': invoice_data.get('id'),
                'amount': amount_paid,
                'tier': subscription.tier,
            }
        )
        db.session.commit()

        logger.info(
            f"✅ Payment recorded and user {user.email} upgraded to tier {subscription.tier} (${amount_paid:.2f})")

        return True

    except Exception as e:
        logger.exception(f"❌ Failed to handle invoice.paid: {e}")
        try:
            from models import db
            db.session.rollback()
        except Exception:
            pass
        return False


def handle_invoice_payment_failed(invoice_data: Dict) -> bool:
    """
    Handle invoice.payment_failed webhook event (payment failed).

    Args:
        invoice_data: Stripe invoice object

    Returns:
        True if handled successfully, False otherwise
    """
    try:
        from models import log_event

        subscription_id = invoice_data.get('subscription')
        amount_due = invoice_data.get(
            'amount_due', 0) / 100  # Convert cents to dollars

        # Get user from subscription
        from models import Subscription
        subscription = Subscription.query.filter_by(
            stripe_subscription_id=subscription_id
        ).first()

        if not subscription:
            logger.warning(
                f"⚠️ Subscription {subscription_id} not found for failed invoice")
            return False

        # Log payment failure
        log_event(
            event_type='payment_failed',
            user_id=subscription.user_id,
            event_data={
                'subscription_id': subscription_id,
                'invoice_id': invoice_data['id'],
                'amount': amount_due,
                'currency': invoice_data.get('currency', 'usd')
            }
        )

        from models import db
        db.session.commit()

        logger.warning(
            f"⚠️ Payment of ${amount_due:.2f} failed for subscription {subscription_id}")

        # TODO: Send email notification to user about failed payment

        return True

    except Exception as e:
        logger.error(f"❌ Failed to handle invoice.payment_failed: {e}")
        return False


# ══════════════════════════════════════════════════════════════════════════════
# WEBHOOK HANDLING
# ══════════════════════════════════════════════════════════════════════════════

def handle_webhook(payload: bytes, sig_header: str) -> Tuple[bool, Optional[str]]:
    """
    Handle Stripe webhook events.

    Args:
        payload: Raw request body bytes
        sig_header: Stripe signature header (Stripe-Signature)

    Returns:
        Tuple of (success: bool, error_message: str)

    Example:
        >>> success, error = handle_webhook(request.data, request.headers.get('Stripe-Signature'))
    """
    try:
        # Initialize Stripe
        if not init_stripe():
            return False, "Stripe not configured"

        # Get webhook secret from config
        webhook_secret = current_app.config.get('STRIPE_WEBHOOK_SECRET')

        if not webhook_secret:
            logger.error("❌ STRIPE_WEBHOOK_SECRET not configured")
            return False, "Webhook secret not configured"

        # Verify webhook signature
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
        except ValueError as e:
            # Invalid payload
            logger.error(f"❌ Invalid webhook payload: {e}")
            return False, "Invalid payload"
        except stripe.error.SignatureVerificationError as e:
            # Invalid signature
            logger.error(f"❌ Invalid webhook signature: {e}")
            return False, "Invalid signature"

        # Handle event
        event_type = event['type']
        event_data = event['data']['object']

        logger.info(f"📥 Received webhook: {event_type}")
        logger.info(f"🔍 Event data keys: {list(event_data.keys())}")

        # Add debug logging for subscription events
        if event_type == 'customer.subscription.created':
            logger.info(
                f"🔍 Subscription metadata: {event_data.get('metadata', {})}")
            logger.info(
                f"🔍 Subscription customer: {event_data.get('customer')}")

        # Route to appropriate handler
        handlers = {
            'checkout.session.completed': lambda: handle_checkout_completed(event_data),
            'customer.subscription.created': lambda: handle_subscription_created(event_data),
            'customer.subscription.updated': lambda: handle_subscription_updated(event_data),
            'customer.subscription.deleted': lambda: handle_subscription_deleted(event_data),
            'invoice.paid': lambda: handle_invoice_paid(event_data),
            'invoice.payment_failed': lambda: handle_invoice_payment_failed(event_data),
        }

        handler = handlers.get(event_type)
        if handler:
            logger.info(f"🔍 Calling handler for {event_type}")
            success = handler()
            if success:
                logger.info(f"✅ Successfully handled {event_type}")
                return True, None
            else:
                logger.error(f"❌ Failed to handle {event_type}")
                return False, f"Handler failed for {event_type}"
        else:
            # Unhandled event type (not an error, just log it)
            logger.info(f"ℹ️ Unhandled webhook event: {event_type}")
            return True, None

    except Exception as e:
        error_msg = f"Failed to handle webhook: {str(e)}"
        # Use exception() to get full stack trace
        logger.exception(f"❌ {error_msg}")
        return False, error_msg


def handle_checkout_completed(session_data: Dict) -> bool:
    """
    Handle checkout.session.completed webhook event.

    This is called when a checkout session is successfully completed.
    The subscription should already be created by subscription.created event,
    so we just log the successful checkout.

    Args:
        session_data: Stripe checkout session object

    Returns:
        True if handled successfully, False otherwise
    """
    try:
        from models import log_event

        session_id = session_data['id']
        customer_id = session_data.get('customer')
        subscription_id = session_data.get('subscription')

        # Get metadata
        metadata = session_data.get('metadata', {})
        user_id = metadata.get('user_id')

        if user_id:
            # Log checkout completion
            log_event(
                event_type='checkout_completed',
                user_id=int(user_id),
                event_data={
                    'session_id': session_id,
                    'customer_id': customer_id,
                    'subscription_id': subscription_id
                }
            )

            from models import db
            db.session.commit()

        logger.info(f"✅ Checkout session {session_id} completed")

        return True

    except Exception as e:
        logger.error(f"❌ Failed to handle checkout.session.completed: {e}")
        return False


# ══════════════════════════════════════════════════════════════════════════════
# SUBSCRIPTION CANCELLATION
# ══════════════════════════════════════════════════════════════════════════════

def cancel_subscription(user, immediate: bool = False) -> Tuple[bool, Optional[str]]:
    """
    Cancel a user's subscription.

    Args:
        user: User model instance
        immediate: If True, cancel immediately. If False, cancel at period end.

    Returns:
        Tuple of (success: bool, error_message: str)

    Example:
        >>> success, error = cancel_subscription(current_user, immediate=False)
    """
    try:
        # Initialize Stripe
        if not init_stripe():
            return False, "Stripe not configured"

        # Get active subscription
        from models import get_active_subscription
        subscription = get_active_subscription(user)

        if not subscription:
            return False, "No active subscription found"

        # Cancel subscription in Stripe
        if immediate:
            # Cancel immediately
            stripe.Subscription.delete(subscription.stripe_subscription_id)
        else:
            # Cancel at period end
            stripe.Subscription.modify(
                subscription.stripe_subscription_id,
                cancel_at_period_end=True
            )

        logger.info(
            f"✅ Subscription {subscription.stripe_subscription_id} "
            f"{'canceled immediately' if immediate else 'set to cancel at period end'} "
            f"for user {user.email}"
        )

        # Log event
        from models import log_event, db
        log_event(
            event_type='subscription_cancel_requested',
            user_id=user.id,
            event_data={
                'subscription_id': subscription.stripe_subscription_id,
                'immediate': immediate
            },
            ip_address=request.remote_addr if request else None,
            user_agent=request.headers.get('User-Agent') if request else None
        )
        db.session.commit()

        return True, None

    except Exception as e:
        error_msg = f"Failed to cancel subscription: {str(e)}"
        logger.error(f"❌ {error_msg}")
        return False, error_msg


# ══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

def get_subscription_info(user) -> Optional[Dict]:
    """
    Get user's subscription information.

    Args:
        user: User model instance

    Returns:
        Dictionary with subscription info or None
    """
    try:
        from models import get_active_subscription

        subscription = get_active_subscription(user)
        if not subscription:
            return None

        return subscription.to_dict()

    except Exception as e:
        logger.error(f"❌ Failed to get subscription info: {e}")
        return None


def get_stripe_portal_url(user, return_url: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Create a Stripe Customer Portal session for subscription management.

    This allows users to manage their subscription, update payment methods, etc.

    Args:
        user: User model instance
        return_url: URL to return to after managing subscription

    Returns:
        Tuple of (portal_url: str, error_message: str)
    """
    try:
        # Initialize Stripe
        if not init_stripe():
            return None, "Stripe not configured"

        # Get or create customer
        customer_id, error = get_or_create_customer(user)
        if error:
            return None, error

        # Create portal session
        portal_session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url
        )

        logger.info(f"✅ Created portal session for user {user.email}")

        return portal_session.url, None

    except Exception as e:
        error_msg = f"Failed to create portal session: {str(e)}"
        logger.error(f"❌ {error_msg}")
        return None, error_msg

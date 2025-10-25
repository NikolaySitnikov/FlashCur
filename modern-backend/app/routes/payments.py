"""
Payment Routes
=============
FastAPI routes for Stripe payment processing and subscription management.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import stripe
import logging
from datetime import datetime, timezone

from ..database import get_db_session
from ..models import User, Subscription, AuditLog
from ..auth import get_current_user
from ..config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# Configure Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

# Pydantic models


class CreateCheckoutRequest(BaseModel):
    price_id: str
    billing_cycle: str  # "monthly" or "yearly"


class SubscriptionResponse(BaseModel):
    subscription_id: str
    status: str
    tier: int
    billing_cycle: str
    current_period_end: Optional[datetime]


@router.post("/create-checkout-session")
async def create_checkout_session(
    request: CreateCheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Create Stripe checkout session for subscription."""
    try:
        # Get or create Stripe customer
        customer_id = current_user.stripe_customer_id
        if not customer_id:
            customer = stripe.Customer.create(
                email=current_user.email,
                metadata={"user_id": str(current_user.id)}
            )
            customer_id = customer.id
            current_user.stripe_customer_id = customer_id
            await db.commit()

        # Create checkout session
        checkout_session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price': request.price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=f"{settings.FRONTEND_URL}/dashboard?success=true",
            cancel_url=f"{settings.FRONTEND_URL}/pricing?canceled=true",
            metadata={
                "user_id": str(current_user.id),
                "tier": "1" if "pro" in request.price_id.lower() else "2",
                "billing_cycle": request.billing_cycle
            }
        )

        # Log audit event
        audit_log = AuditLog(
            user_id=current_user.id,
            event_type="checkout_session_created",
            event_data={
                "session_id": checkout_session.id,
                "price_id": request.price_id,
                "billing_cycle": request.billing_cycle
            }
        )
        db.add(audit_log)
        await db.commit()

        return {
            "checkout_url": checkout_session.url,
            "session_id": checkout_session.id
        }

    except Exception as e:
        logger.error(f"❌ Checkout session creation error: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to create checkout session")


@router.get("/subscription")
async def get_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Get user's current subscription."""
    try:
        result = await db.execute(
            select(Subscription)
            .where(Subscription.user_id == current_user.id)
            .where(Subscription.status.in_(["active", "trialing"]))
        )
        subscription = result.scalar_one_or_none()

        if not subscription:
            return {"subscription": None}

        return {
            "subscription": {
                "id": subscription.id,
                "stripe_subscription_id": subscription.stripe_subscription_id,
                "status": subscription.status,
                "tier": subscription.tier,
                "billing_cycle": subscription.billing_cycle,
                "current_period_end": subscription.current_period_end,
                "cancel_at_period_end": subscription.cancel_at_period_end
            }
        }

    except Exception as e:
        logger.error(f"❌ Get subscription error: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to get subscription")


@router.post("/cancel-subscription")
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Cancel user's subscription."""
    try:
        result = await db.execute(
            select(Subscription)
            .where(Subscription.user_id == current_user.id)
            .where(Subscription.status == "active")
        )
        subscription = result.scalar_one_or_none()

        if not subscription:
            raise HTTPException(
                status_code=404, detail="No active subscription found")

        # Cancel in Stripe
        stripe.Subscription.modify(
            subscription.stripe_subscription_id,
            cancel_at_period_end=True
        )

        # Update local record
        subscription.cancel_at_period_end = True
        await db.commit()

        # Log audit event
        audit_log = AuditLog(
            user_id=current_user.id,
            event_type="subscription_canceled",
            event_data={"subscription_id": subscription.stripe_subscription_id}
        )
        db.add(audit_log)
        await db.commit()

        return {"success": True, "message": "Subscription canceled at period end"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Cancel subscription error: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to cancel subscription")


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events."""
    try:
        payload = await request.body()
        sig_header = request.headers.get('stripe-signature')

        # Verify webhook signature
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )

        # Handle different event types
        if event['type'] == 'customer.subscription.created':
            await handle_subscription_created(event, db)
        elif event['type'] == 'customer.subscription.updated':
            await handle_subscription_updated(event, db)
        elif event['type'] == 'customer.subscription.deleted':
            await handle_subscription_deleted(event, db)
        elif event['type'] == 'invoice.paid':
            await handle_invoice_paid(event, db)
        elif event['type'] == 'invoice.payment_failed':
            await handle_invoice_payment_failed(event, db)

        return {"status": "success"}

    except Exception as e:
        logger.error(f"❌ Webhook processing error: {e}")
        raise HTTPException(
            status_code=400, detail="Webhook processing failed")


async def handle_subscription_created(event, db: AsyncSession):
    """Handle subscription created event."""
    subscription_data = event['data']['object']

    # Create subscription record
    subscription = Subscription(
        user_id=int(subscription_data['metadata']['user_id']),
        stripe_subscription_id=subscription_data['id'],
        stripe_customer_id=subscription_data['customer'],
        price_id=subscription_data['items']['data'][0]['price']['id'],
        status=subscription_data['status'],
        tier=int(subscription_data['metadata']['tier']),
        billing_cycle=subscription_data['metadata']['billing_cycle'],
        current_period_start=datetime.fromtimestamp(
            subscription_data['current_period_start'], tz=timezone.utc
        ),
        current_period_end=datetime.fromtimestamp(
            subscription_data['current_period_end'], tz=timezone.utc
        )
    )

    db.add(subscription)
    await db.commit()

    logger.info(f"✅ Subscription created: {subscription_data['id']}")


async def handle_invoice_paid(event, db: AsyncSession):
    """Handle invoice paid event - upgrade user tier."""
    invoice_data = event['data']['object']
    subscription_id = invoice_data['subscription']

    # Find subscription
    result = await db.execute(
        select(Subscription).where(
            Subscription.stripe_subscription_id == subscription_id)
    )
    subscription = result.scalar_one_or_none()

    if subscription:
        # Upgrade user tier
        result = await db.execute(
            select(User).where(User.id == subscription.user_id)
        )
        user = result.scalar_one()

        user.tier = subscription.tier
        user.subscription_expires_at = subscription.current_period_end
        await db.commit()

        # Log audit event
        audit_log = AuditLog(
            user_id=user.id,
            event_type="payment_success",
            event_data={
                "subscription_id": subscription_id,
                "tier": subscription.tier,
                "amount": invoice_data.get('amount_paid', 0)
            }
        )
        db.add(audit_log)
        await db.commit()

        logger.info(
            f"✅ User {user.email} upgraded to tier {subscription.tier}")


async def handle_subscription_updated(event, db: AsyncSession):
    """Handle subscription updated event."""
    subscription_data = event['data']['object']

    result = await db.execute(
        select(Subscription).where(
            Subscription.stripe_subscription_id == subscription_data['id'])
    )
    subscription = result.scalar_one_or_none()

    if subscription:
        subscription.status = subscription_data['status']
        subscription.current_period_end = datetime.fromtimestamp(
            subscription_data['current_period_end'], tz=timezone.utc
        )
        await db.commit()

        logger.info(f"✅ Subscription updated: {subscription_data['id']}")


async def handle_subscription_deleted(event, db: AsyncSession):
    """Handle subscription deleted event."""
    subscription_data = event['data']['object']

    result = await db.execute(
        select(Subscription).where(
            Subscription.stripe_subscription_id == subscription_data['id'])
    )
    subscription = result.scalar_one_or_none()

    if subscription:
        subscription.status = 'canceled'
        subscription.canceled_at = datetime.now(timezone.utc)

        # Downgrade user to free tier
        result = await db.execute(
            select(User).where(User.id == subscription.user_id)
        )
        user = result.scalar_one()
        user.tier = 0
        user.subscription_expires_at = None

        await db.commit()

        logger.info(f"✅ User {user.email} downgraded to free tier")


async def handle_invoice_payment_failed(event, db: AsyncSession):
    """Handle invoice payment failed event."""
    invoice_data = event['data']['object']

    # Log the failure
    audit_log = AuditLog(
        event_type="payment_failed",
        event_data={
            "subscription_id": invoice_data.get('subscription'),
            "amount": invoice_data.get('amount_due', 0),
            "attempt_count": invoice_data.get('attempt_count', 0)
        }
    )
    db.add(audit_log)
    await db.commit()

    logger.warning(
        f"⚠️ Payment failed for subscription: {invoice_data.get('subscription')}")

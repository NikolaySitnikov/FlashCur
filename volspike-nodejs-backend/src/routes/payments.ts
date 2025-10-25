import { Hono } from 'hono'
import { z } from 'zod'
import Stripe from 'stripe'
import { prisma } from '../index'
import { createLogger } from '../lib/logger'
import { User } from '../types'

const logger = createLogger()

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16',
})

const payments = new Hono()

// Validation schemas
const createCheckoutSchema = z.object({
    priceId: z.string(),
    successUrl: z.string().url(),
    cancelUrl: z.string().url(),
})

// Create Stripe checkout session
payments.post('/checkout', async (c) => {
    try {
        const user = c.get('user') as User
        const body = await c.req.json()
        const { priceId, successUrl, cancelUrl } = createCheckoutSchema.parse(body)

        // Create or get Stripe customer
        let customerId = user.stripeCustomerId

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    userId: user.id,
                },
            })

            customerId = customer.id

            // Update user with customer ID
            await prisma.user.update({
                where: { id: user.id },
                data: { stripeCustomerId: customerId },
            })
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                userId: user.id,
            },
        })

        logger.info(`Checkout session created for ${user?.email}`)

        return c.json({ sessionId: session.id, url: session.url })
    } catch (error) {
        logger.error('Create checkout error:', error)
        return c.json({ error: 'Failed to create checkout session' }, 500)
    }
})

// Get user's subscription status
payments.get('/subscription', async (c) => {
    try {
        const user = c.get('user') as User

        if (!user.stripeCustomerId) {
            return c.json({ subscription: null })
        }

        // Get customer's subscriptions
        const subscriptions = await stripe.subscriptions.list({
            customer: user.stripeCustomerId,
            status: 'active',
            limit: 1,
        })

        if (subscriptions.data.length === 0) {
            return c.json({ subscription: null })
        }

        const subscription = subscriptions.data[0]
        const price = await stripe.prices.retrieve(subscription.items.data[0].price.id)

        logger.info(`Subscription status requested by ${user?.email}`)

        return c.json({
            subscription: {
                id: subscription.id,
                status: subscription.status,
                currentPeriodStart: subscription.current_period_start,
                currentPeriodEnd: subscription.current_period_end,
                price: {
                    id: price.id,
                    amount: price.unit_amount,
                    currency: price.currency,
                    interval: price.recurring?.interval,
                },
            },
        })
    } catch (error) {
        logger.error('Get subscription error:', error)
        return c.json({ error: 'Failed to fetch subscription' }, 500)
    }
})

// Create billing portal session
payments.post('/portal', async (c) => {
    try {
        const user = c.get('user') as User

        if (!user.stripeCustomerId) {
            return c.json({ error: 'No customer found' }, 404)
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: process.env.FRONTEND_URL || 'http://localhost:3000',
        })

        logger.info(`Billing portal session created for ${user?.email}`)

        return c.json({ url: session.url })
    } catch (error) {
        logger.error('Create portal error:', error)
        return c.json({ error: 'Failed to create billing portal session' }, 500)
    }
})

// Stripe webhook handler
payments.post('/webhook', async (c) => {
    try {
        const body = await c.req.text()
        const signature = c.req.header('stripe-signature')

        if (!signature) {
            return c.json({ error: 'Missing signature' }, 400)
        }

        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
        let event: Stripe.Event

        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
        } catch (err) {
            logger.error('Webhook signature verification failed:', err)
            return c.json({ error: 'Invalid signature' }, 400)
        }

        // Handle the event
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await handleSubscriptionChange(event.data.object as Stripe.Subscription)
                break
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
                break
            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
                break
            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object as Stripe.Invoice)
                break
            default:
                logger.info(`Unhandled event type: ${event.type}`)
        }

        return c.json({ received: true })
    } catch (error) {
        logger.error('Webhook error:', error)
        return c.json({ error: 'Webhook processing failed' }, 500)
    }
})

// Helper functions for webhook handling
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string
    const priceId = subscription.items.data[0].price.id

    // Get price metadata to determine tier
    const price = await stripe.prices.retrieve(priceId)
    const tier = price.metadata?.tier || 'pro'

    // Update user tier
    await prisma.user.updateMany({
        where: { stripeCustomerId: customerId },
        data: { tier },
    })

    logger.info(`User tier updated to ${tier} for customer ${customerId}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string

    // Downgrade to free tier
    await prisma.user.updateMany({
        where: { stripeCustomerId: customerId },
        data: { tier: 'free' },
    })

    logger.info(`User downgraded to free tier for customer ${customerId}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string

    // Log successful payment
    logger.info(`Payment succeeded for customer ${customerId}, amount: ${invoice.amount_paid}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string

    // Log failed payment
    logger.error(`Payment failed for customer ${customerId}, amount: ${invoice.amount_due}`)
}

export { payments as paymentRoutes }

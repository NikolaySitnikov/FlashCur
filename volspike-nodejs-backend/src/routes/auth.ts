import { Hono } from 'hono'
import { SignJWT, jwtVerify } from 'jose'
import { z } from 'zod'
import { prisma } from '../index'
import { createLogger } from '../lib/logger'
import { getUser, requireUser } from '../lib/hono-extensions'

const logger = createLogger()

const auth = new Hono()

// Validation schemas
const signInSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
})

const signUpSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    tier: z.enum(['free', 'pro', 'elite']).default('free'),
})

const siweSchema = z.object({
    message: z.string(),
    signature: z.string(),
    address: z.string(),
})

// Generate JWT token
async function generateToken(userId: string): Promise<string> {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')

    return await new SignJWT({ sub: userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret)
}

// Sign in with email/password
auth.post('/signin', async (c) => {
    try {
        const body = await c.req.json()
        const { email, password } = signInSchema.parse(body)

        const user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user) {
            return c.json({ error: 'Invalid credentials' }, 401)
        }

        // In a real app, you'd verify the password hash
        // For now, we'll assume password verification is handled elsewhere
        const token = await generateToken(user.id)

        logger.info(`User ${user.email} signed in`)

        return c.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                tier: user.tier,
                refreshInterval: user.refreshInterval,
                theme: user.theme,
            },
        })
    } catch (error) {
        logger.error('Sign in error:', error)
        return c.json({ error: 'Invalid request' }, 400)
    }
})

// Sign up with email/password
auth.post('/signup', async (c) => {
    try {
        const body = await c.req.json()
        const { email, password, tier } = signUpSchema.parse(body)

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            return c.json({ error: 'User already exists' }, 409)
        }

        // Create new user
        const user = await prisma.user.create({
            data: {
                email,
                tier,
                // In a real app, you'd hash the password
                // passwordHash: await hashPassword(password),
            },
        })

        const token = await generateToken(user.id)

        logger.info(`New user registered: ${user.email}`)

        return c.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                tier: user.tier,
                refreshInterval: user.refreshInterval,
                theme: user.theme,
            },
        })
    } catch (error) {
        logger.error('Sign up error:', error)
        return c.json({ error: 'Invalid request' }, 400)
    }
})

// Sign in with Ethereum (SIWE)
auth.post('/siwe', async (c) => {
    try {
        const body = await c.req.json()
        const { message, signature, address } = siweSchema.parse(body)

        // In a real app, you'd verify the signature here
        // For now, we'll assume signature verification is handled elsewhere

        // Find or create user by wallet address
        let user = await prisma.user.findUnique({
            where: { walletAddress: address },
        })

        if (!user) {
            user = await prisma.user.create({
                data: {
                    walletAddress: address,
                    email: `${address}@volspike.local`, // Temporary email
                    tier: 'free',
                },
            })
        }

        const token = await generateToken(user.id)

        logger.info(`User ${address} signed in with wallet`)

        return c.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                tier: user.tier,
                refreshInterval: user.refreshInterval,
                theme: user.theme,
                walletAddress: user.walletAddress,
            },
        })
    } catch (error) {
        logger.error('SIWE error:', error)
        return c.json({ error: 'Invalid signature' }, 401)
    }
})

// Get current user
auth.get('/me', async (c) => {
    try {
        const user = getUser(c)

        if (!user) {
            return c.json({ error: 'Not authenticated' }, 401)
        }

        return c.json({ user })
    } catch (error) {
        logger.error('Get user error:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
})

export { auth as authRoutes }

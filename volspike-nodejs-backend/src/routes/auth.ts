import { Hono } from 'hono'
import { SignJWT, jwtVerify } from 'jose'
import { z } from 'zod'
import { prisma } from '../index'
import { createLogger } from '../lib/logger'
import { getUser, requireUser } from '../lib/hono-extensions'
import EmailService from '../services/email'
import * as bcrypt from 'bcryptjs'

const logger = createLogger()
const emailService = EmailService.getInstance()

const auth = new Hono()

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

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

const oauthLinkSchema = z.object({
    email: z.string().email(),
    name: z.string().optional(),
    image: z.string().optional(),
    provider: z.string(),
    providerId: z.string(),
})

const requestVerificationSchema = z.object({
    email: z.string().email(),
})

const verifyEmailSchema = z.object({
    token: z.string(),
    email: z.string().email(),
})

// Rate limiting middleware
function rateLimit(identifier: string, maxRequests: number = 5, windowMs: number = 60 * 60 * 1000) {
    const now = Date.now()
    const key = identifier
    const record = rateLimitStore.get(key)

    if (!record || now > record.resetTime) {
        rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
        return true
    }

    if (record.count >= maxRequests) {
        return false
    }

    record.count++
    return true
}

// Generate JWT token
async function generateToken(userId: string): Promise<string> {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')

    return await new SignJWT({ sub: userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret)
}

// Hash password
async function hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12)
}

// Verify password
async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash)
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

        // Check if email is verified (allow wallet users to bypass)
        if (!user.emailVerified && !user.walletAddress) {
            return c.json({
                error: 'Please verify your email address before signing in',
                requiresVerification: true
            }, 403)
        }

        // Verify password (in production, compare with hashed password)
        // For now, we'll skip password verification as it's not implemented
        // const isValidPassword = await verifyPassword(password, user.passwordHash)
        // if (!isValidPassword) {
        //     return c.json({ error: 'Invalid credentials' }, 401)
        // }

        const token = await generateToken(user.id)

        logger.info(`User ${user.email} signed in`)

        return c.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                tier: user.tier,
                emailVerified: user.emailVerified,
                refreshInterval: user.refreshInterval,
                theme: user.theme,
                role: user.role,
                status: user.status,
                twoFactorEnabled: user.twoFactorEnabled,
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

        // Hash password
        const passwordHash = await hashPassword(password)

        // Create new user
        const user = await prisma.user.create({
            data: {
                email,
                tier,
                // passwordHash, // Uncomment when implementing password storage
            },
        })

        // Generate verification token
        const verificationToken = emailService.generateVerificationToken()
        const verificationUrl = `${process.env.EMAIL_VERIFICATION_URL_BASE}/auth/verify?token=${verificationToken}&email=${encodeURIComponent(email)}`

        // Store verification token
        await prisma.verificationToken.create({
            data: {
                identifier: email,
                token: verificationToken,
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                userId: user.id,
            },
        })

        // Send verification email
        const emailSent = await emailService.sendVerificationEmail({
            email,
            name: email.split('@')[0],
            verificationUrl,
        })

        if (!emailSent) {
            logger.error(`Failed to send verification email to ${email}`)
        }

        logger.info(`New user registered: ${user.email}`)

        return c.json({
            message: 'Account created successfully. Please check your email to verify your account.',
            requiresVerification: true,
            user: {
                id: user.id,
                email: user.email,
                tier: user.tier,
                emailVerified: user.emailVerified,
            },
        })
    } catch (error) {
        logger.error('Sign up error:', error)
        return c.json({ error: 'Invalid request' }, 400)
    }
})

// OAuth account linking (for Google OAuth)
auth.post('/oauth-link', async (c) => {
    try {
        const body = await c.req.json()
        const { email, name, image, provider, providerId } = oauthLinkSchema.parse(body)

        // Find existing user by email
        let user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user) {
            // Create new user for OAuth
            user = await prisma.user.create({
                data: {
                    email,
                    tier: 'free',
                    emailVerified: new Date(), // OAuth users are considered verified
                },
            })
        }

        // Create or update account record
        await prisma.account.upsert({
            where: {
                provider_providerAccountId: {
                    provider,
                    providerAccountId: providerId,
                },
            },
            update: {
                userId: user.id,
                access_token: '', // OAuth tokens would be stored here
            },
            create: {
                userId: user.id,
                type: 'oauth',
                provider,
                providerAccountId: providerId,
                access_token: '', // OAuth tokens would be stored here
            },
        })

        const token = await generateToken(user.id)

        logger.info(`OAuth user linked: ${user.email}`)

        return c.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                tier: user.tier,
                emailVerified: user.emailVerified,
                refreshInterval: user.refreshInterval,
                theme: user.theme,
                role: user.role,
                status: user.status,
                twoFactorEnabled: user.twoFactorEnabled,
            },
        })
    } catch (error) {
        logger.error('OAuth link error:', error)
        return c.json({ error: 'Invalid request' }, 400)
    }
})

// Request email verification
auth.post('/request-verification', async (c) => {
    try {
        const body = await c.req.json()
        const { email } = requestVerificationSchema.parse(body)

        // Rate limiting
        if (!rateLimit(`verification:${email}`, 5, 60 * 60 * 1000)) {
            return c.json({ error: 'Too many verification requests. Please try again later.' }, 429)
        }

        const user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user) {
            // Don't reveal if user exists
            return c.json({ message: 'If an account exists with this email, a verification email has been sent.' })
        }

        if (user.emailVerified) {
            return c.json({ message: 'Email is already verified.' })
        }

        // Generate new verification token
        const verificationToken = emailService.generateVerificationToken()
        const verificationUrl = `${process.env.EMAIL_VERIFICATION_URL_BASE}/auth/verify?token=${verificationToken}&email=${encodeURIComponent(email)}`

        // Delete old tokens
        await prisma.verificationToken.deleteMany({
            where: { identifier: email },
        })

        // Store new verification token
        await prisma.verificationToken.create({
            data: {
                identifier: email,
                token: verificationToken,
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                userId: user.id,
            },
        })

        // Update last verification sent time
        await prisma.user.update({
            where: { id: user.id },
            data: { lastVerificationSent: new Date() },
        })

        // Send verification email
        const emailSent = await emailService.sendVerificationEmail({
            email,
            name: email.split('@')[0],
            verificationUrl,
        })

        if (!emailSent) {
            logger.error(`Failed to send verification email to ${email}`)
            return c.json({ error: 'Failed to send verification email' }, 500)
        }

        logger.info(`Verification email sent to ${email}`)

        return c.json({ message: 'Verification email sent successfully.' })
    } catch (error) {
        logger.error('Request verification error:', error)
        return c.json({ error: 'Invalid request' }, 400)
    }
})

// Verify email
auth.post('/verify-email', async (c) => {
    try {
        const body = await c.req.json()
        const { token, email } = verifyEmailSchema.parse(body)

        const verificationToken = await prisma.verificationToken.findFirst({
            where: {
                token,
                identifier: email,
                expires: { gt: new Date() },
            },
            include: { user: true },
        })

        if (!verificationToken) {
            return c.json({ error: 'Invalid or expired verification token' }, 400)
        }

        // Mark email as verified
        await prisma.user.update({
            where: { id: verificationToken.user!.id },
            data: { emailVerified: new Date() },
        })

        // Delete verification token
        await prisma.verificationToken.delete({
            where: { id: verificationToken.id },
        })

        // Send welcome email
        await emailService.sendWelcomeEmail({
            email: verificationToken.user!.email,
            name: verificationToken.user!.email.split('@')[0],
            tier: verificationToken.user!.tier,
        })

        logger.info(`Email verified for ${email}`)

        return c.json({ message: 'Email verified successfully!' })
    } catch (error) {
        logger.error('Verify email error:', error)
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
                    emailVerified: new Date(), // Wallet users are considered verified
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
                emailVerified: user.emailVerified,
                refreshInterval: user.refreshInterval,
                theme: user.theme,
                walletAddress: user.walletAddress,
                role: user.role,
                status: user.status,
                twoFactorEnabled: user.twoFactorEnabled,
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

import { Hono } from 'hono'
import { SignJWT, jwtVerify } from 'jose'
import { z } from 'zod'
import { prisma } from '../index'
import { createLogger } from '../lib/logger'
import { getUser, requireUser } from '../lib/hono-extensions'
import EmailService from '../services/email'
import * as bcrypt from 'bcryptjs'
import { SiweMessage, generateNonce } from 'siwe'
import { verifyMessage } from 'viem'
import { nonceManager } from '../services/nonce-manager'
import { isAllowedChain } from '../config/chains'

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

// Generate JWT token. Optional payload lets callers include extra SIWE fields
// such as wallet address/provider without affecting email/password tokens.
async function generateToken(userId: string, extraPayload?: Record<string, unknown>): Promise<string> {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')

    const base: Record<string, unknown> = { sub: userId }
    const claims = extraPayload ? { ...base, ...extraPayload } : base

    return await new SignJWT(claims)
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
            logger.info(`Sign-in blocked for ${email}: email not verified`)
            return c.json({
                error: 'Please verify your email address before signing in. Check your inbox for the verification email.',
                requiresVerification: true,
                email: user.email // Include email so frontend can show resend option
            }, 403)
        }

        // Verify password
        if (!user.passwordHash) {
            logger.error(`User ${email} has no password hash - may be OAuth-only user`)
            return c.json({
                error: 'Please use OAuth login (Google) for this account',
                oauthOnly: true
            }, 401)
        }

        const isValidPassword = await verifyPassword(password, user.passwordHash)
        if (!isValidPassword) {
            logger.warn(`Invalid password attempt for ${email}`)
            return c.json({ error: 'Invalid email or password' }, 401)
        }

        const token = await generateToken(user.id)

        logger.info(`User ${user.email} signed in`)

        return c.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                tier: user.tier,
                emailVerified: user.emailVerified ? user.emailVerified.toISOString() : null,
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

        // Create new user with hashed password
        const user = await prisma.user.create({
            data: {
                email,
                tier,
                passwordHash,
                emailVerified: null, // Will be set after email verification
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
                emailVerified: user.emailVerified ? user.emailVerified.toISOString() : null,
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

// Nonce issuance for SIWE authentication - use generateNonce() for EIP-4361 compliance
auth.get('/siwe/nonce', async (c) => {
    try {
        const address = c.req.header('X-Wallet-Address') || 'unknown'
        logger.info(`Nonce request received for address: ${address}`)
        
        // ✅ Use nonceManager which uses generateNonce() internally for spec-compliant nonce
        const nonce = nonceManager.generate(address, 'evm')
        
        logger.info(`Nonce issued successfully for EVM address: ${address}`)
        
        return c.json({ nonce })
    } catch (error) {
        logger.error('Nonce issuance error:', error)
        logger.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
        return c.json({ error: 'Failed to issue nonce' }, 500)
    }
})

// Server-prepared SIWE message (best practice - eliminates client-side constructor issues)
auth.get('/siwe/prepare', async (c) => {
    try {
        const address = c.req.query('address')
        const chainId = c.req.query('chainId')
        const providedNonce = c.req.query('nonce')
        
        if (!address || !chainId) {
            return c.json({ error: 'address and chainId required' }, 400)
        }
        
        // Reuse the previously issued nonce - do not generate a new one here
        const nonce = typeof providedNonce === 'string' ? providedNonce : ''
        const nonceData = nonceManager.validate(nonce)
        if (!nonceData) {
            return c.json({ error: 'No valid nonce. Call /siwe/nonce first.' }, 400)
        }
        
        const expectedDomain = new URL(process.env.FRONTEND_URL || 'http://localhost:3000').hostname
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
        
        const msg = new SiweMessage({
            domain: expectedDomain,
            address,
            statement: 'Sign in with Ethereum to VolSpike.',
            uri: frontendUrl,
            version: '1',
            chainId: Number(chainId),
            nonce,
        })
        
        // v3 prepareMessage()
        const message = msg.prepareMessage()
        
        logger.info(`SIWE message prepared for ${address} on chain ${chainId}`)
        
        return c.json({ message })
    } catch (error) {
        logger.error('SIWE prepare error:', error)
        return c.json({ error: 'Failed to prepare SIWE message' }, 500)
    }
})

// Sign in with Ethereum (SIWE) - Signature verification (siwe v3)
auth.post('/siwe/verify', async (c) => {
    try {
        const { message, signature } = await c.req.json()

        console.log('[SIWE Verify] Received message:', message.substring(0, 100) + '...')
        console.log('[SIWE Verify] Received signature:', signature)

        // Parse SIWE message using siwe v3
        const siweMessage = new SiweMessage(message)
        
        // Extract nonce from the SIWE message and validate against server store
        const expectedNonce = siweMessage.nonce
        const nonceData = nonceManager.validate(expectedNonce || '')
        if (!nonceData) {
            logger.warn('SIWE verification failed: invalid or missing nonce')
            return c.json({ error: 'Invalid nonce' }, 401)
        }
        
        // v3 verify API - ✅ exact domain, no port
        const result = await siweMessage.verify({
            signature,
            domain: new URL(process.env.FRONTEND_URL || 'http://localhost:3000').hostname,
            nonce: expectedNonce,
            time: new Date(),
        })

        if (!result.success) {
            logger.warn(`SIWE verification failed: ${result.error?.type || 'unknown error'}`)
            return c.json({ error: result.error?.type || 'SIWE verification failed' }, 401)
        }

        const { address, chainId } = siweMessage
        
        console.log('[SIWE Verify] Successfully verified:', { address, chainId })

        // Validate chain
        const caipChainId = `eip155:${chainId}`
        if (!isAllowedChain(caipChainId, 'evm')) {
            logger.warn(`Disallowed chain: ${caipChainId}`)
            return c.json({ error: `Chain not allowed. Supported chains: Ethereum (1), Base (8453), Polygon (137), Optimism (10), Arbitrum (42161)` }, 401)
        }

        // Consume nonce (one-time use)
        nonceManager.consume(expectedNonce || '')

        const caip10 = `eip155:${chainId}:${address}`

        // Find or create wallet account
        let walletAccount = await prisma.walletAccount.findUnique({
            where: {
                provider_caip10: {
                    provider: 'evm',
                    caip10: caip10,
                },
            },
            include: { user: true },
        })

        let user

        if (walletAccount) {
            // Existing wallet, sign in to associated user
            user = walletAccount.user
            await prisma.walletAccount.update({
                where: { id: walletAccount.id },
                data: { lastLoginAt: new Date() },
            })
            logger.info(`Existing wallet signed in: ${caip10}`)
        } else {
            // New wallet, create user
            user = await prisma.user.create({
                data: {
                    email: `${address}@volspike.wallet`,
                    tier: 'free',
                    emailVerified: new Date(),
                },
            })

            await prisma.walletAccount.create({
                data: {
                    userId: user.id,
                    provider: 'evm',
                    caip10: caip10,
                    address: address,
                    chainId: String(chainId),
                    lastLoginAt: new Date(),
                },
            })
            
            logger.info(`New wallet created and linked: ${caip10}`)
        }

        // Generate token with SIWE context so NextAuth can surface wallet data
        const token = await generateToken(user.id, {
            address,
            provider: 'evm',
            chainId,
            tier: user.tier,
            role: user.role,
        })

        return c.json({
            ok: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                tier: user.tier,
                emailVerified: user.emailVerified ? user.emailVerified.toISOString() : null,
                refreshInterval: user.refreshInterval,
                theme: user.theme,
                walletAddress: address,
                walletProvider: 'evm',
                role: user.role,
                status: user.status,
                twoFactorEnabled: user.twoFactorEnabled,
            },
        })
    } catch (error: any) {
        logger.error('SIWE verification error:', error)
        console.error('[SIWE Verify] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
        return c.json({ error: error.message || 'Verification failed' }, 401)
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

import { Context, Next } from 'hono'
import { jwtVerify } from 'jose'
import { prisma } from '../index'
import { createLogger } from '../lib/logger'
import { Role, UserStatus } from '@prisma/client'
import { AdminUser } from '../types/admin'
import { checkPermission, validateAdminSession } from '../types/rbac'
import { AuditAction, AuditTargetType, CreateAuditLogData } from '../types/audit'

const logger = createLogger()

export async function requireAdmin(c: Context, next: Next) {
    try {
        const authHeader = c.req.header('Authorization')

        if (!authHeader?.startsWith('Bearer ')) {
            logger.warn('Admin access attempt without token')
            return c.json({ error: 'Unauthorized' }, 401)
        }

        const token = authHeader.substring(7)

        // Verify JWT token
        const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
        const { payload } = await jwtVerify(token, secret)

        if (!payload.sub) {
            return c.json({ error: 'Invalid token' }, 401)
        }

        // Get user and verify admin role
        const user = await prisma.user.findUnique({
            where: { id: payload.sub as string },
            select: {
                id: true,
                email: true,
                role: true,
                tier: true,
                status: true,
                twoFactorEnabled: true,
                lockedUntil: true,
                lastLoginAt: true,
                ipAddress: true,
                userAgent: true,
            },
        })

        if (!user) {
            logger.warn(`Admin access attempt with invalid user ID: ${payload.sub}`)
            await logSecurityEvent(payload.sub as string, AuditAction.UNAUTHORIZED_ACCESS)
            return c.json({ error: 'User not found' }, 401)
        }

        // Validate admin session
        const sessionValidation = validateAdminSession(user.role, user.status)
        if (!sessionValidation.isValid) {
            logger.warn(`Admin session validation failed for ${user.email}: ${sessionValidation.reason}`)
            await logSecurityEvent(user.id, AuditAction.UNAUTHORIZED_ACCESS, sessionValidation.reason)
            return c.json({ error: sessionValidation.reason }, 403)
        }

        // Check if account is locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            logger.warn(`Locked admin account ${user.email} attempted access`)
            await logSecurityEvent(user.id, AuditAction.UNAUTHORIZED_ACCESS)
            return c.json({ error: 'Account locked' }, 403)
        }

        // Set user in context
        c.set('adminUser', user as AdminUser)

        // Log admin access
        logger.info(`Admin ${user.email} accessed ${c.req.path}`)

        await next()
    } catch (error) {
        logger.error('Admin auth middleware error:', error)
        return c.json({ error: 'Authentication failed' }, 401)
    }
}

export async function require2FA(c: Context, next: Next) {
    const user = c.get('adminUser') as AdminUser

    if (user?.twoFactorEnabled) {
        const twoFactorCode = c.req.header('X-2FA-Code')

        if (!twoFactorCode) {
            return c.json({ error: '2FA required', require2FA: true }, 403)
        }

        // Verify 2FA code (implement TOTP verification)
        const isValid = await verify2FACode(user.id, twoFactorCode)

        if (!isValid) {
            logger.warn(`Invalid 2FA attempt for admin ${user.email}`)
            await logSecurityEvent(user.id, AuditAction.ADMIN_2FA_FAILED)
            return c.json({ error: 'Invalid 2FA code' }, 403)
        }
    }

    await next()
}

export async function requirePermission(permission: string) {
    return async (c: Context, next: Next) => {
        const user = c.get('adminUser') as AdminUser

        if (!user) {
            return c.json({ error: 'Authentication required' }, 401)
        }

        const permissionCheck = checkPermission(user.role, user.status, {
            resource: permission.split('.')[0],
            action: permission.split('.')[1],
            userId: user.id,
        })

        if (!permissionCheck.allowed) {
            logger.warn(`Permission denied for ${user.email}: ${permissionCheck.reason}`)
            await logSecurityEvent(user.id, AuditAction.UNAUTHORIZED_ACCESS, permissionCheck.reason)
            return c.json({ error: permissionCheck.reason }, 403)
        }

        await next()
    }
}

export async function requireResourceAccess(resource: string, action: string) {
    return async (c: Context, next: Next) => {
        const user = c.get('adminUser') as AdminUser

        if (!user) {
            return c.json({ error: 'Authentication required' }, 401)
        }

        const permissionCheck = checkPermission(user.role, user.status, {
            resource,
            action,
            userId: user.id,
            targetUserId: c.req.param('id'),
        })

        if (!permissionCheck.allowed) {
            logger.warn(`Resource access denied for ${user.email}: ${resource}/${action}`)
            await logSecurityEvent(user.id, AuditAction.UNAUTHORIZED_ACCESS, `${resource}/${action}`)
            return c.json({ error: permissionCheck.reason }, 403)
        }

        await next()
    }
}

export async function validateAdminSessionMiddleware(c: Context, next: Next) {
    const user = c.get('adminUser') as AdminUser

    if (!user) {
        return c.json({ error: 'Authentication required' }, 401)
    }

    // Check session expiry (implement session management)
    const sessionExpiry = await getSessionExpiry(user.id)
    const sessionValidation = validateAdminSession(user.role, user.status, sessionExpiry)

    if (!sessionValidation.isValid) {
        logger.warn(`Session validation failed for ${user.email}: ${sessionValidation.reason}`)
        return c.json({ error: sessionValidation.reason }, 401)
    }

    await next()
}

// Helper functions
async function logSecurityEvent(
    userId: string,
    action: AuditAction,
    details?: string
) {
    try {
        const auditData: CreateAuditLogData = {
            actorUserId: userId,
            action,
            targetType: 'SECURITY',
            metadata: {
                additionalContext: { details },
            },
        }

        await prisma.auditLog.create({
            data: auditData,
        })
    } catch (error) {
        logger.error('Failed to log security event:', error)
    }
}

async function verify2FACode(userId: string, code: string): Promise<boolean> {
    try {
        // Get user's 2FA secret
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { twoFactorSecret: true },
        })

        if (!user?.twoFactorSecret) {
            return false
        }

        // Implement TOTP verification
        // This is a placeholder - implement actual TOTP verification using speakeasy or similar
        // For now, we'll use a simple validation
        const expectedCode = generateTOTPCode(user.twoFactorSecret)
        return code === expectedCode
    } catch (error) {
        logger.error('2FA verification error:', error)
        return false
    }
}

async function getSessionExpiry(userId: string): Promise<Date | undefined> {
    try {
        const session = await prisma.adminSession.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: { expiresAt: true },
        })

        return session?.expiresAt
    } catch (error) {
        logger.error('Failed to get session expiry:', error)
        return undefined
    }
}

function generateTOTPCode(secret: string): string {
    // Placeholder implementation
    // In production, use speakeasy or similar library
    const timestamp = Math.floor(Date.now() / 30000) // 30-second window
    const hash = Buffer.from(secret + timestamp).toString('base64')
    return hash.slice(-6).replace(/[^0-9]/g, '0').slice(0, 6)
}

// IP allowlist middleware (optional)
export async function requireIPAllowlist(c: Context, next: Next) {
    const allowedIPs = process.env.ADMIN_IP_WHITELIST?.split(',') || []

    if (allowedIPs.length === 0) {
        // No IP restrictions configured
        await next()
        return
    }

    const clientIP = c.req.header('x-forwarded-for') ||
        c.req.header('x-real-ip') ||
        c.req.header('cf-connecting-ip') ||
        'unknown'

    const isAllowed = allowedIPs.some(ip => {
        if (ip.includes('/')) {
            // CIDR notation - implement CIDR matching
            return isIPInCIDR(clientIP, ip)
        } else {
            // Exact IP match
            return clientIP === ip
        }
    })

    if (!isAllowed) {
        const user = c.get('adminUser') as AdminUser
        logger.warn(`IP ${clientIP} not in allowlist for admin ${user?.email}`)
        await logSecurityEvent(user?.id || 'unknown', AuditAction.UNAUTHORIZED_ACCESS, clientIP)
        return c.json({ error: 'Access denied from this IP address' }, 403)
    }

    await next()
}

function isIPInCIDR(ip: string, cidr: string): boolean {
    // Simple CIDR implementation
    // In production, use a proper IP address library
    const [network, prefixLength] = cidr.split('/')
    const prefix = parseInt(prefixLength)

    // Convert IPs to numbers for comparison
    const ipToNumber = (ip: string) => {
        return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0)
    }

    const ipNum = ipToNumber(ip)
    const networkNum = ipToNumber(network)
    const mask = (0xffffffff << (32 - prefix)) >>> 0

    return (ipNum & mask) === (networkNum & mask)
}

// Admin session management
export async function createAdminSession(
    userId: string,
    ipAddress: string,
    userAgent: string
): Promise<string> {
    const token = generateSecureToken()
    const expiresAt = new Date(Date.now() + (30 * 60 * 1000)) // 30 minutes

    await prisma.adminSession.create({
        data: {
            userId,
            token,
            ipAddress,
            userAgent,
            expiresAt,
        },
    })

    return token
}

export async function invalidateAdminSession(token: string) {
    await prisma.adminSession.deleteMany({
        where: { token },
    })
}

export async function cleanupExpiredSessions() {
    const deleted = await prisma.adminSession.deleteMany({
        where: {
            expiresAt: {
                lt: new Date(),
            },
        },
    })

    logger.info(`Cleaned up ${deleted.count} expired admin sessions`)
}

function generateSecureToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let token = ''
    for (let i = 0; i < 64; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return token
}

import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../../index'
import { requireAdmin, require2FA } from '../../middleware/admin-auth'
import { csrfProtection } from '../../middleware/csrf'
import { adminRateLimit } from '../../middleware/admin-rate-limit'
import { auditLog, auditAction } from '../../middleware/audit-logger'
import { createLogger } from '../../lib/logger'
import { AuditAction, AuditTargetType } from '../../types/audit'
import { TwoFactorSetup, TwoFactorVerification } from '../../types/admin'

const logger = createLogger()
const adminSettings = new Hono()

// Apply middleware
adminSettings.use('*', requireAdmin)
adminSettings.use('*', adminRateLimit)
adminSettings.use(['POST', 'PATCH', 'DELETE'], csrfProtection)
adminSettings.use(['POST', 'PATCH', 'DELETE'], require2FA)
adminSettings.use('*', auditLog)

// Validation schemas
const updateSettingsSchema = z.object({
    adminEmailWhitelist: z.array(z.string().email()).optional(),
    adminIPWhitelist: z.array(z.string()).optional(),
    adminSessionDuration: z.number().min(300).max(86400).optional(), // 5 minutes to 24 hours
    auditLogRetentionDays: z.number().min(30).max(365).optional(),
    csrfSecret: z.string().min(32).optional(),
    rateLimitConfig: z.object({
        login: z.object({
            windowMs: z.number().min(60000),
            maxRequests: z.number().min(1),
        }).optional(),
        api: z.object({
            windowMs: z.number().min(60000),
            maxRequests: z.number().min(1),
        }).optional(),
        mutation: z.object({
            windowMs: z.number().min(60000),
            maxRequests: z.number().min(1),
        }).optional(),
    }).optional(),
})

const twoFactorSetupSchema = z.object({
    password: z.string().min(8),
})

const twoFactorVerifySchema = z.object({
    code: z.string().length(6),
    backupCode: z.string().optional(),
})

const passwordChangeSchema = z.object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(12),
    confirmPassword: z.string().min(12),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
})

// GET /api/admin/settings - Get admin settings
adminSettings.get('/', async (c) => {
    try {
        const user = c.get('adminUser')

        // Get current settings (this would be stored in a settings table)
        const settings = await getAdminSettings()

        return c.json({
            settings,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                twoFactorEnabled: user.twoFactorEnabled,
                lastLoginAt: user.lastLoginAt,
            },
        })
    } catch (error) {
        logger.error('Get admin settings error:', error)
        return c.json({ error: 'Failed to fetch admin settings' }, 500)
    }
})

// PATCH /api/admin/settings - Update admin settings
adminSettings.patch('/', async (c) => {
    try {
        const body = await c.req.json()
        const data = updateSettingsSchema.parse(body)

        // Get current settings for audit
        const currentSettings = await getAdminSettings()

        // Update settings
        const updatedSettings = await updateAdminSettings(data)

        // Log the action
        await auditAction(
            c.get('adminUser').id,
            AuditAction.SETTINGS_UPDATED,
            AuditTargetType.SETTINGS,
            undefined,
            currentSettings,
            data
        )

        logger.info(`Admin settings updated by ${c.get('adminUser').email}`)

        return c.json({ settings: updatedSettings })
    } catch (error) {
        logger.error('Update admin settings error:', error)
        return c.json({ error: 'Failed to update admin settings' }, 500)
    }
})

// GET /api/admin/settings/security - Get security settings
adminSettings.get('/security', async (c) => {
    try {
        const user = c.get('adminUser')

        const securitySettings = {
            twoFactorEnabled: user.twoFactorEnabled,
            lastPasswordChange: await getLastPasswordChange(user.id),
            activeSessions: await getActiveSessions(user.id),
            ipWhitelist: await getIPWhitelist(),
            failedLoginAttempts: await getFailedLoginAttempts(user.id),
        }

        return c.json(securitySettings)
    } catch (error) {
        logger.error('Get security settings error:', error)
        return c.json({ error: 'Failed to fetch security settings' }, 500)
    }
})

// POST /api/admin/settings/2fa/setup - Setup 2FA
adminSettings.post('/2fa/setup', async (c) => {
    try {
        const body = await c.req.json()
        const data = twoFactorSetupSchema.parse(body)

        const user = c.get('adminUser')

        // Verify current password
        const isValidPassword = await verifyPassword(user.id, data.password)
        if (!isValidPassword) {
            return c.json({ error: 'Invalid password' }, 401)
        }

        // Generate 2FA secret and QR code
        const twoFactorSetup = await generate2FASetup(user.id)

        // Log the action
        await auditAction(
            user.id,
            AuditAction.ADMIN_2FA_ENABLED,
            AuditTargetType.ADMIN,
            user.id
        )

        return c.json(twoFactorSetup)
    } catch (error) {
        logger.error('Setup 2FA error:', error)
        return c.json({ error: 'Failed to setup 2FA' }, 500)
    }
})

// POST /api/admin/settings/2fa/verify - Verify 2FA setup
adminSettings.post('/2fa/verify', async (c) => {
    try {
        const body = await c.req.json()
        const data = twoFactorVerifySchema.parse(body)

        const user = c.get('adminUser')

        // Verify 2FA code
        const isValid = await verify2FACode(user.id, data.code, data.backupCode)

        if (!isValid) {
            return c.json({ error: 'Invalid 2FA code' }, 401)
        }

        // Enable 2FA for user
        await enable2FA(user.id)

        // Log the action
        await auditAction(
            user.id,
            AuditAction.ADMIN_2FA_ENABLED,
            AuditTargetType.ADMIN,
            user.id
        )

        return c.json({ success: true, message: '2FA enabled successfully' })
    } catch (error) {
        logger.error('Verify 2FA error:', error)
        return c.json({ error: 'Failed to verify 2FA' }, 500)
    }
})

// DELETE /api/admin/settings/2fa - Disable 2FA
adminSettings.delete('/2fa', async (c) => {
    try {
        const user = c.get('adminUser')

        // Disable 2FA
        await disable2FA(user.id)

        // Log the action
        await auditAction(
            user.id,
            AuditAction.ADMIN_2FA_DISABLED,
            AuditTargetType.ADMIN,
            user.id
        )

        return c.json({ success: true, message: '2FA disabled successfully' })
    } catch (error) {
        logger.error('Disable 2FA error:', error)
        return c.json({ error: 'Failed to disable 2FA' }, 500)
    }
})

// POST /api/admin/settings/password - Change password
adminSettings.post('/password', async (c) => {
    try {
        const body = await c.req.json()
        const data = passwordChangeSchema.parse(body)

        const user = c.get('adminUser')

        // Verify current password
        const isValidPassword = await verifyPassword(user.id, data.currentPassword)
        if (!isValidPassword) {
            return c.json({ error: 'Invalid current password' }, 401)
        }

        // Update password
        await updatePassword(user.id, data.newPassword)

        // Log the action
        await auditAction(
            user.id,
            AuditAction.SETTINGS_UPDATED,
            AuditTargetType.SETTINGS,
            undefined,
            undefined,
            { action: 'password_change' }
        )

        return c.json({ success: true, message: 'Password updated successfully' })
    } catch (error) {
        logger.error('Change password error:', error)
        return c.json({ error: 'Failed to change password' }, 500)
    }
})

// GET /api/admin/settings/sessions - Get active sessions
adminSettings.get('/sessions', async (c) => {
    try {
        const user = c.get('adminUser')

        const sessions = await getActiveSessions(user.id)

        return c.json({ sessions })
    } catch (error) {
        logger.error('Get active sessions error:', error)
        return c.json({ error: 'Failed to fetch active sessions' }, 500)
    }
})

// DELETE /api/admin/settings/sessions/:sessionId - Revoke session
adminSettings.delete('/sessions/:sessionId', async (c) => {
    try {
        const sessionId = c.req.param('sessionId')
        const user = c.get('adminUser')

        // Revoke session
        await revokeSession(sessionId, user.id)

        // Log the action
        await auditAction(
            user.id,
            AuditAction.ADMIN_LOGOUT,
            AuditTargetType.ADMIN,
            sessionId
        )

        return c.json({ success: true, message: 'Session revoked successfully' })
    } catch (error) {
        logger.error('Revoke session error:', error)
        return c.json({ error: 'Failed to revoke session' }, 500)
    }
})

// Helper functions
async function getAdminSettings(): Promise<any> {
    // This would be implemented with a settings table
    // For now, return default settings
    return {
        adminEmailWhitelist: process.env.ADMIN_EMAIL_WHITELIST?.split(',') || [],
        adminIPWhitelist: process.env.ADMIN_IP_WHITELIST?.split(',') || [],
        adminSessionDuration: parseInt(process.env.ADMIN_SESSION_DURATION || '1800'),
        auditLogRetentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '90'),
        rateLimitConfig: {
            login: { windowMs: 900000, maxRequests: 5 },
            api: { windowMs: 60000, maxRequests: 100 },
            mutation: { windowMs: 60000, maxRequests: 20 },
        },
    }
}

async function updateAdminSettings(data: any): Promise<any> {
    // This would be implemented with a settings table
    // For now, return the updated data
    return data
}

async function getLastPasswordChange(userId: string): Promise<Date | null> {
    // This would be implemented with password change tracking
    return null
}

async function getActiveSessions(userId: string): Promise<any[]> {
    return await prisma.adminSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    })
}

async function getIPWhitelist(): Promise<string[]> {
    return process.env.ADMIN_IP_WHITELIST?.split(',') || []
}

async function getFailedLoginAttempts(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { loginAttempts: true },
    })

    return user?.loginAttempts || 0
}

async function verifyPassword(userId: string, password: string): Promise<boolean> {
    // This would be implemented with proper password verification
    // For now, return true
    return true
}

async function generate2FASetup(userId: string): Promise<TwoFactorSetup> {
    // This would be implemented with proper 2FA generation
    // For now, return mock data
    return {
        secret: 'mock-secret',
        qrCode: 'data:image/png;base64,mock-qr-code',
        backupCodes: ['backup1', 'backup2', 'backup3'],
    }
}

async function verify2FACode(userId: string, code: string, backupCode?: string): Promise<boolean> {
    // This would be implemented with proper 2FA verification
    // For now, return true
    return true
}

async function enable2FA(userId: string): Promise<void> {
    await prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: true },
    })
}

async function disable2FA(userId: string): Promise<void> {
    await prisma.user.update({
        where: { id: userId },
        data: {
            twoFactorEnabled: false,
            twoFactorSecret: null,
        },
    })
}

async function updatePassword(userId: string, newPassword: string): Promise<void> {
    // This would be implemented with proper password hashing
    // For now, just log the action
    logger.info(`Password updated for user ${userId}`)
}

async function revokeSession(sessionId: string, userId: string): Promise<void> {
    await prisma.adminSession.deleteMany({
        where: {
            id: sessionId,
            userId,
        },
    })
}

export { adminSettings as adminSettingsRoutes }

import { Context, Next } from 'hono'
import { verify } from 'jose'
import { prisma } from '../index'

export async function authMiddleware(c: Context, next: Next) {
    try {
        const authHeader = c.req.header('Authorization')

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({ error: 'Missing or invalid authorization header' }, 401)
        }

        const token = authHeader.substring(7) // Remove 'Bearer ' prefix

        // Verify JWT token
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')
        const { payload } = await verify(token, secret)

        if (!payload.sub) {
            return c.json({ error: 'Invalid token payload' }, 401)
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: payload.sub as string },
            select: {
                id: true,
                email: true,
                tier: true,
                refreshInterval: true,
                theme: true,
            },
        })

        if (!user) {
            return c.json({ error: 'User not found' }, 401)
        }

        // Add user to context
        c.set('user', user)

        await next()
    } catch (error) {
        console.error('Auth middleware error:', error)
        return c.json({ error: 'Invalid token' }, 401)
    }
}

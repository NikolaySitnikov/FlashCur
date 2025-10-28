import 'server-only'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

type VerifyResult = {
  ok: boolean
  role?: 'admin' | 'user'
  userId?: string
  reason?: string
}

export async function verifyAccessTokenAndRole(token?: string): Promise<VerifyResult> {
    if (!token) return { ok: false, reason: 'NO_TOKEN' }

    try {
        // Verify JWT token
        const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
        const { payload } = await jwtVerify(token, secret)

        if (!payload.sub) {
            return { ok: false, reason: 'NO_USER_ID' }
        }

        // Extract role and user ID
        const userRole = payload.role as string
        const userId = payload.sub as string

        if (!userRole) {
            return { ok: false, reason: 'NO_ROLE' }
        }

        // Normalize role to 'admin' or 'user'
        const normalizedRole = userRole.toLowerCase() === 'admin' ? 'admin' : 'user'

        return { ok: true, role: normalizedRole, userId }
    } catch (error) {
        console.error('[AuthServer] Token verification failed:', error)
        return { ok: false, reason: 'INVALID_TOKEN' }
    }
}

export function getServerAuthToken(): string | undefined {
    // Try to get token from NextAuth session cookie
    const sessionToken = cookies().get('next-auth.session-token')?.value
    if (sessionToken) {
        return sessionToken
    }
    
    // Fallback to custom auth token cookie
    return cookies().get('auth_token')?.value
}


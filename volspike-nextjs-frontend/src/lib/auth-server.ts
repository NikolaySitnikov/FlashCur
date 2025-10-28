import 'server-only'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { auth } from '@/lib/auth'

const API_BASE_URL =
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3001'

export async function verifyAccessTokenAndRole(token?: string) {
    if (!token) return { ok: false, role: null as null | string }

    try {
        // Verify JWT token
        const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
        const { payload } = await jwtVerify(token, secret)

        if (!payload.sub) {
            return { ok: false, role: null }
        }

        // Check if user has admin role
        const userRole = payload.role as string
        if (userRole?.toLowerCase() !== 'admin') {
            return { ok: false, role: null }
        }

        return { ok: true, role: 'admin' }
    } catch (error) {
        console.error('[AuthServer] Token verification failed:', error)
        return { ok: false, role: null }
    }
}

export async function getServerAuthToken(): Promise<string | undefined> {
    const session = await auth()
    return session?.accessToken as string | undefined
}

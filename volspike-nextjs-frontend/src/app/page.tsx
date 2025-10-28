import { redirect } from 'next/navigation'
import { getServerAuthToken, verifyAccessTokenAndRole } from '@/lib/auth-server'

export default async function HomePage() {
    const token = await getServerAuthToken()
    const { ok } = await verifyAccessTokenAndRole(token)

    if (!ok) {
        redirect('/auth')
    }

    redirect('/dashboard')
}
// Force Vercel rebuild - Sat Oct 25 21:45:18 EST 2025

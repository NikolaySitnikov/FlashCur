import { redirect } from 'next/navigation'
import { getNextAuthSession } from '@/lib/auth-server'
import { Dashboard } from '@/components/dashboard'
import { SessionProvider } from 'next-auth/react'

export default async function DashboardPage() {
    console.log('[Dashboard] Starting dashboard page load')
    const session = await getNextAuthSession()
    console.log('[Dashboard] NextAuth session:', session ? 'Found' : 'Not found')

    if (!session?.user) {
        console.log('[Dashboard] No session found, redirecting to /auth')
        redirect('/auth')
    }

    const role = (session.user as any).role || 'user'
    console.log('[Dashboard] Authentication successful, user role:', role)

    return (
        <SessionProvider session={session}>
            <Dashboard />
        </SessionProvider>
    )
}

import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { Dashboard } from '@/components/dashboard'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import AuthPage from '@/app/auth/page'

export default async function HomePage() {
    const session = await auth()

    // Show auth page directly if not logged in (no redirect to avoid hydration issues)
    if (!session) {
        return <AuthPage />
    }

    return (
        <main className="min-h-screen bg-background">
            <Suspense fallback={<LoadingSpinner />}>
                <Dashboard />
            </Suspense>
        </main>
    )
}

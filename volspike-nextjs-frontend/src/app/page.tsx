import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { Dashboard } from '@/components/dashboard'
import { LoginPage } from '@/components/login-page'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default async function HomePage() {
    const session = await auth()

    if (!session) {
        return <LoginPage />
    }

    return (
        <main className="min-h-screen bg-background">
            <Suspense fallback={<LoadingSpinner />}>
                <Dashboard />
            </Suspense>
        </main>
    )
}

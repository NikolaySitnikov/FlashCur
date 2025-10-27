import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Dashboard } from '@/components/dashboard'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default async function HomePage() {
    const session = await auth()

    if (!session) {
        redirect('/auth?tab=signin')
    }

    return (
        <main className="min-h-screen bg-background">
            <Suspense fallback={<LoadingSpinner />}>
                <Dashboard />
            </Suspense>
        </main>
    )
}
// Force Vercel rebuild - Sat Oct 25 21:45:18 EST 2025

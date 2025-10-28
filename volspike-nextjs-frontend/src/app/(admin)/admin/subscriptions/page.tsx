import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { SubscriptionsTable } from '@/components/admin/subscriptions/subscriptions-table'
import { SubscriptionFilters } from '@/components/admin/subscriptions/subscription-filters'
import { adminAPI } from '@/lib/admin/api-client'

export const metadata: Metadata = {
    title: 'Subscriptions - Admin',
    description: 'Manage user subscriptions and billing',
}

interface SubscriptionsPageProps {
    searchParams: {
        userId?: string
        status?: string
        tier?: string
        page?: string
        limit?: string
        sortBy?: string
        sortOrder?: string
    }
}

export default async function SubscriptionsPage({ searchParams }: SubscriptionsPageProps) {
    const session = await auth()

    // Check if user is admin
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/auth')
    }

    // Set access token for API client
    adminAPI.setAccessToken(session.accessToken || null)

    try {
        // Parse search params
        const query = {
            userId: searchParams.userId,
            status: searchParams.status as any,
            tier: searchParams.tier as any,
            page: searchParams.page ? parseInt(searchParams.page) : 1,
            limit: searchParams.limit ? parseInt(searchParams.limit) : 20,
            sortBy: searchParams.sortBy as any || 'createdAt',
            sortOrder: searchParams.sortOrder as any || 'desc',
        }

        // Fetch subscriptions data
        const subscriptionsData = await adminAPI.getSubscriptions(query)

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
                        <p className="text-muted-foreground">
                            Manage user subscriptions and billing
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                            {subscriptionsData.pagination.total} total subscriptions
                        </span>
                    </div>
                </div>

                {/* Filters */}
                <SubscriptionFilters currentFilters={query} />

                {/* Subscriptions Table */}
                <SubscriptionsTable
                    subscriptions={subscriptionsData.subscriptions}
                    pagination={subscriptionsData.pagination}
                    currentQuery={query}
                />
            </div>
        )
    } catch (error) {
        console.error('Error fetching subscriptions:', error)
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
                    <p className="text-muted-foreground">
                        Manage user subscriptions and billing
                    </p>
                </div>
                <div className="text-center py-12">
                    <p className="text-red-600">Error loading subscriptions. Please try again.</p>
                </div>
            </div>
        )
    }
}

import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { MetricsCards } from '@/components/admin/metrics/metrics-cards'
import { RevenueChart } from '@/components/admin/metrics/revenue-chart'
import { UserGrowthChart } from '@/components/admin/metrics/user-growth-chart'
import { SystemHealth } from '@/components/admin/metrics/system-health'
import { adminAPI } from '@/lib/admin/api-client'

export const metadata: Metadata = {
    title: 'Metrics - Admin',
    description: 'View system metrics and analytics',
}

export default async function MetricsPage() {
    const session = await auth()

    // Check if user is admin
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/auth')
    }

    // Set access token for API client
    adminAPI.setAccessToken(session.accessToken || null)

    try {
        // Fetch metrics data
        const [metrics, health] = await Promise.all([
            adminAPI.getSystemMetrics(),
            adminAPI.getHealthStatus(),
        ])

        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Metrics</h1>
                    <p className="text-muted-foreground">
                        Monitor system performance and user analytics
                    </p>
                </div>

                {/* Metrics Cards */}
                <MetricsCards metrics={metrics} />

                {/* Charts */}
                <div className="grid gap-6 md:grid-cols-2">
                    <RevenueChart />
                    <UserGrowthChart />
                </div>

                {/* System Health */}
                <SystemHealth health={health} />
            </div>
        )
    } catch (error) {
        console.error('Error fetching metrics:', error)
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Metrics</h1>
                    <p className="text-muted-foreground">
                        Monitor system performance and user analytics
                    </p>
                </div>
                <div className="text-center py-12">
                    <p className="text-red-600">Error loading metrics. Please try again.</p>
                </div>
            </div>
        )
    }
}

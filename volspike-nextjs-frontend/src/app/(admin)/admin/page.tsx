import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { StatsCards } from '@/components/admin/dashboard/stats-cards'
import { RecentActivity } from '@/components/admin/dashboard/recent-activity'
import { UserGrowthChart } from '@/components/admin/dashboard/user-growth-chart'
import { RevenueChart } from '@/components/admin/dashboard/revenue-chart'
import { SystemHealth } from '@/components/admin/dashboard/system-health'
import { QuickActions } from '@/components/admin/dashboard/quick-actions'

export const metadata: Metadata = {
    title: 'Admin Dashboard - VolSpike',
    description: 'Admin dashboard for managing VolSpike platform',
}

async function getAdminStats() {
    // This would fetch from your API
    // For now, return mock data
    return {
        totalUsers: 1250,
        activeUsers: 890,
        totalRevenue: 45600,
        recentSignups: 45,
        usersByTier: [
            { tier: 'free', count: 800 },
            { tier: 'pro', count: 350 },
            { tier: 'elite', count: 100 },
        ],
    }
}

async function getRecentActivity() {
    // This would fetch from your API
    // For now, return mock data
    return [
        {
            id: '1',
            action: 'USER_CREATED',
            actor: { email: 'admin@volspike.com' },
            targetType: 'USER',
            targetId: 'user123',
            createdAt: new Date(),
        },
        {
            id: '2',
            action: 'SUBSCRIPTION_UPDATED',
            actor: { email: 'admin@volspike.com' },
            targetType: 'SUBSCRIPTION',
            targetId: 'sub456',
            createdAt: new Date(),
        },
    ]
}

export default async function AdminDashboard() {
    const session = await auth()

    // Check if user is admin
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/auth')
    }

    const [stats, recentActivity] = await Promise.all([
        getAdminStats(),
        getRecentActivity(),
    ])

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome back, {session.user.email}
                </p>
            </div>

            {/* Quick Actions */}
            <QuickActions />

            {/* Stats Cards */}
            <StatsCards stats={stats} />

            {/* Charts */}
            <div className="grid gap-6 md:grid-cols-2">
                <UserGrowthChart />
                <RevenueChart />
            </div>

            {/* System Health */}
            <SystemHealth />

            {/* Recent Activity */}
            <RecentActivity activities={recentActivity} />
        </div>
    )
}

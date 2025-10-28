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

const API_BASE_URL =
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3001'

async function fetchWithAuth<T>(path: string, token: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        cache: 'no-store',
    })

    if (!response.ok) {
        throw new Error(
            `Failed to fetch ${path}: ${response.status} ${response.statusText}`,
        )
    }

    return response.json()
}

async function getAdminStats(token: string) {
    try {
        const data = await fetchWithAuth<{
            totalUsers: number
            activeUsers: number
            totalRevenue: number
            recentSignups: number
            usersByTier: Array<{ tier: string; count: number }>
        }>('/api/admin/metrics', token)

        return {
            totalUsers: data.totalUsers ?? 0,
            activeUsers: data.activeUsers ?? 0,
            totalRevenue: data.totalRevenue ?? 0,
            recentSignups: data.recentSignups ?? 0,
            usersByTier: data.usersByTier ?? [],
        }
    } catch (error) {
        console.error('[AdminDashboard] Failed to load admin metrics:', error)
        return {
            totalUsers: 0,
            activeUsers: 0,
            totalRevenue: 0,
            recentSignups: 0,
            usersByTier: [],
        }
    }
}

async function getRecentActivity(token: string) {
    try {
        const data = await fetchWithAuth<{
            logs: Array<{
                id: string
                action: string
                targetType: string
                targetId?: string | null
                createdAt: string
                actor?: { email?: string | null }
            }>
        }>('/api/admin/audit?limit=5', token)

        return data.logs.map((log) => ({
            id: log.id,
            action: log.action,
            actor: { email: log.actor?.email ?? 'Unknown user' },
            targetType: log.targetType ?? 'SYSTEM',
            targetId: log.targetId ?? 'N/A',
            createdAt: new Date(log.createdAt),
        }))
    } catch (error) {
        console.error('[AdminDashboard] Failed to load recent activity:', error)
        return []
    }
}

export default async function AdminDashboard() {
    const session = await auth()

    // Check if user is admin
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/auth')
    }

    if (!session.accessToken) {
        redirect('/auth?reason=missing-token')
    }

    const [stats, recentActivity] = await Promise.all([
        getAdminStats(session.accessToken),
        getRecentActivity(session.accessToken),
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

'use client'

import { StatsCards } from '@/components/admin/dashboard/stats-cards'
import { RecentActivity } from '@/components/admin/dashboard/recent-activity'
import { UserGrowthChart } from '@/components/admin/dashboard/user-growth-chart'
import { RevenueChart } from '@/components/admin/dashboard/revenue-chart'
import { SystemHealth } from '@/components/admin/dashboard/system-health'
import { QuickActions } from '@/components/admin/dashboard/quick-actions'

export default function AdminDashboardClient() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome back, Administrator
                </p>
            </div>

            <QuickActions />
            <StatsCards stats={{ totalUsers: 0, activeUsers: 0, totalRevenue: 0, recentSignups: 0, usersByTier: [] }} />

            <div className="grid gap-6 md:grid-cols-2">
                <UserGrowthChart />
                <RevenueChart />
            </div>

            <SystemHealth />
            <RecentActivity activities={[]} />
        </div>
    )
}

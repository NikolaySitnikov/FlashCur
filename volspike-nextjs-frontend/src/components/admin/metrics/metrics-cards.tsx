'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Users,
    DollarSign,
    TrendingUp,
    Activity,
    AlertTriangle,
    CheckCircle,
    Clock
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface MetricsCardsProps {
    metrics: {
        totalUsers: number
        activeUsers: number
        usersByTier: {
            tier: string
            count: number
        }[]
        totalRevenue: number
        recentSignups: number
        failedLogins: number
        adminSessions: number
    }
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount)
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Users */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                        {metrics.activeUsers.toLocaleString()} active users
                    </p>
                </CardContent>
            </Card>

            {/* Revenue */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
                    <p className="text-xs text-muted-foreground">
                        Total revenue
                    </p>
                </CardContent>
            </Card>

            {/* Recent Signups */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Recent Signups</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{metrics.recentSignups}</div>
                    <p className="text-xs text-muted-foreground">
                        New users this period
                    </p>
                </CardContent>
            </Card>

            {/* System Health */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">System Health</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Failed Logins</span>
                            <span className="text-sm font-medium">
                                {metrics.failedLogins}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Admin Sessions</span>
                            <span className="text-sm font-medium">
                                {metrics.adminSessions}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Status</span>
                            <Badge variant="outline" className="text-xs">
                                Operational
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* User Tiers */}
            <Card className="md:col-span-2 lg:col-span-4">
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Users by Tier</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        {metrics.usersByTier.map((tier) => (
                            <div key={tier.tier} className="flex items-center space-x-2">
                                <Badge variant="outline" className="capitalize">
                                    {tier.tier}
                                </Badge>
                                <div>
                                    <p className="text-sm font-medium">{tier.count} users</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

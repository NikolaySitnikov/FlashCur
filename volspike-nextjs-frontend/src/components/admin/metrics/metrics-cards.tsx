'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Users,
    DollarSign,
    TrendingUp,
    Activity,
    CreditCard,
    AlertTriangle,
    CheckCircle,
    Clock
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface MetricsCardsProps {
    metrics: {
        totalUsers: number
        activeUsers: number
        totalRevenue: number
        monthlyRevenue: number
        totalSubscriptions: number
        activeSubscriptions: number
        averageSessionDuration: number
        systemUptime: number
        errorRate: number
        responseTime: number
    }
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount)
    }

    const formatDuration = (minutes: number) => {
        if (minutes < 60) {
            return `${Math.round(minutes)}m`
        }
        const hours = Math.floor(minutes / 60)
        const remainingMinutes = Math.round(minutes % 60)
        return `${hours}h ${remainingMinutes}m`
    }

    const formatUptime = (percentage: number) => {
        return `${percentage.toFixed(2)}%`
    }

    const getUptimeColor = (percentage: number) => {
        if (percentage >= 99.9) return 'text-green-600'
        if (percentage >= 99.0) return 'text-yellow-600'
        return 'text-red-600'
    }

    const getErrorRateColor = (rate: number) => {
        if (rate <= 0.1) return 'text-green-600'
        if (rate <= 1.0) return 'text-yellow-600'
        return 'text-red-600'
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
                        {metrics.activeUsers.toLocaleString()} active (30d)
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
                        {formatCurrency(metrics.monthlyRevenue)} this month
                    </p>
                </CardContent>
            </Card>

            {/* Subscriptions */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{metrics.totalSubscriptions}</div>
                    <p className="text-xs text-muted-foreground">
                        {metrics.activeSubscriptions} active
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
                            <span className="text-sm">Uptime</span>
                            <span className={`text-sm font-medium ${getUptimeColor(metrics.systemUptime)}`}>
                                {formatUptime(metrics.systemUptime)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Error Rate</span>
                            <span className={`text-sm font-medium ${getErrorRateColor(metrics.errorRate)}`}>
                                {metrics.errorRate.toFixed(2)}%
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Response Time</span>
                            <span className="text-sm font-medium">
                                {metrics.responseTime.toFixed(0)}ms
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Additional Metrics */}
            <Card className="md:col-span-2 lg:col-span-4">
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Additional Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">Avg Session Duration</p>
                                <p className="text-xs text-muted-foreground">
                                    {formatDuration(metrics.averageSessionDuration)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">Growth Rate</p>
                                <p className="text-xs text-muted-foreground">
                                    +12.5% this month
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">System Status</p>
                                <Badge variant="outline" className="text-xs">
                                    All Systems Operational
                                </Badge>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

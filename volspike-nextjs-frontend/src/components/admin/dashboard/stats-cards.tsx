'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Users,
    UserCheck,
    DollarSign,
    UserPlus,
    TrendingUp,
    TrendingDown
} from 'lucide-react'

interface StatsCardsProps {
    stats: {
        totalUsers: number
        activeUsers: number
        totalRevenue: number
        recentSignups: number
        usersByTier: Array<{ tier: string; count: number }>
    }
}

export function StatsCards({ stats }: StatsCardsProps) {
    const cards = [
        {
            title: 'Total Users',
            value: stats.totalUsers.toLocaleString(),
            icon: Users,
            change: '+12%',
            changeType: 'positive' as const,
            description: 'All registered users',
        },
        {
            title: 'Active Users',
            value: stats.activeUsers.toLocaleString(),
            icon: UserCheck,
            change: '+8%',
            changeType: 'positive' as const,
            description: 'Users active in last 30 days',
        },
        {
            title: 'Total Revenue',
            value: `$${stats.totalRevenue.toLocaleString()}`,
            icon: DollarSign,
            change: '+15%',
            changeType: 'positive' as const,
            description: 'Lifetime revenue',
        },
        {
            title: 'Recent Signups',
            value: stats.recentSignups.toString(),
            icon: UserPlus,
            change: '+5%',
            changeType: 'positive' as const,
            description: 'New users this week',
        },
    ]

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => {
                const Icon = card.icon
                return (
                    <Card key={card.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {card.title}
                            </CardTitle>
                            <Icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{card.value}</div>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                {card.changeType === 'positive' ? (
                                    <TrendingUp className="h-3 w-3 text-green-500" />
                                ) : (
                                    <TrendingDown className="h-3 w-3 text-red-500" />
                                )}
                                <span className={card.changeType === 'positive' ? 'text-green-500' : 'text-red-500'}>
                                    {card.change}
                                </span>
                                <span>from last month</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {card.description}
                            </p>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}

// User tier breakdown component
export function UserTierBreakdown({ usersByTier }: { usersByTier: Array<{ tier: string; count: number }> }) {
    const totalUsers = usersByTier.reduce((sum, tier) => sum + tier.count, 0)

    const getTierColor = (tier: string) => {
        switch (tier) {
            case 'elite':
                return 'bg-purple-500'
            case 'pro':
                return 'bg-blue-500'
            default:
                return 'bg-gray-500'
        }
    }

    const getTierLabel = (tier: string) => {
        switch (tier) {
            case 'elite':
                return 'Elite'
            case 'pro':
                return 'Pro'
            default:
                return 'Free'
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Users by Tier</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {usersByTier.map((tier) => {
                        const percentage = totalUsers > 0 ? (tier.count / totalUsers) * 100 : 0
                        return (
                            <div key={tier.tier} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div className={`w-3 h-3 rounded-full ${getTierColor(tier.tier)}`} />
                                        <span className="text-sm font-medium">{getTierLabel(tier.tier)}</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {tier.count.toLocaleString()} ({percentage.toFixed(1)}%)
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${getTierColor(tier.tier)}`}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}

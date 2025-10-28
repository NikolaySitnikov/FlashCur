'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, TrendingUp, UserPlus } from 'lucide-react'

// Mock data - in production, this would come from your API
const userGrowthData = [
    { month: 'Jan', users: 1200, newUsers: 150 },
    { month: 'Feb', users: 1350, newUsers: 180 },
    { month: 'Mar', users: 1520, newUsers: 200 },
    { month: 'Apr', users: 1720, newUsers: 220 },
    { month: 'May', users: 1940, newUsers: 250 },
    { month: 'Jun', users: 2190, newUsers: 280 },
]

export function UserGrowthChart() {
    const currentMonth = userGrowthData[userGrowthData.length - 1]
    const previousMonth = userGrowthData[userGrowthData.length - 2]
    const growthRate = ((currentMonth.users - previousMonth.users) / previousMonth.users) * 100

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">User Growth</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Current Users */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-2xl font-bold">{currentMonth.users.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Total users</p>
                        </div>
                        <div className="flex items-center space-x-1">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-600">
                                +{growthRate.toFixed(1)}%
                            </span>
                        </div>
                    </div>

                    {/* Simple Line Chart */}
                    <div className="space-y-2">
                        {userGrowthData.map((data, index) => {
                            const maxUsers = Math.max(...userGrowthData.map(d => d.users))
                            const percentage = (data.users / maxUsers) * 100

                            return (
                                <div key={data.month} className="flex items-center space-x-2">
                                    <div className="w-8 text-xs text-muted-foreground">{data.month}</div>
                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <div className="w-16 text-xs text-right">{data.users.toLocaleString()}</div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Growth Metrics */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                            <p className="text-xs text-muted-foreground">New Users This Month</p>
                            <p className="text-sm font-medium flex items-center">
                                <UserPlus className="h-3 w-3 mr-1" />
                                {currentMonth.newUsers}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Growth Rate</p>
                            <p className="text-sm font-medium">+{currentMonth.newUsers / currentMonth.users * 100}%</p>
                        </div>
                    </div>

                    {/* Tier Breakdown */}
                    <div className="pt-4 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Users by Tier</p>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span>Free</span>
                                <span>{Math.round(currentMonth.users * 0.6)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span>Pro</span>
                                <span>{Math.round(currentMonth.users * 0.3)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span>Elite</span>
                                <span>{Math.round(currentMonth.users * 0.1)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

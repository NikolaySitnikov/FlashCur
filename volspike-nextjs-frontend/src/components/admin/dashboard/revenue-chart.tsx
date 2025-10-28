'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react'

// Mock data - in production, this would come from your API
const revenueData = [
    { month: 'Jan', revenue: 12000, growth: 5.2 },
    { month: 'Feb', revenue: 15000, growth: 8.1 },
    { month: 'Mar', revenue: 18000, growth: 12.3 },
    { month: 'Apr', revenue: 22000, growth: 15.7 },
    { month: 'May', revenue: 25000, growth: 18.2 },
    { month: 'Jun', revenue: 28000, growth: 22.1 },
]

export function RevenueChart() {
    const currentMonth = revenueData[revenueData.length - 1]
    const previousMonth = revenueData[revenueData.length - 2]
    const growthRate = ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue Growth</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Current Revenue */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-2xl font-bold">${currentMonth.revenue.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Current month</p>
                        </div>
                        <div className="flex items-center space-x-1">
                            {growthRate > 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                            )}
                            <span className={`text-sm font-medium ${growthRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {Math.abs(growthRate).toFixed(1)}%
                            </span>
                        </div>
                    </div>

                    {/* Simple Bar Chart */}
                    <div className="space-y-2">
                        {revenueData.map((data, index) => {
                            const maxRevenue = Math.max(...revenueData.map(d => d.revenue))
                            const percentage = (data.revenue / maxRevenue) * 100

                            return (
                                <div key={data.month} className="flex items-center space-x-2">
                                    <div className="w-8 text-xs text-muted-foreground">{data.month}</div>
                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <div className="w-16 text-xs text-right">${data.revenue.toLocaleString()}</div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Growth Indicators */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                            <p className="text-xs text-muted-foreground">Monthly Growth</p>
                            <p className="text-sm font-medium">+{currentMonth.growth}%</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Year-to-Date</p>
                            <p className="text-sm font-medium">+{((currentMonth.revenue - revenueData[0].revenue) / revenueData[0].revenue * 100).toFixed(1)}%</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

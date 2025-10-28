'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'

export function UserGrowthChart() {
    // This would be implemented with a charting library like Chart.js or Recharts
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>User Growth</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                        <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>User Growth Chart</p>
                        <p className="text-sm">Chart implementation pending</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export function RevenueChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Revenue</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                        <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Revenue Chart</p>
                        <p className="text-sm">Chart implementation pending</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export function SystemHealth() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>System Health</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">99.9%</div>
                        <p className="text-sm text-muted-foreground">Uptime</p>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">45ms</div>
                        <p className="text-sm text-muted-foreground">Response Time</p>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">Healthy</div>
                        <p className="text-sm text-muted-foreground">Database</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export function QuickActions() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-2 md:grid-cols-4">
                    <button className="p-4 text-left border rounded-lg hover:bg-gray-50">
                        <div className="font-medium">Create User</div>
                        <div className="text-sm text-muted-foreground">Add a new user</div>
                    </button>
                    <button className="p-4 text-left border rounded-lg hover:bg-gray-50">
                        <div className="font-medium">View Logs</div>
                        <div className="text-sm text-muted-foreground">Check audit logs</div>
                    </button>
                    <button className="p-4 text-left border rounded-lg hover:bg-gray-50">
                        <div className="font-medium">Sync Stripe</div>
                        <div className="text-sm text-muted-foreground">Update subscriptions</div>
                    </button>
                    <button className="p-4 text-left border rounded-lg hover:bg-gray-50">
                        <div className="font-medium">Export Data</div>
                        <div className="text-sm text-muted-foreground">Download reports</div>
                    </button>
                </div>
            </CardContent>
        </Card>
    )
}

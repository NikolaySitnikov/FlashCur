'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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

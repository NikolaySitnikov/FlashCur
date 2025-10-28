'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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

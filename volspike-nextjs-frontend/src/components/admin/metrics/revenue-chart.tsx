'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function RevenueChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Revenue chart will be implemented with real data
                </div>
            </CardContent>
        </Card>
    )
}

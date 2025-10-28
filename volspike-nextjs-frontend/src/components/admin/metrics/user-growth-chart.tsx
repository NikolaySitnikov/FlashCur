'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function UserGrowthChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>User Growth</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    User growth chart will be implemented with real data
                </div>
            </CardContent>
        </Card>
    )
}

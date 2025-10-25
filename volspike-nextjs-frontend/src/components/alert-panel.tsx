'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, TrendingUp, Volume2 } from 'lucide-react'
import { format } from 'date-fns'

interface Alert {
    id: string
    symbol: string
    volume: number
    threshold: number
    timestamp: number
    reason: string
}

interface AlertPanelProps {
    alerts: Alert[]
}

export function AlertPanel({ alerts }: AlertPanelProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Bell className="h-5 w-5 mr-2" />
                    Volume Alerts
                </CardTitle>
                <CardDescription>
                    Real-time volume spike notifications
                </CardDescription>
            </CardHeader>
            <CardContent>
                {alerts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No alerts yet</p>
                        <p className="text-sm">Volume spikes will appear here</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {alerts.map((alert) => (
                            <div
                                key={alert.id}
                                className="p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-mono text-sm font-semibold">
                                        {alert.symbol}
                                    </span>
                                    <Badge variant="destructive" className="text-xs">
                                        {alert.reason}
                                    </Badge>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Volume:</span>
                                        <span className="font-mono">
                                            ${alert.volume.toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Threshold:</span>
                                        <span className="font-mono">
                                            ${alert.threshold.toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Time:</span>
                                        <span className="text-xs">
                                            {format(new Date(alert.timestamp), 'HH:mm:ss')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

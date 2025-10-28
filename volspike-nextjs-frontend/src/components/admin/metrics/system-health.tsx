'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    CheckCircle,
    AlertTriangle,
    XCircle,
    Database,
    Server,
    Globe,
    Mail,
    CreditCard
} from 'lucide-react'

interface SystemHealthProps {
    health: {
        status: 'healthy' | 'degraded' | 'unhealthy'
        services: {
            database: {
                status: 'up' | 'down'
                responseTime: number
                lastCheck: string
            }
            api: {
                status: 'up' | 'down'
                responseTime: number
                lastCheck: string
            }
            websocket: {
                status: 'up' | 'down'
                responseTime: number
                lastCheck: string
            }
            email: {
                status: 'up' | 'down'
                responseTime: number
                lastCheck: string
            }
            stripe: {
                status: 'up' | 'down'
                responseTime: number
                lastCheck: string
            }
        }
        metrics: {
            cpuUsage: number
            memoryUsage: number
            diskUsage: number
            networkLatency: number
        }
    }
}

const serviceIcons = {
    database: Database,
    api: Server,
    websocket: Globe,
    email: Mail,
    stripe: CreditCard,
}

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'up':
            return <CheckCircle className="h-4 w-4 text-green-600" />
        case 'down':
            return <XCircle className="h-4 w-4 text-red-600" />
        default:
            return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    }
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'up':
            return 'bg-green-100 text-green-800'
        case 'down':
            return 'bg-red-100 text-red-800'
        default:
            return 'bg-yellow-100 text-yellow-800'
    }
}

const getOverallStatusColor = (status: string) => {
    switch (status) {
        case 'healthy':
            return 'bg-green-100 text-green-800'
        case 'degraded':
            return 'bg-yellow-100 text-yellow-800'
        case 'unhealthy':
            return 'bg-red-100 text-red-800'
        default:
            return 'bg-gray-100 text-gray-800'
    }
}

export function SystemHealth({ health }: SystemHealthProps) {
    const formatResponseTime = (ms: number) => {
        if (ms < 1000) {
            return `${ms}ms`
        }
        return `${(ms / 1000).toFixed(2)}s`
    }

    const formatLastCheck = (timestamp: string) => {
        const date = new Date(timestamp)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins}m ago`
        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) return `${diffHours}h ago`
        const diffDays = Math.floor(diffHours / 24)
        return `${diffDays}d ago`
    }

    return (
        <div className="space-y-6">
            {/* Overall Status */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <span>System Health</span>
                        <Badge className={getOverallStatusColor(health.status)}>
                            {health.status.toUpperCase()}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-4">
                        <div className="flex items-center space-x-2">
                            <div className="text-sm font-medium">CPU Usage</div>
                            <div className="text-sm text-muted-foreground">
                                {health.metrics.cpuUsage.toFixed(1)}%
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="text-sm font-medium">Memory Usage</div>
                            <div className="text-sm text-muted-foreground">
                                {health.metrics.memoryUsage.toFixed(1)}%
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="text-sm font-medium">Disk Usage</div>
                            <div className="text-sm text-muted-foreground">
                                {health.metrics.diskUsage.toFixed(1)}%
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="text-sm font-medium">Network Latency</div>
                            <div className="text-sm text-muted-foreground">
                                {formatResponseTime(health.metrics.networkLatency)}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Service Status */}
            <Card>
                <CardHeader>
                    <CardTitle>Service Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Object.entries(health.services).map(([serviceName, service]) => {
                            const Icon = serviceIcons[serviceName as keyof typeof serviceIcons]

                            return (
                                <div key={serviceName} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <Icon className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <div className="font-medium capitalize">{serviceName}</div>
                                            <div className="text-sm text-muted-foreground">
                                                Last checked: {formatLastCheck(service.lastCheck)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <div className="text-right">
                                            <div className="text-sm font-medium">
                                                {formatResponseTime(service.responseTime)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">Response time</div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {getStatusIcon(service.status)}
                                            <Badge className={getStatusColor(service.status)}>
                                                {service.status.toUpperCase()}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

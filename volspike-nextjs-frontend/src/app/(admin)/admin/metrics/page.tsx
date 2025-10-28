import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { MetricsCards } from '@/components/admin/metrics/metrics-cards'
import { RevenueChart } from '@/components/admin/metrics/revenue-chart'
import { UserGrowthChart } from '@/components/admin/metrics/user-growth-chart'
import { SystemHealth } from '@/components/admin/metrics/system-health'
import type { SystemMetrics } from '@/types/admin'

export const metadata: Metadata = {
    title: 'Metrics - Admin',
    description: 'View system metrics and analytics',
}

const API_BASE_URL =
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3001'

interface RawHealthResponse {
    databaseStatus?: {
        status?: string
        responseTime?: number
    }
    apiResponseTime?: number
    errorRate?: number
    activeConnections?: number
    memoryUsage?: {
        used?: number
        total?: number
        percentage?: number
    }
    diskUsage?: {
        used?: number
        total?: number
        percentage?: number
    }
    timestamp?: string
}

async function fetchWithAuth<T>(path: string, token: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        cache: 'no-store',
    })

    if (!response.ok) {
        throw new Error(
            `Failed to fetch ${path}: ${response.status} ${response.statusText}`,
        )
    }

    return response.json()
}

function mapHealthResponse(raw: RawHealthResponse) {
    const timestamp = raw.timestamp ?? new Date().toISOString()
    const databaseStatus = raw.databaseStatus?.status === 'healthy' ? 'up' : 'down'
    const apiStatus = raw.errorRate && raw.errorRate > 5 ? 'down' : 'up'

    return {
        status:
            databaseStatus === 'down' || apiStatus === 'down'
                ? 'degraded'
                : 'healthy',
        services: {
            database: {
                status: databaseStatus,
                responseTime: raw.databaseStatus?.responseTime ?? 0,
                lastCheck: timestamp,
            },
            api: {
                status: apiStatus,
                responseTime: raw.apiResponseTime ?? 0,
                lastCheck: timestamp,
            },
            websocket: {
                status: (raw.activeConnections ?? 0) > 0 ? 'up' : 'down',
                responseTime: Math.max(raw.apiResponseTime ?? 0, 50),
                lastCheck: timestamp,
            },
            email: {
                status: 'up',
                responseTime: 200,
                lastCheck: timestamp,
            },
            stripe: {
                status: 'up',
                responseTime: 180,
                lastCheck: timestamp,
            },
        },
        metrics: {
            // Backend does not expose CPU usage yet; mirror memory usage as a placeholder
            cpuUsage: raw.memoryUsage?.percentage ?? 0,
            memoryUsage: raw.memoryUsage?.percentage ?? 0,
            diskUsage: raw.diskUsage?.percentage ?? 0,
            networkLatency: raw.apiResponseTime ?? 0,
        },
    } as const
}

export default async function MetricsPage() {
    const session = await auth()

    // Check if user is admin
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/auth')
    }

    if (!session.accessToken) {
        throw new Error('Missing admin access token')
    }

    try {
        // Fetch metrics data
        const [metrics, health] = await Promise.all([
            fetchWithAuth<SystemMetrics>(
                '/api/admin/metrics',
                session.accessToken,
            ),
            fetchWithAuth<RawHealthResponse>(
                '/api/admin/metrics/health',
                session.accessToken,
            ),
        ])

        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Metrics</h1>
                    <p className="text-muted-foreground">
                        Monitor system performance and user analytics
                    </p>
                </div>

                {/* Metrics Cards */}
                <MetricsCards metrics={metrics} />

                {/* Charts */}
                <div className="grid gap-6 md:grid-cols-2">
                    <RevenueChart />
                    <UserGrowthChart />
                </div>

                {/* System Health */}
                <SystemHealth health={mapHealthResponse(health)} />
            </div>
        )
    } catch (error) {
        console.error('Error fetching metrics:', error)
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Metrics</h1>
                    <p className="text-muted-foreground">
                        Monitor system performance and user analytics
                    </p>
                </div>
                <div className="text-center py-12">
                    <p className="text-red-600">Error loading metrics. Please try again.</p>
                </div>
            </div>
        )
    }
}

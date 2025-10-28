import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AuditLogTable } from '@/components/admin/audit/audit-log-table'
import { AuditFilters } from '@/components/admin/audit/audit-filters'
import { adminAPI } from '@/lib/admin/api-client'

export const metadata: Metadata = {
    title: 'Audit Logs - Admin',
    description: 'View and manage audit logs',
}

interface AuditPageProps {
    searchParams: Promise<{
        actorUserId?: string
        action?: string
        targetType?: string
        targetId?: string
        startDate?: string
        endDate?: string
        page?: string
        limit?: string
        sortBy?: string
        sortOrder?: string
    }>
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
    const session = await auth()
    const params = await searchParams

    // Check if user is admin
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/auth')
    }

    // Set access token for API client
    adminAPI.setAccessToken(session.accessToken || null)

    try {
        // Parse search params
        const query = {
            actorUserId: params.actorUserId,
            action: params.action,
            targetType: params.targetType,
            targetId: params.targetId,
            startDate: params.startDate ? new Date(params.startDate) : undefined,
            endDate: params.endDate ? new Date(params.endDate) : undefined,
            page: params.page ? parseInt(params.page) : 1,
            limit: params.limit ? parseInt(params.limit) : 20,
            sortBy: params.sortBy as any || 'createdAt',
            sortOrder: params.sortOrder as any || 'desc',
        }

        // Fetch audit logs data
        const auditData = await adminAPI.getAuditLogs(query)

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
                        <p className="text-muted-foreground">
                            Monitor and track all administrative actions
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                            {auditData.pagination.total} total logs
                        </span>
                    </div>
                </div>

                {/* Filters */}
                <AuditFilters currentFilters={query} />

                {/* Audit Logs Table */}
                <AuditLogTable
                    logs={auditData.logs}
                    pagination={auditData.pagination}
                    currentQuery={query}
                />
            </div>
        )
    } catch (error) {
        console.error('Error fetching audit logs:', error)
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
                    <p className="text-muted-foreground">
                        Monitor and track all administrative actions
                    </p>
                </div>
                <div className="text-center py-12">
                    <p className="text-red-600">Error loading audit logs. Please try again.</p>
                </div>
            </div>
        )
    }
}

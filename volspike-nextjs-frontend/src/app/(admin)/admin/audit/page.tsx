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
    searchParams: {
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
    }
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
    const session = await auth()

    // Check if user is admin
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/auth')
    }

    // Set access token for API client
    adminAPI.setAccessToken(session.accessToken || null)

    try {
        // Parse search params
        const query = {
            actorUserId: searchParams.actorUserId,
            action: searchParams.action,
            targetType: searchParams.targetType,
            targetId: searchParams.targetId,
            startDate: searchParams.startDate ? new Date(searchParams.startDate) : undefined,
            endDate: searchParams.endDate ? new Date(searchParams.endDate) : undefined,
            page: searchParams.page ? parseInt(searchParams.page) : 1,
            limit: searchParams.limit ? parseInt(searchParams.limit) : 20,
            sortBy: searchParams.sortBy as any || 'createdAt',
            sortOrder: searchParams.sortOrder as any || 'desc',
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

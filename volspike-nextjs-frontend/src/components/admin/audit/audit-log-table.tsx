'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    MoreHorizontal,
    Eye,
    Download,
    ChevronUp,
    ChevronDown,
    ChevronsUpDown,
    User,
    CreditCard,
    Settings,
    Shield
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'
import { AuditLogEntry } from '@/types/admin'
import { adminAPI } from '@/lib/admin/api-client'

interface AuditLogTableProps {
    logs: AuditLogEntry[]
    pagination: {
        total: number
        page: number
        limit: number
        pages: number
    }
    currentQuery: any
}

const actionIcons = {
    USER_CREATED: User,
    USER_UPDATED: User,
    USER_DELETED: User,
    SUBSCRIPTION_CREATED: CreditCard,
    SUBSCRIPTION_UPDATED: CreditCard,
    SUBSCRIPTION_CANCELLED: CreditCard,
    SETTINGS_UPDATED: Settings,
    SECURITY_EVENT: Shield,
}

const actionColors = {
    USER_CREATED: 'bg-green-100 text-green-800',
    USER_UPDATED: 'bg-blue-100 text-blue-800',
    USER_DELETED: 'bg-red-100 text-red-800',
    SUBSCRIPTION_CREATED: 'bg-green-100 text-green-800',
    SUBSCRIPTION_UPDATED: 'bg-blue-100 text-blue-800',
    SUBSCRIPTION_CANCELLED: 'bg-red-100 text-red-800',
    SETTINGS_UPDATED: 'bg-yellow-100 text-yellow-800',
    SECURITY_EVENT: 'bg-red-100 text-red-800',
}

export function AuditLogTable({ logs, pagination, currentQuery }: AuditLogTableProps) {
    const router = useRouter()
    const [loading, setLoading] = useState<string | null>(null)

    const handleSort = (field: string) => {
        const newSortOrder = currentQuery.sortBy === field && currentQuery.sortOrder === 'asc' ? 'desc' : 'asc'
        const params = new URLSearchParams(currentQuery)
        params.set('sortBy', field)
        params.set('sortOrder', newSortOrder)
        router.push(`/admin/audit?${params.toString()}`)
    }

    const getSortIcon = (field: string) => {
        if (currentQuery.sortBy !== field) {
            return <ChevronsUpDown className="h-4 w-4" />
        }
        return currentQuery.sortOrder === 'asc' ?
            <ChevronUp className="h-4 w-4" /> :
            <ChevronDown className="h-4 w-4" />
    }

    const handleViewDetails = async (logId: string) => {
        setLoading(logId)
        try {
            const log = await adminAPI.getAuditLogById(logId)
            // This would open a modal or navigate to a details page
            toast.success('Log details functionality coming soon')
        } catch (error) {
            toast.error('Failed to load log details')
        } finally {
            setLoading(null)
        }
    }

    const handleExport = async () => {
        try {
            const csvData = await adminAPI.exportAuditLogs(currentQuery, 'csv')

            // Create and download file
            const blob = new Blob([csvData], { type: 'text/csv' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)

            toast.success('Audit logs exported successfully')
        } catch (error) {
            toast.error('Export failed')
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Button onClick={handleExport} variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Action</TableHead>
                            <TableHead>Actor</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort('createdAt')}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Date</span>
                                    {getSortIcon('createdAt')}
                                </div>
                            </TableHead>
                            <TableHead>IP Address</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.map((log) => {
                            const Icon = actionIcons[log.action as keyof typeof actionIcons] || User
                            const colorClass = actionColors[log.action as keyof typeof actionColors] || 'bg-gray-100 text-gray-800'

                            return (
                                <TableRow key={log.id}>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <div className={`p-1 rounded ${colorClass}`}>
                                                <Icon className="h-3 w-3" />
                                            </div>
                                            <span className="text-sm font-medium">{log.action}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{log.actor.email}</span>
                                            <span className="text-xs text-muted-foreground">{log.actor.role}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm">{log.targetType}</span>
                                            {log.targetId && (
                                                <span className="text-xs text-muted-foreground">
                                                    ID: {log.targetId}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm">
                                                {format(new Date(log.createdAt), 'MMM d, yyyy')}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {format(new Date(log.createdAt), 'HH:mm:ss')}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm font-mono">
                                            {log.metadata?.ip || 'N/A'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    disabled={loading === log.id}
                                                >
                                                    {loading === log.id ? (
                                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                                                    ) : (
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleViewDetails(log.id)}>
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View Details
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => {
                                                    navigator.clipboard.writeText(log.id)
                                                    toast.success('Log ID copied to clipboard')
                                                }}>
                                                    Copy Log ID
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} logs
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page <= 1}
                            onClick={() => {
                                const params = new URLSearchParams(currentQuery)
                                params.set('page', String(pagination.page - 1))
                                router.push(`/admin/audit?${params.toString()}`)
                            }}
                        >
                            Previous
                        </Button>
                        <span className="text-sm">
                            Page {pagination.page} of {pagination.pages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page >= pagination.pages}
                            onClick={() => {
                                const params = new URLSearchParams(currentQuery)
                                params.set('page', String(pagination.page + 1))
                                router.push(`/admin/audit?${params.toString()}`)
                            }}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}

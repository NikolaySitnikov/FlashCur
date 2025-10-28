import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { UsersTable } from '@/components/admin/users/users-table'
import { UserFilters } from '@/components/admin/users/user-filters'
import { UserActions } from '@/components/admin/users/user-actions'
import { adminAPI } from '@/lib/admin/api-client'

export const metadata: Metadata = {
    title: 'Users Management - Admin',
    description: 'Manage users and their accounts',
}

interface UsersPageProps {
    searchParams: Promise<{
        search?: string
        role?: string
        tier?: string
        status?: string
        page?: string
        limit?: string
        sortBy?: string
        sortOrder?: string
    }>
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
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
            search: params.search,
            role: params.role as any,
            tier: params.tier as any,
            status: params.status as any,
            page: params.page ? parseInt(params.page) : 1,
            limit: params.limit ? parseInt(params.limit) : 20,
            sortBy: params.sortBy as any || 'createdAt',
            sortOrder: params.sortOrder as any || 'desc',
        }

        // Fetch users data
        const usersData = await adminAPI.getUsers(query)

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Users Management</h1>
                        <p className="text-muted-foreground">
                            Manage user accounts, roles, and subscriptions
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                            {usersData.pagination.total} total users
                        </span>
                    </div>
                </div>

                {/* Filters */}
                <UserFilters currentFilters={query} />

                {/* Bulk Actions */}
                <UserActions />

                {/* Users Table */}
                <UsersTable
                    users={usersData.users}
                    pagination={usersData.pagination}
                    currentQuery={query}
                />
            </div>
        )
    } catch (error) {
        console.error('Error fetching users:', error)
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Users Management</h1>
                    <p className="text-muted-foreground">
                        Manage user accounts, roles, and subscriptions
                    </p>
                </div>
                <div className="text-center py-12">
                    <p className="text-red-600">Error loading users. Please try again.</p>
                </div>
            </div>
        )
    }
}

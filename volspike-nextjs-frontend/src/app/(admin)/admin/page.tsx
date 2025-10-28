// SERVER COMPONENT – no "use client" here
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { verifyAccessTokenAndRole, getServerAuthToken } from '@/lib/auth-server'
import AdminDashboardClient from './admin-dashboard-client'

export const metadata: Metadata = {
    title: 'Admin Dashboard - VolSpike',
    description: 'Admin dashboard for managing VolSpike platform',
}

export default async function AdminPage() {
    const token = getServerAuthToken()
    const { ok, role } = await verifyAccessTokenAndRole(token)

    if (!ok || role !== 'admin') {
        // always redirect from the server – consistent tree
        redirect('/auth?next=/admin')
    }

    // Render admin as a stable tree; client components are loaded directly
    return <AdminDashboardClient />
}

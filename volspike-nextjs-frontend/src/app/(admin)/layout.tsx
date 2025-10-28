import { Metadata } from 'next'
import { AdminLayout } from '@/components/admin/layout/admin-layout'

export const metadata: Metadata = {
    title: 'Admin Dashboard - VolSpike',
    description: 'Admin dashboard for managing VolSpike platform',
}

export default function AdminLayoutWrapper({
    children,
}: {
    children: React.ReactNode
}) {
    return <AdminLayout>{children}</AdminLayout>
}

import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AdminLayout } from '@/components/admin/layout/admin-layout'
import { auth } from '@/lib/auth'

export const metadata: Metadata = {
    title: 'Admin Dashboard - VolSpike',
    description: 'Admin dashboard for managing VolSpike platform',
}

export default async function AdminLayoutWrapper({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    if (!session?.user || session.user.role !== 'ADMIN' || !session.accessToken) {
        redirect('/auth')
    }

    return <AdminLayout>{children}</AdminLayout>
}

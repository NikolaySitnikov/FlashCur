// SERVER COMPONENT (no "use client")
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/admin/layout/admin-layout'
import { verifyAccessTokenAndRole } from '@/lib/auth-server'

export default async function AdminPage() {
  const token = cookies().get('accessToken')?.value
  const { ok, role } = await verifyAccessTokenAndRole(token)
  if (!ok || role !== 'admin') redirect('/auth?next=/admin')
  return <AdminLayout />
}

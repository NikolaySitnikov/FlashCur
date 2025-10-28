// SERVER COMPONENT (no "use client")
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function Page() {
  const token = cookies().get('accessToken')?.value
  if (!token) redirect('/auth')
  redirect('/admin')
}

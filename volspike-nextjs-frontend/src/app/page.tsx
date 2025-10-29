export const dynamic = 'force-dynamic'
export const revalidate = 0
import { redirect } from 'next/navigation'
import { getNextAuthSession } from '@/lib/auth-server'

export default async function HomePage() {
    const session = await getNextAuthSession()

    if (!session?.user) {
        redirect('/auth')
    }

    redirect('/dashboard')
}
// Force Vercel rebuild - Sat Oct 25 21:45:18 EST 2025

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function HomePage() {
    const session = await auth()

    if (!session) {
        redirect('/auth')
    }

    redirect('/dashboard')
}
// Force Vercel rebuild - Sat Oct 25 21:45:18 EST 2025

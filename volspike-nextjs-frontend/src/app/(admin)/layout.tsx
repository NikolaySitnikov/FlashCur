import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Admin Dashboard - VolSpike',
    description: 'Admin dashboard for managing VolSpike platform',
}

// server component – no "use client"
export default function AdminSegmentLayout({ children }: { children: React.ReactNode }) {
    return children
}
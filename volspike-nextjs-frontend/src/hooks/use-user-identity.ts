'use client'

import { useSession } from 'next-auth/react'
import { useMemo } from 'react'

export interface UserIdentity {
    displayName: string
    email: string | null
    address: string | null
    ens: string | null
    role: 'USER' | 'ADMIN' | null
    tier: 'free' | 'pro' | 'elite' | null
    image: string | null
    isLoading: boolean
}

export function useUserIdentity(): UserIdentity {
    const { data: session, status: sessionStatus } = useSession()

    const isLoading = sessionStatus === 'loading'

    const identity = useMemo(() => {
        const email = session?.user?.email || null
        // Wallet address would come from session if stored there, or from a separate hook
        // For now, we'll use email-only identity to avoid WagmiProvider dependency issues
        const walletAddress = null // TODO: Add wallet address from session or separate hook
        const ens = null // TODO: Add ENS name when wallet address is available

        // Determine display name priority: name > email
        let displayName = 'User'
        if (session?.user?.name) {
            displayName = session.user.name
        } else if (email) {
            // Show full email for better UX
            displayName = email
        }

        return {
            displayName,
            email,
            address: walletAddress,
            ens,
            role: session?.user?.role || null,
            tier: session?.user?.tier || null,
            image: session?.user?.image || null,
            isLoading,
        }
    }, [session, isLoading])

    return identity
}

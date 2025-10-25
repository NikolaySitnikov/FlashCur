'use client'

import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { mainnet, polygon, arbitrum, optimism } from 'wagmi/chains'
import { http } from 'viem'
import { useEffect, useState } from 'react'

// RainbowKit configuration for Wagmi v2
const config = getDefaultConfig({
    appName: 'VolSpike',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'your-walletconnect-project-id',
    chains: [mainnet, polygon, arbitrum, optimism],
    transports: {
        [mainnet.id]: http(),
        [polygon.id]: http(),
        [arbitrum.id]: http(),
        [optimism.id]: http(),
    },
    // Key additions to fix hydration issues
    ssr: true, // Enable SSR support
    multiInjectedProviderDiscovery: false, // Prevent multiple discovery attempts
    batch: {
        multicall: true,
    },
})

export default function Web3Providers({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false)

    // Only render Web3 providers after hydration is complete
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <>{children}</>
    }

    return (
        <WagmiProvider config={config}>
            <RainbowKitProvider>
                {children}
            </RainbowKitProvider>
        </WagmiProvider>
    )
}

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

    // IMPORTANT: Always render the providers, but return a placeholder during hydration
    // This ensures the context is available even if the UI isn't visible
    return (
        <WagmiProvider config={config}>
            <RainbowKitProvider>
                {mounted ? (
                    children
                ) : (
                    // During hydration, render children without Web3 UI
                    // but keep the context available
                    <div suppressHydrationWarning>
                        {children}
                    </div>
                )}
            </RainbowKitProvider>
        </WagmiProvider>
    )
}

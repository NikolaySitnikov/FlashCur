'use client'

import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { mainnet, polygon, arbitrum, optimism } from 'wagmi/chains'
import { http } from 'viem'

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
})

export default function Web3Providers({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <RainbowKitProvider>
                {children}
            </RainbowKitProvider>
        </WagmiProvider>
    )
}

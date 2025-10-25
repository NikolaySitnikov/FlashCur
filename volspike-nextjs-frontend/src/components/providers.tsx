'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { SessionProvider } from 'next-auth/react'
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { mainnet, polygon, arbitrum, optimism } from 'wagmi/chains'
import { QueryClient as WagmiQueryClient } from '@tanstack/react-query'
import { http } from 'viem'
import { useState } from 'react'
import { ThemeProvider } from '@/components/theme-provider'

// RainbowKit configuration
const config = getDefaultConfig({
    appName: 'VolSpike',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
    chains: [mainnet, polygon, arbitrum, optimism],
    transports: {
        [mainnet.id]: http(),
        [polygon.id]: http(),
        [arbitrum.id]: http(),
        [optimism.id]: http(),
    },
})

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000, // 1 minute
                gcTime: 5 * 60 * 1000, // 5 minutes
                retry: (failureCount, error) => {
                    if (failureCount < 3) return true
                    return false
                },
            },
        },
    }))

    const [wagmiQueryClient] = useState(() => new WagmiQueryClient())

    return (
        <WagmiProvider config={config} queryClient={wagmiQueryClient}>
            <QueryClientProvider client={queryClient}>
                <SessionProvider>
                    <RainbowKitProvider>
                        <ThemeProvider
                            attribute="class"
                            defaultTheme="system"
                            enableSystem
                            disableTransitionOnChange
                        >
                            {children}
                            <ReactQueryDevtools initialIsOpen={false} />
                        </ThemeProvider>
                    </RainbowKitProvider>
                </SessionProvider>
            </QueryClientProvider>
        </WagmiProvider>
    )
}

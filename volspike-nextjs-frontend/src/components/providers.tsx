'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { ThemeProvider } from '@/components/theme-provider'

// Dynamic import for Web3 providers to prevent hydration mismatches
const Web3Providers = dynamic(
    () => import('./web3-providers'),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        )
    }
)

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000, // 1 minute
                gcTime: 5 * 60 * 1000, // 5 minutes
                retry: (failureCount) => failureCount < 3, // Simplified retry logic
            },
        },
    }))

    return (
        <QueryClientProvider client={queryClient}>
            <SessionProvider>
                <Web3Providers>
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="system"
                        enableSystem
                        disableTransitionOnChange
                    >
                        {children}
                        {/* ReactQueryDevtools removed for cleaner UI */}
                    </ThemeProvider>
                </Web3Providers>
            </SessionProvider>
        </QueryClientProvider>
    )
}

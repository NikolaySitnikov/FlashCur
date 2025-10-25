'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

interface MarketData {
    symbol: string
    price: number
    volume24h: number
    volumeChange: number
    fundingRate: number
    openInterest: number
    timestamp: number
}

export function useMarketData() {
    const { data: session } = useSession()

    return useQuery({
        queryKey: ['market-data'],
        queryFn: async (): Promise<MarketData[]> => {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/market-data`, {
                headers: {
                    'Authorization': `Bearer ${session?.accessToken}`,
                },
            })

            if (!response.ok) {
                throw new Error('Failed to fetch market data')
            }

            return response.json()
        },
        enabled: !!session,
        refetchInterval: session?.user?.tier === 'elite' ? 30000 : 300000, // 30s for elite, 5min for others
        staleTime: session?.user?.tier === 'elite' ? 15000 : 60000, // 15s for elite, 1min for others
    })
}

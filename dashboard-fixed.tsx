'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useSocket } from '@/hooks/use-socket'
import { useClientOnlyMarketData } from '@/hooks/use-client-only-market-data'
import { Header } from '@/components/header'
import { MarketTable } from '@/components/market-table'
import { AlertPanel } from '@/components/alert-panel'
import { TierUpgrade } from '@/components/tier-upgrade'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function Dashboard() {
    const { data: session, status } = useSession()
    const { socket, isConnected } = useSocket()
    const [alerts, setAlerts] = useState<any[]>([])
    const [countdownDisplay, setCountdownDisplay] = useState<string>('')

    // Determine user tier
    const userTier = session?.user?.tier || 'free'

    // Stabilize onDataUpdate callback to prevent WebSocket reconnect loops
    const handleDataUpdate = useCallback((data: any[]) => {
        console.log(`📊 Market data updated: ${data.length} symbols`)
    }, [])

    // Use client-only market data (no API calls, no Redis)
    const {
        data: marketData,
        lastUpdate,
        nextUpdate,
        isLive,
        isConnecting,
        isReconnecting,
        hasError
    } = useClientOnlyMarketData({
        tier: userTier as 'elite' | 'pro' | 'free',
        onDataUpdate: handleDataUpdate
    })

    // Real-time countdown timer for next update (non-elite tiers)
    useEffect(() => {
        if (userTier === 'elite' || nextUpdate === 0) {
            setCountdownDisplay('')
            return
        }

        const updateCountdown = () => {
            const now = Date.now()
            const remaining = Math.max(0, nextUpdate - now)

            if (remaining === 0) {
                setCountdownDisplay('')
                return
            }

            const minutes = Math.floor(remaining / 60000)
            const seconds = Math.floor((remaining % 60000) / 1000)
            setCountdownDisplay(`${minutes}:${seconds.toString().padStart(2, '0')}`)
        }

        // Update immediately
        updateCountdown()

        // Update every second
        const interval = setInterval(updateCountdown, 1000)

        return () => clearInterval(interval)
    }, [nextUpdate, userTier])

    useEffect(() => {
        if (socket && isConnected) {
            // Subscribe to market updates
            socket.on('market-update', (data) => {
                console.log('Market update received:', data)
                // Handle both old and new data formats
                const marketData = data.data || data
                if (marketData) {
                    // Update the market data in the UI
                    // This will trigger a re-render with fresh data
                }
            })

            // Subscribe to alerts
            socket.on('alert-triggered', (alert) => {
                setAlerts(prev => [alert, ...prev.slice(0, 9)]) // Keep last 10 alerts
            })

            return () => {
                socket.off('market-update')
                socket.off('alert-triggered')
            }
        }
    }, [socket, isConnected])

    if (status === 'loading') {
        return <LoadingSpinner />
    }

    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Welcome to VolSpike</CardTitle>
                        <CardDescription>
                            Sign in to access real-time volume spike alerts for Binance perpetual futures
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <TierUpgrade />
                    </CardContent>
                </Card>
            </div>
        )
    }

    const marketDataCard = (
        <Card>
            <CardHeader>
                <CardTitle>
                    Market Data
                    <span className="ml-2 text-sm font-normal text-gray-500">
                        ({userTier.toUpperCase()} Tier)
                    </span>
                </CardTitle>
                <CardDescription>
                    Real-time volume spikes and market movements
                    {isLive ? (
                        <span className="ml-2 text-green-500">● Live Data (Binance WebSocket)</span>
                    ) : isConnecting ? (
                        <span className="ml-2 text-yellow-500">● Connecting to Binance...</span>
                    ) : isReconnecting ? (
                        <span className="ml-2 text-yellow-500">● Reconnecting...</span>
                    ) : hasError ? (
                        <span className="ml-2 text-red-500">● Connection Failed</span>
                    ) : (
                        <span className="ml-2 text-blue-500">● Loading...</span>
                    )}
                    {lastUpdate > 0 && (
                        <span className="ml-2 text-gray-500">
                            (Updated {Math.floor((Date.now() - lastUpdate) / 1000)}s ago)
                        </span>
                    )}
                    {countdownDisplay && (
                        <span className="ml-2 text-blue-500">
                            • Next update in {countdownDisplay}
                        </span>
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isConnecting ? (
                    <LoadingSpinner />
                ) : hasError ? (
                    <div className="text-red-500">
                        Connection failed. Please refresh the page.
                    </div>
                ) : marketData.length === 0 ? (
                    <div className="text-yellow-500">
                        No market data available. {isConnecting ? 'Connecting to Binance...' : 'Please check your connection.'}
                    </div>
                ) : (
                    <MarketTable
                        data={marketData}
                        userTier={userTier as 'free' | 'pro' | 'elite'}
                        withContainer={false}
                    />
                )}
            </CardContent>
        </Card>
    )

    const alertsCard = <AlertPanel alerts={alerts} />

    return (
        <div className="flex-1 bg-background">
            <Header />

            <main className="container mx-auto px-4 py-8">
                <div className="space-y-6">
                    <div className="lg:hidden">
                        <Tabs defaultValue="market" className="w-full">
                            <TabsList className="grid grid-cols-2">
                                <TabsTrigger value="market">Market Data</TabsTrigger>
                                <TabsTrigger value="alerts">Volume Alerts</TabsTrigger>
                            </TabsList>
                            <TabsContent value="market" className="mt-4">
                                {marketDataCard}
                            </TabsContent>
                            <TabsContent value="alerts" className="mt-4">
                                {alertsCard}
                            </TabsContent>
                        </Tabs>
                    </div>

                    <div className="hidden gap-6 lg:grid lg:grid-cols-4">
                        <div className="lg:col-span-3">
                            {marketDataCard}
                        </div>
                        <div className="lg:col-span-1">
                            {alertsCard}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

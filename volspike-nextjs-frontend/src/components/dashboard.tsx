'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useSocket } from '@/hooks/use-socket'
import { useMarketData } from '@/hooks/use-market-data'
import { useBinanceWebSocket } from '@/hooks/use-binance-websocket'
import { Header } from '@/components/header'
import { MarketTable } from '@/components/market-table'
import { AlertPanel } from '@/components/alert-panel'
import { TierUpgrade } from '@/components/tier-upgrade'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function Dashboard() {
    const { data: session, status } = useSession()
    const { socket, isConnected } = useSocket()
    const { data: marketData, isLoading, error } = useMarketData()
    const [alerts, setAlerts] = useState<any[]>([])
    const [currentMarketData, setCurrentMarketData] = useState<any[]>([])
    const [nextUpdateCountdown, setNextUpdateCountdown] = useState<number>(0)

    // Determine user tier
    const userTier = session?.user?.tier || 'free'

    // Tier-based throttling intervals (in milliseconds)
    const UPDATE_INTERVAL = userTier === 'elite' ? 0 : (userTier === 'pro' ? 300_000 : 900_000) // 0ms, 5min, 15min

    // Use client-side Binance WebSocket for all tiers with throttling
    const {
        isConnected: binanceConnected,
        connectionStatus,
        lastUpdate,
        forceUpdate
    } = useBinanceWebSocket({
        tier: userTier as 'elite' | 'pro' | 'free',
        onDataUpdate: (data) => {
            setCurrentMarketData(data)
        },
        onError: (error) => {
            console.error('Binance WebSocket error:', error)
        }
    })

    // Fallback to API data if WebSocket fails
    useEffect(() => {
        if (!binanceConnected && marketData && marketData.length > 0) {
            setCurrentMarketData(marketData)
        }
    }, [binanceConnected, marketData])

    // Countdown timer for next update (non-elite tiers)
    useEffect(() => {
        if (userTier === 'elite' || UPDATE_INTERVAL === 0) {
            setNextUpdateCountdown(0)
            return
        }

        const interval = setInterval(() => {
            const now = Date.now()
            const timeSinceLastUpdate = now - lastUpdate
            const timeUntilNext = UPDATE_INTERVAL - timeSinceLastUpdate

            if (timeUntilNext > 0) {
                setNextUpdateCountdown(Math.ceil(timeUntilNext / 1000))
            } else {
                setNextUpdateCountdown(0)
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [userTier, UPDATE_INTERVAL, lastUpdate])

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

    return (
        <div className="min-h-screen bg-background">
            <Header />

            <main className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Main Market Data */}
                    <div className="lg:col-span-3">
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Live Market Data
                                    <span className="ml-2 text-sm font-normal text-gray-500">
                                        ({userTier.toUpperCase()} Tier)
                                    </span>
                                </CardTitle>
                                <CardDescription>
                                    Real-time volume spikes and market movements
                                    {binanceConnected ? (
                                        <span className="ml-2 text-green-500">● Live Data (Binance WebSocket)</span>
                                    ) : connectionStatus === 'connecting' ? (
                                        <span className="ml-2 text-yellow-500">● Connecting to Binance...</span>
                                    ) : connectionStatus === 'error' ? (
                                        <span className="ml-2 text-red-500">● Binance Connection Failed</span>
                                    ) : (
                                        <span className="ml-2 text-blue-500">● Cached Data</span>
                                    )}
                                    {lastUpdate > 0 && (
                                        <span className="ml-2 text-gray-500">
                                            (Updated {Math.floor((Date.now() - lastUpdate) / 1000)}s ago)
                                        </span>
                                    )}
                                    {nextUpdateCountdown > 0 && userTier !== 'elite' && (
                                        <span className="ml-2 text-blue-500">
                                            • Next update in {Math.floor(nextUpdateCountdown / 60)}:{(nextUpdateCountdown % 60).toString().padStart(2, '0')}
                                        </span>
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <LoadingSpinner />
                                ) : error ? (
                                    <div className="text-red-500">
                                        Error loading market data: {String(error)}
                                    </div>
                                ) : currentMarketData.length === 0 ? (
                                    <div className="text-yellow-500">
                                        No market data available. {binanceConnected ? 'Waiting for WebSocket data...' : 'Please check your connection.'}
                                    </div>
                                ) : (
                                    <MarketTable data={currentMarketData} />
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Alerts Panel */}
                    <div className="lg:col-span-1">
                        <AlertPanel alerts={alerts} />
                    </div>
                </div>
            </main>
        </div>
    )
}

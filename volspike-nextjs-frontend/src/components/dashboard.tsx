'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useSocket } from '@/hooks/use-socket'
import { useMarketData } from '@/hooks/use-market-data'
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
    const [alerts, setAlerts] = useState([])

    useEffect(() => {
        if (socket && isConnected) {
            // Subscribe to market updates
            socket.on('market-update', (data) => {
                console.log('Market update received:', data)
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
                                <CardTitle>Live Market Data</CardTitle>
                                <CardDescription>
                                    Real-time volume spikes and market movements
                                    {isConnected && (
                                        <span className="ml-2 text-green-500">● Connected</span>
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <LoadingSpinner />
                                ) : error ? (
                                    <div className="text-red-500">Error loading market data</div>
                                ) : (
                                    <MarketTable data={marketData} />
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

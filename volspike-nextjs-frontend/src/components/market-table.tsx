'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

const FUNDING_ALERT_THRESHOLD = 0.0003

interface MarketData {
    symbol: string
    price: number
    volume24h: number
    change24h?: number
    volumeChange?: number
    fundingRate: number
    openInterest: number
    timestamp: number
}

interface MarketTableProps {
    data: MarketData[]
    userTier?: 'free' | 'pro' | 'elite'
    withContainer?: boolean
    lastUpdate?: number
    isConnected?: boolean
}

// Optimized number formatters using Intl.NumberFormat
const priceFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
})

const percentFormatter = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'always',
})

const fundingFormatter = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
    signDisplay: 'always',
})

export function MarketTable({ 
    data, 
    userTier = 'free', 
    withContainer = true,
    lastUpdate,
    isConnected = true 
}: MarketTableProps) {
    const [sortBy, setSortBy] = useState<'symbol' | 'volume' | 'change' | 'price' | 'funding'>('volume')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

    const formatVolume = useMemo(() => (value: number) => {
        const abs = Math.abs(value)
        if (abs >= 1_000_000_000) {
            return `$${(value / 1_000_000_000).toFixed(2)}B`
        }
        if (abs >= 1_000_000) {
            return `$${(value / 1_000_000).toFixed(2)}M`
        }
        if (abs >= 1_000) {
            return `$${(value / 1_000).toFixed(2)}K`
        }
        return priceFormatter.format(value)
    }, [])

    const formatSymbol = (symbol: string) => symbol.replace(/USDT$/i, '')

    const formatPrice = (price: number) => {
        if (price >= 1) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(price)
        }
        // More decimals for small prices
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 4,
            maximumFractionDigits: 6,
        }).format(price)
    }

    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            let aValue: number, bValue: number

            switch (sortBy) {
                case 'symbol':
                    return sortOrder === 'asc'
                        ? formatSymbol(a.symbol).localeCompare(formatSymbol(b.symbol))
                        : formatSymbol(b.symbol).localeCompare(formatSymbol(a.symbol))
                case 'volume':
                    aValue = a.volume24h
                    bValue = b.volume24h
                    break
                case 'change':
                    aValue = a.change24h ?? a.volumeChange ?? 0
                    bValue = b.change24h ?? b.volumeChange ?? 0
                    break
                case 'price':
                    aValue = a.price
                    bValue = b.price
                    break
                case 'funding':
                    aValue = a.fundingRate ?? 0
                    bValue = b.fundingRate ?? 0
                    break
                default:
                    return 0
            }

            return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
        })
    }, [data, sortBy, sortOrder])

    const handleSort = (column: 'symbol' | 'volume' | 'change' | 'price' | 'funding') => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
            return
        }

        setSortBy(column)
        if (column === 'symbol') {
            setSortOrder('asc')
        } else {
            setSortOrder('desc')
        }
    }

    const SortIcon = ({ column }: { column: typeof sortBy }) => {
        if (sortBy !== column) {
            return <ArrowUpDown className="h-3 w-3 opacity-40" />
        }
        return sortOrder === 'desc' ? 
            <ArrowDown className="h-3 w-3 text-brand-500" /> : 
            <ArrowUp className="h-3 w-3 text-brand-500" />
    }

    const getLastUpdateText = () => {
        if (!lastUpdate) return ''
        const seconds = Math.floor((Date.now() - lastUpdate) / 1000)
        if (seconds < 60) return `${seconds}s ago`
        const minutes = Math.floor(seconds / 60)
        if (minutes < 60) return `${minutes}m ago`
        const hours = Math.floor(minutes / 60)
        return `${hours}h ago`
    }

    const tableContent = (
        <div className="relative">
            {/* Status Bar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/30">
                <div className="flex items-center gap-2">
                    <Badge 
                        variant="outline" 
                        className={`text-xs font-mono-tabular ${
                            isConnected 
                                ? 'border-brand-500/30 text-brand-600 dark:text-brand-400' 
                                : 'border-danger-500/30 text-danger-600 dark:text-danger-400'
                        }`}
                    >
                        <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                            isConnected ? 'bg-brand-500 animate-pulse-glow' : 'bg-danger-500'
                        }`} />
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                    {lastUpdate && (
                        <span className="text-xs text-muted-foreground font-mono-tabular">
                            Updated {getLastUpdateText()}
                        </span>
                    )}
                </div>
                <span className="text-xs text-muted-foreground">
                    {sortedData.length} symbols
                </span>
            </div>

            {/* Table with sticky header */}
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full">
                    <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm shadow-sm">
                        <tr className="border-b border-border/50">
                            <th className="text-left p-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('symbol')}
                                    className="h-auto p-0 font-semibold hover:text-brand-500 transition-colors"
                                >
                                    <span className="mr-1.5">Ticker</span>
                                    <SortIcon column="symbol" />
                                </Button>
                            </th>
                            <th className="text-right p-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('price')}
                                    className="h-auto p-0 font-semibold hover:text-brand-500 transition-colors"
                                >
                                    <span className="mr-1.5">Price</span>
                                    <SortIcon column="price" />
                                </Button>
                            </th>
                            <th className="text-right p-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('change')}
                                    className="h-auto p-0 font-semibold hover:text-brand-500 transition-colors"
                                >
                                    <span className="mr-1.5">Price Change</span>
                                    <SortIcon column="change" />
                                </Button>
                            </th>
                            <th className="text-right p-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('funding')}
                                    className="h-auto p-0 font-semibold hover:text-brand-500 transition-colors"
                                >
                                    <span className="mr-1.5">Funding Rate</span>
                                    <SortIcon column="funding" />
                                </Button>
                            </th>
                            <th className="text-right p-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('volume')}
                                    className="h-auto p-0 font-semibold hover:text-brand-500 transition-colors"
                                >
                                    <span className="mr-1.5">24h Volume</span>
                                    <SortIcon column="volume" />
                                </Button>
                            </th>
                            {userTier !== 'free' && (
                                <th className="text-right p-3 text-sm font-semibold">Open Interest</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map((item) => {
                            const fundingRate = item.fundingRate ?? 0
                            const exceedsThreshold = Math.abs(fundingRate) >= FUNDING_ALERT_THRESHOLD
                            const changeValue = item.change24h ?? item.volumeChange ?? 0

                            const rowClasses = ['border-b border-border/40 transition-all duration-150']
                            if (fundingRate >= FUNDING_ALERT_THRESHOLD) {
                                rowClasses.push('bg-brand-500/5 hover:bg-brand-500/10 border-l-2 border-l-brand-500/30')
                            } else if (fundingRate <= -FUNDING_ALERT_THRESHOLD) {
                                rowClasses.push('bg-danger-500/5 hover:bg-danger-500/10 border-l-2 border-l-danger-500/30')
                            } else {
                                rowClasses.push('hover:bg-muted/50')
                            }

                            const fundingClass = exceedsThreshold
                                ? fundingRate > 0
                                    ? 'text-brand-600 dark:text-brand-400 font-semibold'
                                    : 'text-danger-600 dark:text-danger-400 font-semibold'
                                : 'text-muted-foreground'

                            const changeClass = changeValue > 0
                                ? 'text-brand-600 dark:text-brand-400'
                                : changeValue < 0
                                    ? 'text-danger-600 dark:text-danger-400'
                                    : 'text-muted-foreground'

                            return (
                                <tr
                                    key={item.symbol}
                                    className={rowClasses.join(' ')}
                                >
                                    <td className="p-3 font-semibold text-sm">
                                        {formatSymbol(item.symbol)}
                                    </td>
                                    <td className="p-3 text-right font-mono-tabular text-sm">
                                        {formatPrice(item.price)}
                                    </td>
                                    <td className="p-3 text-right font-mono-tabular text-sm">
                                        <span className={changeClass}>
                                            {changeValue > 0 ? '+' : ''}{changeValue.toFixed(2)}%
                                        </span>
                                    </td>
                                    <td className="p-3 text-right font-mono-tabular text-sm">
                                        <span className={fundingClass}>
                                            {fundingRate > 0 ? '+' : ''}{(fundingRate * 100).toFixed(4)}%
                                        </span>
                                    </td>
                                    <td className="p-3 text-right font-mono-tabular text-sm font-medium">
                                        {formatVolume(item.volume24h)}
                                    </td>
                                    {userTier !== 'free' && (
                                        <td className="p-3 text-right font-mono-tabular text-sm text-muted-foreground">
                                            {formatVolume(item.openInterest ?? 0)}
                                        </td>
                                    )}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )

    if (!withContainer) {
        return tableContent
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader>
                <CardTitle>Market Data</CardTitle>
                <CardDescription>
                    Real-time volume spikes and market movements
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">{tableContent}</CardContent>
        </Card>
    )
}

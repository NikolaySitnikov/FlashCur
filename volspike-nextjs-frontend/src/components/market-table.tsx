'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const FUNDING_ALERT_THRESHOLD = 0.0003

interface MarketData {
    symbol: string
    price: number
    volume24h: number
    change24h?: number  // Changed from volumeChange to change24h to match Cloudflare Worker data
    volumeChange?: number  // Keep for backward compatibility
    fundingRate: number
    openInterest: number
    timestamp: number
}

interface MarketTableProps {
    data: MarketData[]
    userTier?: 'free' | 'pro' | 'elite'
    withContainer?: boolean
}

export function MarketTable({ data, userTier = 'free', withContainer = true }: MarketTableProps) {
    const [sortBy, setSortBy] = useState<'symbol' | 'volume' | 'change' | 'price' | 'funding'>('volume')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

    const formatVolume = (value: number) => {
        const abs = Math.abs(value)
        if (abs >= 1_000_000_000) {
            return `${(value / 1_000_000_000).toFixed(2)}B`
        }
        if (abs >= 1_000_000) {
            return `${(value / 1_000_000).toFixed(2)}M`
        }
        if (abs >= 1_000) {
            return `${(value / 1_000).toFixed(2)}K`
        }
        return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
    }

    const formatSymbol = (symbol: string) => symbol.replace(/USDT$/i, '')

    const sortedData = [...data].sort((a, b) => {
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

    const tableContent = (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b">
                        <th className="text-left p-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSort('symbol')}
                                className="h-auto p-0 font-semibold"
                            >
                                Ticker
                                {sortBy === 'symbol' && (sortOrder === 'desc' ? ' ↓' : ' ↑')}
                            </Button>
                        </th>
                        <th className="text-right p-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSort('price')}
                                className="h-auto p-0 font-semibold"
                            >
                                Price
                                {sortBy === 'price' && (sortOrder === 'desc' ? ' ↓' : ' ↑')}
                            </Button>
                        </th>
                        <th className="text-right p-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSort('change')}
                                className="h-auto p-0 font-semibold"
                            >
                                Price Change
                                {sortBy === 'change' && (sortOrder === 'desc' ? ' ↓' : ' ↑')}
                            </Button>
                        </th>
                        <th className="text-right p-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSort('funding')}
                                className="h-auto p-0 font-semibold"
                            >
                                Funding Rate
                                {sortBy === 'funding' && (sortOrder === 'desc' ? ' ↓' : ' ↑')}
                            </Button>
                        </th>
                        <th className="text-right p-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSort('volume')}
                                className="h-auto p-0 font-semibold"
                            >
                                24h Volume
                                {sortBy === 'volume' && (sortOrder === 'desc' ? ' ↓' : ' ↑')}
                            </Button>
                        </th>
                        {userTier !== 'free' && (
                            <th className="text-right p-2">Open Interest</th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((item) => {
                        const fundingRate = item.fundingRate ?? 0
                        const exceedsThreshold = Math.abs(fundingRate) >= FUNDING_ALERT_THRESHOLD

                        const rowClasses = ['border-b', 'transition-colors']
                        if (fundingRate >= FUNDING_ALERT_THRESHOLD) {
                            rowClasses.push('bg-emerald-500/20', 'hover:bg-emerald-500/30')
                        } else if (fundingRate <= -FUNDING_ALERT_THRESHOLD) {
                            rowClasses.push('bg-red-500/20', 'hover:bg-red-500/30')
                        } else {
                            rowClasses.push('hover:bg-muted/50')
                        }

                        const fundingClass = exceedsThreshold
                            ? fundingRate > 0
                                ? 'text-emerald-500 font-semibold'
                                : 'text-red-500 font-semibold'
                            : 'text-foreground'

                        return (
                            <tr
                                key={item.symbol}
                                className={rowClasses.join(' ')}
                            >
                                <td className="p-2 font-mono text-sm">{formatSymbol(item.symbol)}</td>
                                <td className="p-2 text-right font-mono">
                                    ${item.price.toLocaleString()}
                                </td>
                                <td className="p-2 text-right font-mono">
                                    {(() => {
                                        const changeValue = item.change24h ?? item.volumeChange ?? 0;
                                        return (
                                            <span className="font-mono">
                                                {changeValue > 0 ? '+' : ''}{changeValue.toFixed(2)}%
                                            </span>
                                        );
                                    })()}
                                </td>
                                <td className="p-2 text-right font-mono">
                                    <span className={fundingClass}>
                                        {fundingRate > 0 ? '+' : ''}{(fundingRate * 100).toFixed(4)}%
                                    </span>
                                </td>
                                <td className="p-2 text-right font-mono">
                                    ${formatVolume(item.volume24h)}
                                </td>
                                {userTier !== 'free' && (
                                    <td className="p-2 text-right font-mono">
                                        ${(item.openInterest ?? 0).toLocaleString()}
                                    </td>
                                )}
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )

    if (!withContainer) {
        return tableContent
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Market Data</CardTitle>
                <CardDescription>
                    Real-time volume spikes and market movements
                </CardDescription>
            </CardHeader>
            <CardContent>{tableContent}</CardContent>
        </Card>
    )
}

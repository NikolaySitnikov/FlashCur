'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, Volume2 } from 'lucide-react'

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
                                Symbol
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
                                onClick={() => handleSort('volume')}
                                className="h-auto p-0 font-semibold"
                            >
                                <Volume2 className="h-4 w-4 mr-1" />
                                24h Volume
                                {sortBy === 'volume' && (sortOrder === 'desc' ? ' ↓' : ' ↑')}
                            </Button>
                        </th>
                        <th className="text-right p-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSort('change')}
                                className="h-auto p-0 font-semibold"
                            >
                                Volume Change
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
                        {userTier !== 'free' && (
                            <th className="text-right p-2">Open Interest</th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((item) => (
                        <tr
                            key={item.symbol}
                            className={[
                                'border-b hover:bg-muted/50 transition-colors',
                                (item.fundingRate ?? 0) >= 0.0003 ? 'bg-emerald-500/10 hover:bg-emerald-500/20' : '',
                                (item.fundingRate ?? 0) <= -0.0003 ? 'bg-red-500/10 hover:bg-red-500/20' : '',
                            ].join(' ').trim().replace(/\s+/g, ' ')}
                        >
                            <td className="p-2 font-mono text-sm">{formatSymbol(item.symbol)}</td>
                            <td className="p-2 text-right font-mono">
                                ${item.price.toLocaleString()}
                            </td>
                            <td className="p-2 text-right font-mono">
                                ${formatVolume(item.volume24h)}
                            </td>
                            <td className="p-2 text-right">
                                <div className="flex items-center justify-end">
                                    {(() => {
                                        const changeValue = item.change24h ?? item.volumeChange ?? 0;
                                        return (
                                            <>
                                                {changeValue > 0 ? (
                                                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                                                ) : (
                                                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                                                )}
                                                <span className={`font-mono ${changeValue > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {changeValue > 0 ? '+' : ''}{changeValue.toFixed(2)}%
                                                </span>
                                            </>
                                        );
                                    })()}
                                </div>
                            </td>
                            <td className="p-2 text-right font-mono">
                                <span className={(item.fundingRate ?? 0) > 0 ? 'text-green-500' : 'text-red-500'}>
                                    {(item.fundingRate ?? 0) > 0 ? '+' : ''}{((item.fundingRate ?? 0) * 100).toFixed(4)}%
                                </span>
                            </td>
                            {userTier !== 'free' && (
                                <td className="p-2 text-right font-mono">
                                    ${(item.openInterest ?? 0).toLocaleString()}
                                </td>
                            )}
                        </tr>
                    ))}
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

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, Volume2 } from 'lucide-react'
import { format } from 'date-fns'

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
}

export function MarketTable({ data, userTier = 'free' }: MarketTableProps) {
    const [sortBy, setSortBy] = useState<'symbol' | 'volume' | 'change' | 'price'>('volume')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

    // Format volume with B/M suffixes
    const formatVolume = (volume: number): string => {
        if (volume >= 1_000_000_000) {
            return `${(volume / 1_000_000_000).toFixed(2)}B`
        } else if (volume >= 1_000_000) {
            return `${(volume / 1_000_000).toFixed(2)}M`
        } else {
            return volume.toLocaleString()
        }
    }

    // Remove USDT suffix from symbol display
    const formatSymbol = (symbol: string): string => {
        return symbol.replace('USDT', '')
    }

    const sortedData = [...data].sort((a, b) => {
        let aValue: number | string, bValue: number | string

        switch (sortBy) {
            case 'symbol':
                aValue = a.symbol
                bValue = b.symbol
                break
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
            default:
                return 0
        }

        if (sortBy === 'symbol') {
            return sortOrder === 'asc' 
                ? (aValue as string).localeCompare(bValue as string)
                : (bValue as string).localeCompare(aValue as string)
        }

        return sortOrder === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number)
    })

    const handleSort = (column: 'symbol' | 'volume' | 'change' | 'price') => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
        } else {
            setSortBy(column)
            setSortOrder('desc')
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Live Market Data</CardTitle>
                <CardDescription>
                    Real-time volume spikes and market movements
                </CardDescription>
            </CardHeader>
            <CardContent>
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
                                <th className="text-right p-2">Funding Rate</th>
                                {userTier !== 'free' && (
                                    <th className="text-right p-2">Open Interest</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedData.map((item) => (
                                <tr key={item.symbol} className="border-b hover:bg-muted/50">
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
            </CardContent>
        </Card>
    )
}

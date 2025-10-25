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
    volumeChange: number
    fundingRate: number
    openInterest: number
    timestamp: number
}

interface MarketTableProps {
    data: MarketData[]
}

export function MarketTable({ data }: MarketTableProps) {
    const [sortBy, setSortBy] = useState<'volume' | 'change' | 'price'>('volume')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

    const sortedData = [...data].sort((a, b) => {
        let aValue: number, bValue: number

        switch (sortBy) {
            case 'volume':
                aValue = a.volume24h
                bValue = b.volume24h
                break
            case 'change':
                aValue = a.volumeChange
                bValue = b.volumeChange
                break
            case 'price':
                aValue = a.price
                bValue = b.price
                break
            default:
                return 0
        }

        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
    })

    const handleSort = (column: 'volume' | 'change' | 'price') => {
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
                                <th className="text-left p-2">Symbol</th>
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
                                <th className="text-right p-2">Open Interest</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedData.map((item) => (
                                <tr key={item.symbol} className="border-b hover:bg-muted/50">
                                    <td className="p-2 font-mono text-sm">{item.symbol}</td>
                                    <td className="p-2 text-right font-mono">
                                        ${item.price.toLocaleString()}
                                    </td>
                                    <td className="p-2 text-right font-mono">
                                        ${item.volume24h.toLocaleString()}
                                    </td>
                                    <td className="p-2 text-right">
                                        <div className="flex items-center justify-end">
                                            {item.volumeChange > 0 ? (
                                                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                                            ) : (
                                                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                                            )}
                                            <span className={`font-mono ${item.volumeChange > 0 ? 'text-green-500' : 'text-red-500'
                                                }`}>
                                                {item.volumeChange > 0 ? '+' : ''}{item.volumeChange.toFixed(2)}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-2 text-right font-mono">
                                        <span className={item.fundingRate > 0 ? 'text-green-500' : 'text-red-500'}>
                                            {item.fundingRate > 0 ? '+' : ''}{(item.fundingRate * 100).toFixed(4)}%
                                        </span>
                                    </td>
                                    <td className="p-2 text-right font-mono">
                                        ${item.openInterest.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}

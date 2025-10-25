'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/useWebSocket';
import { formatCompactUsd, formatPrice, formatPercentage } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ChevronUp, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';

interface MarketData {
    symbol: string;
    price: number;
    price_change: number;
    price_change_percent: number;
    volume: number;
    quote_volume: number;
    count: number;
    timestamp: string;
}

export function MarketDataTable() {
    const [sortField, setSortField] = useState<keyof MarketData>('quote_volume');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [filteredData, setFilteredData] = useState<MarketData[]>([]);

    const { isConnected, lastMessage } = useWebSocket();

    // Fetch initial data
    const { data: marketData, isLoading, error } = useQuery({
        queryKey: ['market-data'],
        queryFn: async () => {
            const response = await fetch('/api/dashboard/data', {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch market data');
            return response.json();
        },
        refetchInterval: 30000, // Refetch every 30 seconds
        staleTime: 10000, // Consider stale after 10 seconds
    });

    // Update data from WebSocket
    useEffect(() => {
        if (lastMessage?.type === 'market_data' && lastMessage.data) {
            setFilteredData(lastMessage.data);
        } else if (marketData?.data) {
            setFilteredData(marketData.data);
        }
    }, [lastMessage, marketData]);

    // Sort data
    useEffect(() => {
        if (filteredData.length === 0) return;

        const sorted = [...filteredData].sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];

            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortDirection === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }

            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            }

            return 0;
        });

        setFilteredData(sorted);
    }, [sortField, sortDirection]);

    const handleSort = (field: keyof MarketData) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const getSortIcon = (field: keyof MarketData) => {
        if (sortField !== field) return null;
        return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
    };

    if (isLoading) {
        return (
            <div className="card">
                <div className="flex items-center justify-center h-64">
                    <LoadingSpinner />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card">
                <div className="text-center py-8">
                    <p className="text-red-500 mb-4">Failed to load market data</p>
                    <Button onClick={() => window.location.reload()}>
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-white">Market Data</h2>
                    <p className="text-dark-400 text-sm">
                        {filteredData.length} assets • {isConnected ? 'Live' : 'Cached'} data
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-primary-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-dark-400">
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="table">
                    <thead>
                        <tr>
                            <th
                                className="cursor-pointer hover:text-primary-500 transition-colors"
                                onClick={() => handleSort('symbol')}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Symbol</span>
                                    {getSortIcon('symbol')}
                                </div>
                            </th>
                            <th
                                className="cursor-pointer hover:text-primary-500 transition-colors"
                                onClick={() => handleSort('price')}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Price</span>
                                    {getSortIcon('price')}
                                </div>
                            </th>
                            <th
                                className="cursor-pointer hover:text-primary-500 transition-colors"
                                onClick={() => handleSort('price_change_percent')}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>24h Change</span>
                                    {getSortIcon('price_change_percent')}
                                </div>
                            </th>
                            <th
                                className="cursor-pointer hover:text-primary-500 transition-colors"
                                onClick={() => handleSort('volume')}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Volume</span>
                                    {getSortIcon('volume')}
                                </div>
                            </th>
                            <th
                                className="cursor-pointer hover:text-primary-500 transition-colors"
                                onClick={() => handleSort('quote_volume')}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Quote Volume</span>
                                    {getSortIcon('quote_volume')}
                                </div>
                            </th>
                            <th>Trades</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((asset, index) => (
                            <tr key={asset.symbol} className="hover:bg-dark-750 transition-colors">
                                <td>
                                    <div className="flex items-center space-x-2">
                                        <span className="font-medium text-white">{asset.symbol}</span>
                                        {index < 10 && (
                                            <Badge variant="success" className="text-xs">
                                                Top {index + 1}
                                            </Badge>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <span className="font-mono text-white">
                                        {formatPrice(asset.price)}
                                    </span>
                                </td>
                                <td>
                                    <div className="flex items-center space-x-1">
                                        {asset.price_change_percent >= 0 ? (
                                            <TrendingUp className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <TrendingDown className="w-4 h-4 text-red-500" />
                                        )}
                                        <span className={`font-mono ${asset.price_change_percent >= 0 ? 'text-green-500' : 'text-red-500'
                                            }`}>
                                            {formatPercentage(asset.price_change_percent)}
                                        </span>
                                    </div>
                                </td>
                                <td>
                                    <span className="font-mono text-dark-300">
                                        {formatCompactUsd(asset.volume)}
                                    </span>
                                </td>
                                <td>
                                    <span className="font-mono text-white">
                                        {formatCompactUsd(asset.quote_volume)}
                                    </span>
                                </td>
                                <td>
                                    <span className="text-dark-300">
                                        {asset.count.toLocaleString()}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

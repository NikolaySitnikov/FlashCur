import { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { MarketDataTable } from '@/components/dashboard/MarketDataTable';
import { VolumeChart } from '@/components/dashboard/VolumeChart';
import { AlertPanel } from '@/components/dashboard/AlertPanel';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { WebSocketProvider } from '@/hooks/useWebSocket';

export default function DashboardPage() {
    return (
        <WebSocketProvider>
            <DashboardLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-white">Trading Dashboard</h1>
                            <p className="text-dark-400 mt-1">
                                Real-time Binance perpetual futures data
                            </p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-sm text-dark-400">
                                Last updated: <span className="text-primary-500">Just now</span>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Suspense fallback={<LoadingSpinner />}>
                            <VolumeChart />
                        </Suspense>
                        <Suspense fallback={<LoadingSpinner />}>
                            <AlertPanel />
                        </Suspense>
                    </div>

                    {/* Market Data Table */}
                    <Suspense fallback={<LoadingSpinner />}>
                        <MarketDataTable />
                    </Suspense>
                </div>
            </DashboardLayout>
        </WebSocketProvider>
    );
}

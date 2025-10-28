import { redirect } from 'next/navigation'
import { getServerAuthToken } from '@/lib/auth-server'
import { verifyAccessTokenAndRole } from '@/lib/auth-verify'
import DebugFetchLogger from '@/components/debug-fetch-logger'

export default async function DashboardPage() {
    const token = getServerAuthToken()
    const { ok, role } = await verifyAccessTokenAndRole(token)

    if (!ok) {
        redirect('/auth')
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
            <DebugFetchLogger />
            <div className="container mx-auto px-4 py-8">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-4">VolSpike Dashboard</h1>
                    <p className="text-gray-400">Welcome back! You're successfully logged in.</p>
                    <p className="text-sm text-gray-500 mt-2">Role: {role}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 backdrop-blur-sm">
                        <h2 className="text-xl font-semibold text-white mb-4">Market Data</h2>
                        <p className="text-gray-400">Real-time Binance perpetual futures data will appear here.</p>
                    </div>

                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 backdrop-blur-sm">
                        <h2 className="text-xl font-semibold text-white mb-4">Volume Alerts</h2>
                        <p className="text-gray-400">Configure your volume spike alerts and notifications.</p>
                    </div>

                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 backdrop-blur-sm">
                        <h2 className="text-xl font-semibold text-white mb-4">Account Settings</h2>
                        <p className="text-gray-400">Manage your subscription and account preferences.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

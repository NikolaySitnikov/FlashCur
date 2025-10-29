'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useUserIdentity } from '@/hooks/use-user-identity'
import { Copy, ExternalLink } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function SettingsPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const identity = useUserIdentity()

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth')
        }
    }, [status, router])

    if (status === 'loading' || identity.isLoading) {
        return (
            <div className="flex-1 bg-background">
                <Header />
                <main className="container mx-auto px-4 py-8">
                    <div className="text-center">Loading...</div>
                </main>
            </div>
        )
    }

    if (!session?.user) {
        return null
    }

    const handleCopy = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text)
            toast.success(`${label} copied`)
        } catch (err) {
            toast.error('Failed to copy')
        }
    }

    const getTierBadgeColor = () => {
        switch (identity.tier) {
            case 'pro': return 'bg-blue-500 text-white'
            case 'elite': return 'bg-amber-500 text-white'
            default: return 'bg-gray-500 text-white'
        }
    }

    return (
        <div className="flex-1 bg-background">
            <Header />
            <main className="container mx-auto px-4 py-8 max-w-4xl">
                <Card>
                    <CardHeader>
                        <CardTitle>Settings</CardTitle>
                        <CardDescription>Manage your account settings and preferences</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {/* Account Information */}
                            <div>
                                <h3 className="text-sm font-medium mb-4">Account Information</h3>
                                <div className="space-y-4">
                                    {/* Email */}
                                    {identity.email && (
                                        <div className="flex items-center justify-between py-2 border-b">
                                            <div className="flex-1">
                                                <p className="text-sm text-muted-foreground">Email</p>
                                                <p className="text-sm font-medium">{identity.email}</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleCopy(identity.email!, 'Email')}
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}

                                    {/* Wallet Address */}
                                    {identity.address && (
                                        <div className="flex items-center justify-between py-2 border-b">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-muted-foreground">Wallet Address</p>
                                                <p className="text-sm font-medium font-mono truncate">
                                                    {identity.ens || identity.address}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleCopy(identity.address!, 'Address')}
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}

                                    {/* Role */}
                                    <div className="flex items-center justify-between py-2 border-b">
                                        <div className="flex-1">
                                            <p className="text-sm text-muted-foreground">Role</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant={identity.role === 'ADMIN' ? 'destructive' : 'secondary'}>
                                                    {identity.role || 'USER'}
                                                </Badge>
                                                {identity.role === 'ADMIN' && (
                                                    <Link href="/admin">
                                                        <Button variant="link" size="sm" className="h-auto p-0">
                                                            Go to Admin Dashboard
                                                            <ExternalLink className="h-3 w-3 ml-1" />
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tier */}
                                    <div className="flex items-center justify-between py-2">
                                        <div className="flex-1">
                                            <p className="text-sm text-muted-foreground">Subscription Tier</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge className={`text-xs ${getTierBadgeColor()}`}>
                                                    {identity.tier ? identity.tier.charAt(0).toUpperCase() + identity.tier.slice(1) : 'Free'} Tier
                                                </Badge>
                                                {identity.tier !== 'elite' && (
                                                    <Link href="/upgrade">
                                                        <Button variant="link" size="sm" className="h-auto p-0">
                                                            Upgrade
                                                            <ExternalLink className="h-3 w-3 ml-1" />
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}


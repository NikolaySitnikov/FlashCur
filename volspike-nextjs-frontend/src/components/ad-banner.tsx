'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, ArrowRight, Zap, Mail, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface AdBannerProps {
    userTier?: string
    className?: string
}

const BANNER_DISMISSED_KEY = 'volspike_ad_banner_dismissed'
const BANNER_DISMISSED_TIMESTAMP = 'volspike_ad_banner_dismissed_timestamp'
// Banner reappears after 24 hours
const BANNER_REAPPEAR_DELAY = 24 * 60 * 60 * 1000

export function AdBanner({ userTier = 'free', className }: AdBannerProps) {
    const router = useRouter()
    const [isDismissed, setIsDismissed] = useState<boolean | null>(null) // null = checking, true = dismissed, false = visible
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
        // Check if banner was dismissed (only on client)
        if (typeof window === 'undefined') return

        const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY)
        const dismissedTimestamp = localStorage.getItem(BANNER_DISMISSED_TIMESTAMP)

        if (!dismissed) {
            setIsDismissed(false)
        } else if (dismissedTimestamp) {
            // Check if enough time has passed to show again
            const timestamp = parseInt(dismissedTimestamp, 10)
            const now = Date.now()
            if (now - timestamp > BANNER_REAPPEAR_DELAY) {
                // Enough time has passed, show banner again
                localStorage.removeItem(BANNER_DISMISSED_KEY)
                localStorage.removeItem(BANNER_DISMISSED_TIMESTAMP)
                setIsDismissed(false)
            } else {
                setIsDismissed(true)
            }
        } else {
            setIsDismissed(true)
        }
    }, [])

    const handleDismiss = () => {
        setIsDismissed(true)
        if (typeof window !== 'undefined') {
            localStorage.setItem(BANNER_DISMISSED_KEY, 'true')
            localStorage.setItem(BANNER_DISMISSED_TIMESTAMP, Date.now().toString())
        }
    }

    const handleUpgrade = () => {
        // Navigate to settings page where users can upgrade
        router.push('/settings')
    }

    // Only show for free tier users and if not dismissed
    // Wait for mount to avoid hydration mismatch
    if (!isMounted || userTier !== 'free' || isDismissed) {
        return null
    }

    return (
        <Card
            className={cn(
                'relative overflow-hidden border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20',
                'shadow-lg hover:shadow-xl transition-all duration-300',
                className
            )}
        >
            {/* Decorative background elements */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400 rounded-full blur-3xl" />
            </div>

            <CardContent className="relative p-4 md:p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-1">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                                <Sparkles className="h-6 w-6 text-white" />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Unlock Pro Features
                                </h3>
                                <Badge
                                    variant="secondary"
                                    className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-700"
                                >
                                    Upgrade Now
                                </Badge>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                Upgrade to <span className="font-semibold text-blue-600 dark:text-blue-400">Pro tier</span> and get:
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>5-minute updates</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    <span>Email alerts</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Zap className="h-3 w-3" />
                                    <span>All symbols</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pt-1">
                                <Button
                                    onClick={handleUpgrade}
                                    size="sm"
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                    Upgrade to Pro
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    $9/month
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Dismiss button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 h-8 w-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                        onClick={handleDismiss}
                        aria-label="Dismiss banner"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

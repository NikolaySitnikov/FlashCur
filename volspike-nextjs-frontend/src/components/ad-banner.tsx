'use client'

import { ArrowRight, Zap, Mail, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface AdBannerProps {
    userTier?: string
    className?: string
}

export function AdBanner({ userTier = 'free', className }: AdBannerProps) {
    const router = useRouter()

    // Only show for free tier users
    if (userTier !== 'free') {
        return null
    }

    const handleUpgrade = () => {
        router.push('/settings')
    }

    return (
        <Card
            className={cn(
                'relative overflow-hidden border-l-4 border-l-green-500 dark:border-l-green-400 shadow-md',
                'bg-card hover:shadow-lg transition-shadow duration-200',
                'before:absolute before:inset-0 before:bg-gradient-to-r before:from-green-500/5 before:via-green-500/3 before:to-transparent before:pointer-events-none dark:before:from-green-400/10 dark:before:via-green-400/5',
                className
            )}
        >
            <CardContent className="p-5 md:p-6">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                    <div className="flex items-start gap-4 flex-1">
                        {/* Icon - Lightning Bolt (Brand Icon) */}
                        <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-lg bg-green-500/10 dark:bg-green-400/20 flex items-center justify-center border border-green-500/20 dark:border-green-400/30">
                                <Zap className="h-6 w-6 text-green-600 dark:text-green-400 fill-green-600 dark:fill-green-400" />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-3 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="text-lg font-semibold text-foreground">
                                    Unlock Pro Features
                                </h3>
                                <Badge
                                    variant="outline"
                                    className="bg-white dark:bg-gray-900 text-green-600 dark:text-green-400 border-green-600/30 dark:border-green-400/30 font-semibold"
                                >
                                    $9/month
                                </Badge>
                            </div>

                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Get faster market updates, real-time email alerts, and access to all trading symbols with Pro tier.
                            </p>

                            <div className="flex flex-wrap items-center gap-4 pt-1">
                                <div className="flex items-center gap-2 text-sm text-foreground">
                                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-green-500/10 dark:bg-green-400/20">
                                        <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    </div>
                                    <span className="font-medium">5-minute updates</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-foreground">
                                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-green-500/10 dark:bg-green-400/20">
                                        <Mail className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    </div>
                                    <span className="font-medium">Email alerts</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-foreground">
                                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-green-500/10 dark:bg-green-400/20">
                                        <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    </div>
                                    <span className="font-medium">All symbols</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CTA Button */}
                    <div className="flex-shrink-0 w-full lg:w-auto">
                    <Button
                            onClick={handleUpgrade}
                            size="default"
                            className="w-full lg:w-auto min-w-[160px] font-semibold shadow-sm hover:shadow-md transition-all bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white"
                        >
                            Upgrade to Pro
                            <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

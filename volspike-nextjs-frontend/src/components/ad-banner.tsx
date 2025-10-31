'use client'

import { ArrowRight, Zap, Mail, Clock, Sparkles } from 'lucide-react'
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
                'relative overflow-hidden border-l-4 border-l-primary shadow-md',
                'bg-card hover:shadow-lg transition-shadow duration-200',
                'before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/5 before:via-primary/3 before:to-transparent before:pointer-events-none',
                className
            )}
        >
            <CardContent className="p-5 md:p-6">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                    <div className="flex items-start gap-4 flex-1">
                        {/* Icon */}
                        <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                                <Sparkles className="h-6 w-6 text-primary" />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-3 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="text-lg font-semibold text-foreground">
                                    Unlock Pro Features
                                </h3>
                                <Badge
                                    variant="default"
                                    className="bg-primary text-primary-foreground font-semibold"
                                >
                                    $9/month
                                </Badge>
                            </div>

                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Get faster market updates, real-time email alerts, and access to all trading symbols with Pro tier.
                            </p>

                            <div className="flex flex-wrap items-center gap-4 pt-1">
                                <div className="flex items-center gap-2 text-sm text-foreground">
                                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 dark:bg-primary/20">
                                        <Clock className="h-4 w-4 text-primary" />
                                    </div>
                                    <span className="font-medium">5-minute updates</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-foreground">
                                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 dark:bg-primary/20">
                                        <Mail className="h-4 w-4 text-primary" />
                                    </div>
                                    <span className="font-medium">Email alerts</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-foreground">
                                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 dark:bg-primary/20">
                                        <Zap className="h-4 w-4 text-primary" />
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
                            className="w-full lg:w-auto min-w-[160px] font-semibold shadow-sm hover:shadow-md transition-all"
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

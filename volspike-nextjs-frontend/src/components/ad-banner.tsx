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
        <Card className={cn('border-primary/20 bg-muted/50', className)}>
            <CardContent className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-semibold text-foreground">
                                Upgrade to Pro Tier
                            </h3>
                            <Badge variant="secondary" className="text-xs">
                                $9/month
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Get faster updates, email alerts, and access to all trading symbols.
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-primary" />
                                <span>5-minute refresh rate</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 text-primary" />
                                <span>Email alerts</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Zap className="h-3.5 w-3.5 text-primary" />
                                <span>All trading symbols</span>
                            </div>
                        </div>
                    </div>
                    <Button
                        onClick={handleUpgrade}
                        size="sm"
                        className="w-full sm:w-auto shrink-0"
                    >
                        Upgrade to Pro
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

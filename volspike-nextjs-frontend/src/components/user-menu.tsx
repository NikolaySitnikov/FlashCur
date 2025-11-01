'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useUserIdentity } from '@/hooks/use-user-identity'
import { useTheme } from 'next-themes'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuPortal,
} from '@/components/ui/dropdown-menu'
import { 
    Settings, 
    LogOut, 
    Copy, 
    CreditCard, 
    Wallet, 
    Bell,
    Star,
    Zap,
    Moon,
    Sun,
    Monitor,
    TrendingUp,
    FileText,
    Key,
    Sparkles,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

export function UserMenu() {
    const router = useRouter()
    const identity = useUserIdentity()
    const { theme, setTheme } = useTheme()
    const [isOpen, setIsOpen] = useState(false)

    const handleCopy = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text)
            toast.success(`${label} copied`)
        } catch (err) {
            toast.error('Failed to copy')
        }
    }

    const getInitials = () => {
        let initials = 'U'
        try {
            if (identity.email) {
                const parts = identity.email.split('@')
                if (parts.length === 2 && parts[0].length > 0 && parts[1].length > 0) {
                    initials = (parts[0][0] + parts[1][0]).toUpperCase()
                } else {
                    initials = identity.email.slice(0, 2).toUpperCase()
                }
            } else if (identity.displayName) {
                const words = identity.displayName.split(' ')
                if (words.length >= 2 && words[0].length > 0 && words[1].length > 0) {
                    initials = (words[0][0] + words[1][0]).toUpperCase()
                } else {
                    initials = identity.displayName.slice(0, 2).toUpperCase()
                }
            }
        } catch (error) {
            console.error('[UserMenu] Error getting initials:', error)
            initials = 'U'
        }
        return initials
    }

    if (identity.isLoading) {
        return (
            <Button variant="outline" size="sm" disabled className="h-9 w-9 rounded-full p-0">
                <div className="h-4 w-4 animate-pulse rounded bg-muted" />
            </Button>
        )
    }

    const initials = getInitials()
    const tier = identity.tier || 'free'

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-full p-0 flex items-center justify-center hover:bg-accent focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 transition-all duration-150"
                    aria-label="User menu"
                >
                    <div className="h-9 w-9 rounded-full p-[2px] bg-gradient-to-br from-brand-400/30 via-brand-500/40 to-brand-600/30 animate-pulse-glow">
                        <div className="h-full w-full rounded-full overflow-hidden flex items-center justify-center bg-brand-500 text-white shadow-brand">
                            {identity.image ? (
                                <div className="relative h-full w-full">
                                    <Image
                                        src={identity.image}
                                        alt={identity.displayName}
                                        fill
                                        sizes="36px"
                                        className="object-cover"
                                        priority
                                    />
                                </div>
                            ) : (
                                <span className="text-[11px] font-bold leading-none select-none">
                                    {initials}
                                </span>
                            )}
                        </div>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
                align="end" 
                className="w-[280px] p-0 backdrop-blur-lg bg-popover/95 border-border/50 shadow-lg-dark dark:shadow-lg-dark animate-scale-in rounded-xl"
            >
                {/* User Info Section with Glassmorphism */}
                <DropdownMenuLabel className="p-4 border-b border-border/50 bg-gradient-to-br from-brand-500/5 to-sec-500/5">
                    <div className="flex flex-col space-y-3">
                        <div className="flex items-center gap-3">
                            {/* Avatar with glow */}
                            <div className="h-10 w-10 rounded-full p-[2px] bg-gradient-to-br from-brand-400/40 via-brand-500/50 to-brand-600/40 shadow-brand">
                                <div className="h-full w-full rounded-full overflow-hidden flex items-center justify-center bg-brand-500 text-white">
                                    {identity.image ? (
                                        <div className="relative h-full w-full">
                                            <Image
                                                src={identity.image}
                                                alt={identity.displayName}
                                                fill
                                                sizes="40px"
                                                className="object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <span className="text-sm font-bold leading-none select-none">
                                            {initials}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                {(() => {
                                    const cuidLike = (s: string) => /^c[a-z0-9]{20,}$/i.test(s)
                                    const shortAddr = identity.address ? `${identity.address.slice(0, 6)}...${identity.address.slice(-4)}` : null
                                    const primaryCandidate = shortAddr || identity.email || identity.displayName || 'User'
                                    const primary = cuidLike(primaryCandidate) ? (shortAddr || identity.email || 'User') : primaryCandidate
                                    const secondary = identity.email && identity.email !== primary ? identity.email : null
                                    return (
                                        <>
                                            <p className="text-sm font-semibold truncate text-foreground">{primary}</p>
                                            {secondary ? (
                                                <p className="text-xs text-muted-foreground truncate">{secondary}</p>
                                            ) : null}
                                        </>
                                    )
                                })()}
                            </div>
                        </div>
                        
                        {/* Tier Badge with icon */}
                        <div className="flex items-center justify-between">
                            <Badge
                                variant="default"
                                className={`text-xs font-semibold px-2.5 py-1 transition-all duration-150 ${
                                    tier === 'pro'
                                        ? 'bg-sec-600 dark:bg-sec-500 text-white border-0 shadow-sec'
                                        : tier === 'elite'
                                            ? 'bg-elite-600 dark:bg-elite-500 text-white border-0 shadow-sm'
                                            : 'bg-gray-600 dark:bg-gray-500 text-white border-0'
                                }`}
                            >
                                {tier === 'free' && <Zap className="h-3 w-3 mr-1 inline" />}
                                {tier === 'pro' && <Star className="h-3 w-3 mr-1 inline" />}
                                {tier === 'elite' && <Sparkles className="h-3 w-3 mr-1 inline" />}
                                {tier.charAt(0).toUpperCase() + tier.slice(1)} Tier
                            </Badge>
                            {identity.role === 'ADMIN' && (
                                <Badge variant="outline" className="text-xs border-danger-500/50 text-danger-600 dark:text-danger-400 dark:border-danger-400/50">
                                    Admin
                                </Badge>
                            )}
                        </div>

                        {/* Wallet address if available */}
                        {identity.address && (
                            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50 border border-border/50">
                                <Wallet className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs font-mono text-muted-foreground font-mono-tabular">
                                    {identity.address.slice(0, 6)}...{identity.address.slice(-4)}
                                </span>
                            </div>
                        )}
                    </div>
                </DropdownMenuLabel>

                {/* Quick Actions Section */}
                <div className="py-1">
                    <DropdownMenuItem 
                        onClick={() => {
                            router.push('/settings')
                            setIsOpen(false)
                        }}
                        className="mx-2 my-0.5 rounded-lg transition-all duration-150 hover:bg-muted/80 focus:bg-muted"
                    >
                        <Settings className="h-4 w-4 mr-2.5 text-muted-foreground" />
                        <span className="flex-1">Settings</span>
                    </DropdownMenuItem>

                    {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && (
                        <DropdownMenuItem 
                            onClick={() => {
                                router.push('/settings/billing')
                                setIsOpen(false)
                            }}
                            className="mx-2 my-0.5 rounded-lg transition-all duration-150 hover:bg-muted/80 focus:bg-muted"
                        >
                            <CreditCard className="h-4 w-4 mr-2.5 text-muted-foreground" />
                            <span className="flex-1">Billing & Subscription</span>
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuItem 
                        onClick={() => {
                            router.push('/alerts')
                            setIsOpen(false)
                        }}
                        className="mx-2 my-0.5 rounded-lg transition-all duration-150 hover:bg-muted/80 focus:bg-muted"
                    >
                        <Bell className="h-4 w-4 mr-2.5 text-muted-foreground" />
                        <span className="flex-1">Email Alerts</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem 
                        onClick={() => {
                            router.push('/watchlist')
                            setIsOpen(false)
                        }}
                        className="mx-2 my-0.5 rounded-lg transition-all duration-150 hover:bg-muted/80 focus:bg-muted"
                    >
                        <TrendingUp className="h-4 w-4 mr-2.5 text-muted-foreground" />
                        <span className="flex-1">Watchlist</span>
                    </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator className="my-1" />

                {/* Theme Toggle Sub-menu */}
                <div className="py-1">
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="mx-2 my-0.5 rounded-lg transition-all duration-150 hover:bg-muted/80 focus:bg-muted">
                            {theme === 'light' && <Sun className="h-4 w-4 mr-2.5 text-muted-foreground" />}
                            {theme === 'dark' && <Moon className="h-4 w-4 mr-2.5 text-muted-foreground" />}
                            {theme === 'system' && <Monitor className="h-4 w-4 mr-2.5 text-muted-foreground" />}
                            <span className="flex-1">Theme</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuSubContent className="backdrop-blur-lg bg-popover/95 border-border/50 rounded-lg">
                                <DropdownMenuItem 
                                    onClick={() => setTheme('light')}
                                    className="rounded-md"
                                >
                                    <Sun className="h-4 w-4 mr-2.5" />
                                    <span>Light</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => setTheme('dark')}
                                    className="rounded-md"
                                >
                                    <Moon className="h-4 w-4 mr-2.5" />
                                    <span>Dark</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => setTheme('system')}
                                    className="rounded-md"
                                >
                                    <Monitor className="h-4 w-4 mr-2.5" />
                                    <span>System</span>
                                </DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                </div>

                <DropdownMenuSeparator className="my-1" />

                {/* Copy Actions */}
                <div className="py-1">
                    {identity.email && (
                        <DropdownMenuItem 
                            onClick={() => handleCopy(identity.email!, 'Email')}
                            className="mx-2 my-0.5 rounded-lg transition-all duration-150 hover:bg-muted/80 focus:bg-muted"
                        >
                            <Copy className="h-4 w-4 mr-2.5 text-muted-foreground" />
                            <span className="flex-1">Copy email</span>
                        </DropdownMenuItem>
                    )}
                    {identity.address && (
                        <DropdownMenuItem 
                            onClick={() => handleCopy(identity.address!, 'Address')}
                            className="mx-2 my-0.5 rounded-lg transition-all duration-150 hover:bg-muted/80 focus:bg-muted"
                        >
                            <Wallet className="h-4 w-4 mr-2.5 text-muted-foreground" />
                            <span className="flex-1">Copy address</span>
                        </DropdownMenuItem>
                    )}
                </div>

                {/* Upgrade CTA for Free Tier */}
                {tier === 'free' && (
                    <>
                        <DropdownMenuSeparator className="my-1" />
                        <div className="p-2">
                            <Button
                                onClick={() => {
                                    router.push('/settings')
                                    setIsOpen(false)
                                }}
                                size="sm"
                                className="w-full bg-gradient-to-r from-brand-600 to-sec-600 hover:from-brand-700 hover:to-sec-700 text-white shadow-brand transition-all duration-200"
                            >
                                <Sparkles className="h-4 w-4 mr-2" />
                                Upgrade to Pro
                            </Button>
                        </div>
                    </>
                )}

                <DropdownMenuSeparator className="my-1" />

                {/* Sign Out */}
                <div className="p-2">
                    <DropdownMenuItem
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="rounded-lg text-danger-600 dark:text-danger-400 focus:text-danger-600 dark:focus:text-danger-400 focus:bg-danger-500/10 transition-all duration-150"
                    >
                        <LogOut className="h-4 w-4 mr-2.5" />
                        <span className="flex-1 font-medium">Sign Out</span>
                    </DropdownMenuItem>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

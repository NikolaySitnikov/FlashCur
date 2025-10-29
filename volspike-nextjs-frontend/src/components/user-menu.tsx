'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useUserIdentity } from '@/hooks/use-user-identity'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Settings, LogOut, Copy, CreditCard, Wallet } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

export function UserMenu() {
    const router = useRouter()
    const identity = useUserIdentity()
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
                // Get first letter of email and first letter after @
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

            // Debug logging
            if (process.env.NODE_ENV === 'development') {
                console.log('[UserMenu] Identity:', {
                    email: identity.email,
                    displayName: identity.displayName,
                    initials,
                })
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

    // Debug: Log what we're rendering
    if (process.env.NODE_ENV === 'development') {
        console.log('[UserMenu] Rendering avatar:', {
            initials,
            email: identity.email,
            displayName: identity.displayName,
        })
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-full p-0 flex items-center justify-center hover:bg-accent focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-200"
                    aria-label="User menu"
                >
                    <div className="h-9 w-9 rounded-full p-[2px] bg-gradient-to-br from-primary/20 via-primary/50 to-primary/20">
                        <div className="h-full w-full rounded-full overflow-hidden flex items-center justify-center bg-primary text-primary-foreground shadow-sm">
                            {identity.image ? (
                                <img
                                    src={identity.image}
                                    alt={identity.displayName}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <span className="text-[11px] font-bold leading-none select-none">
                                    {initials}
                                </span>
                            )}
                        </div>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                    <div className="flex flex-col space-y-2">
                        <div className="flex items-center gap-2">
                            {/* Consistent avatar rendering inside menu */}
                            <div className="h-8 w-8 rounded-full p-[2px] bg-gradient-to-br from-primary/20 via-primary/50 to-primary/20">
                                <div className="h-full w-full rounded-full overflow-hidden flex items-center justify-center bg-primary text-primary-foreground">
                                    {identity.image ? (
                                        <img
                                            src={identity.image}
                                            alt={identity.displayName}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-[10px] font-bold leading-none select-none">
                                            {initials}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                {(() => {
                                    const primary = identity.displayName || identity.email || 'User'
                                    const secondary = identity.email && identity.email !== primary ? identity.email : null
                                    return (
                                        <>
                                            <p className="text-sm font-medium truncate">{primary}</p>
                                            {secondary ? (
                                                <p className="text-xs text-muted-foreground truncate">{secondary}</p>
                                            ) : null}
                                        </>
                                    )
                                })()}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {identity.tier && (
                                <Badge
                                    variant="secondary"
                                    className={`text-xs ${identity.tier === 'pro'
                                        ? 'bg-blue-500 text-white'
                                        : identity.tier === 'elite'
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-gray-500 text-white'
                                        }`}
                                >
                                    {identity.tier.charAt(0).toUpperCase() + identity.tier.slice(1)} Tier
                                </Badge>
                            )}
                            {identity.role === 'ADMIN' && (
                                <Badge variant="outline" className="text-xs border-red-500 text-red-500">
                                    Admin
                                </Badge>
                            )}
                        </div>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                    router.push('/settings')
                    setIsOpen(false)
                }}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                </DropdownMenuItem>
                {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && (
                    <DropdownMenuItem onClick={() => {
                        router.push('/settings/billing')
                        setIsOpen(false)
                    }}>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Billing
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {identity.email && (
                    <DropdownMenuItem onClick={() => handleCopy(identity.email!, 'Email')}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy email
                    </DropdownMenuItem>
                )}
                {identity.address && (
                    <DropdownMenuItem onClick={() => handleCopy(identity.address!, 'Address')}>
                        <Wallet className="h-4 w-4 mr-2" />
                        Copy address
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="text-red-600 focus:text-red-600"
                >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}


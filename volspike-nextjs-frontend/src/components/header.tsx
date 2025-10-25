'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { Bell, Settings, User } from 'lucide-react'

export function Header() {
    const { data: session, status } = useSession()

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
                <div className="flex items-center space-x-4">
                    <h1 className="text-2xl font-bold">VolSpike</h1>
                    <span className="text-sm text-muted-foreground">Binance Perps Guru</span>
                </div>

                <div className="flex items-center space-x-4">
                    <ThemeToggle />

                    {status === 'loading' ? (
                        <div className="h-8 w-8 animate-pulse rounded bg-muted" />
                    ) : session ? (
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-muted-foreground">
                                {session.user?.tier || 'free'} tier
                            </span>
                            <Button variant="outline" size="sm">
                                <Bell className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                                <Settings className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => signOut()}>
                                <User className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center space-x-2">
                            <ConnectButton />
                            <Button onClick={() => signIn()}>
                                Sign In
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}

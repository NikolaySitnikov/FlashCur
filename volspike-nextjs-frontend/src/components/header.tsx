'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { Settings, User } from 'lucide-react'

export function Header() {
    const { data: session, status } = useSession()

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between gap-3">
                <Link href="/" className="flex items-center gap-3 min-w-0">
                    <Image
                        src="/volspike-logo.svg"
                        alt="VolSpike logo"
                        width={36}
                        height={36}
                        priority
                        className="h-9 w-9"
                    />
                    <span className="truncate text-xl font-bold tracking-tight sm:text-2xl">VolSpike</span>
                </Link>

                <div className="ml-auto flex items-center gap-2 sm:gap-3">
                    <ThemeToggle />

                    {status === 'loading' ? (
                        <div className="h-8 w-8 animate-pulse rounded bg-muted" />
                    ) : session ? (
                        <div className="flex items-center gap-2 sm:gap-3">
                            <span className="hidden text-sm text-muted-foreground sm:inline">
                                {session.user?.tier || 'free'} tier
                            </span>
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

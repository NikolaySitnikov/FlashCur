'use client'

import Image from 'next/image'
import Link from 'next/link'

const primaryLinks = [
    { href: '/pricing', label: 'Pricing' },
    { href: '/docs', label: 'Docs' },
    { href: '/support', label: 'Support' },
]

const secondaryLinks = [
    { href: '/legal/privacy', label: 'Privacy' },
    { href: '/legal/terms', label: 'Terms' },
    { href: '/status', label: 'Status' },
]

export function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="border-t border-border/60 bg-background/80 backdrop-blur">
            <div className="container mx-auto px-4 py-10">
                <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex flex-col gap-4 max-w-sm">
                        <Link href="/" className="flex items-center gap-3">
                            <Image
                                src="/volspike-logo.svg"
                                alt="VolSpike logo"
                                width={40}
                                height={40}
                                className="h-10 w-10"
                            />
                            <span className="text-xl font-semibold tracking-tight">VolSpike</span>
                        </Link>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Precision tools for Binance perpetual futures traders. Monitor real-time volume
                            spikes, unlock advanced funding analytics, and stay a step ahead of the market.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-8 text-sm sm:grid-cols-2 lg:flex lg:items-start lg:gap-14">
                        <div className="min-w-[140px]">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Platform
                            </h3>
                            <ul className="mt-3 space-y-2 text-foreground/80">
                                {primaryLinks.map((link) => (
                                    <li key={link.href}>
                                        <Link href={link.href} className="transition-colors hover:text-foreground">
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="min-w-[140px]">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Company
                            </h3>
                            <ul className="mt-3 space-y-2 text-foreground/80">
                                {secondaryLinks.map((link) => (
                                    <li key={link.href}>
                                        <Link href={link.href} className="transition-colors hover:text-foreground">
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="mt-10 flex flex-col gap-2 border-t border-border/50 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <span>© {currentYear} VolSpike Labs. All rights reserved.</span>
                    <span className="text-foreground/60">
                        Crafted for high-volatility markets
                    </span>
                </div>
            </div>
        </footer>
    )
}

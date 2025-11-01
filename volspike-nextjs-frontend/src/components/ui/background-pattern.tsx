'use client'

import { useEffect, useState } from 'react'

export function BackgroundPattern() {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
        setPrefersReducedMotion(mediaQuery.matches)

        const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
        mediaQuery.addEventListener('change', handler)
        return () => mediaQuery.removeEventListener('change', handler)
    }, [])

    if (prefersReducedMotion) {
        return null
    }

    return (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            {/* Dot grid pattern */}
            <div 
                className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
                style={{
                    backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                }}
            />

            {/* Subtle radial glows near top */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-3xl animate-pulse-glow" />
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-sec-500/5 dark:bg-sec-500/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
        </div>
    )
}


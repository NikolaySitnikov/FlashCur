'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ConnectButton } from '@rainbow-me/rainbowkit'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface LoginPageProps {
    initialMode?: 'signin' | 'signup'
}

export function LoginPage({ initialMode }: LoginPageProps) {
    const [mode, setMode] = useState<'signin' | 'signup'>(initialMode || 'signin')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [rememberMe, setRememberMe] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')
        setSuccess('')

        try {
            if (mode === 'signup') {
                const signupResponse = await fetch(`${API_URL}/api/auth/signup`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password, tier: 'free' }),
                })

                if (!signupResponse.ok) {
                    const payload = await signupResponse.json().catch(() => ({}))
                    throw new Error(payload?.error || 'Failed to create account')
                }

                setSuccess('Account created! Logging you in...')
            }

            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            })

            if (result?.error || !result?.ok) {
                throw new Error('Invalid email or password. Please try again.')
            }

            router.push('/')
        } catch (err) {
            console.error('Authentication error:', err)
            setError(err instanceof Error ? err.message : 'An error occurred during authentication.')
        } finally {
            setIsLoading(false)
        }
    }

    const actionLabel = mode === 'signup' ? 'Create account' : 'Sign in'

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo and Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">VolSpike</h1>
                    <p className="text-gray-400">Professional cryptocurrency market analysis and volume alerts</p>
                </div>

                {/* Login Card */}
                <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                    <CardHeader className="space-y-4">
                        {/* Only show tabs if we're on the root page (no initialMode means both tabs visible) */}
                        {!initialMode && (
                        <div className="flex justify-center space-x-2 text-sm" role="tablist" aria-label="Authentication mode">
                            <button
                                type="button"
                                className={`flex-1 rounded-full border px-4 py-2 transition-all ${mode === 'signin'
                                    ? 'border-green-500 bg-green-500/10 text-green-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                                    : 'border-gray-700 bg-gray-800/80 text-gray-300 hover:border-gray-600'}`}
                                onClick={() => setMode('signin')}
                                aria-selected={mode === 'signin'}
                            >
                                Email Login
                            </button>
                            <button
                                type="button"
                                className={`flex-1 rounded-full border px-4 py-2 transition-all ${mode === 'signup'
                                    ? 'border-green-500 bg-green-500/10 text-green-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                                    : 'border-gray-700 bg-gray-800/80 text-gray-300 hover:border-gray-600'}`}
                                onClick={() => setMode('signup')}
                                aria-selected={mode === 'signup'}
                            >
                                Create Account
                            </button>
                        </div>
                        )}
                        <div className="space-y-1 text-center">
                            <CardTitle className="text-2xl text-white">
                                {mode === 'signin' ? 'Welcome back' : 'Create your account'}
                            </CardTitle>
                            <CardDescription className="text-gray-400">
                                {mode === 'signin'
                                    ? 'Sign in to access real-time volume spike alerts'
                                    : 'Start tracking Binance perp markets in seconds'}
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Email/Password Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-gray-300">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-gray-300">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder={mode === 'signup' ? 'Create a secure password' : 'Enter your password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 pr-10"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                                    >
                                        {showPassword ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="remember"
                                    checked={rememberMe}
                                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                                />
                                <Label htmlFor="remember" className="text-gray-300 text-sm">
                                    Remember me for 30 days
                                </Label>
                            </div>

                            {error && (
                                <div className="rounded-md bg-red-500/10 border border-red-500 px-3 py-2 text-sm text-red-400">
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="rounded-md bg-green-500/10 border border-green-500 px-3 py-2 text-sm text-green-400">
                                    {success}
                                </div>
                            )}
                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-green-500 via-emerald-400 to-green-500 text-white shadow-[0_20px_60px_rgba(16,185,129,0.35)] hover:brightness-105"
                                disabled={isLoading}
                            >
                                {isLoading ? `${actionLabel}...` : actionLabel}
                            </Button>
                        </form>

                        {/* Divider */}
                        <div className="flex items-center space-x-4">
                            <div className="flex-1 h-px bg-gray-700" />
                            <span className="bg-gray-800 px-2 text-gray-400">or</span>
                            <div className="flex-1 h-px bg-gray-700" />
                        </div>

                        {/* Wallet Connection */}
                        <div className="space-y-3">
                            <ConnectButton.Custom>
                                {({
                                    account,
                                    chain,
                                    openAccountModal,
                                    openChainModal,
                                    openConnectModal,
                                    authenticationStatus,
                                    mounted,
                                }) => {
                                    const ready = mounted && authenticationStatus !== 'loading'
                                    const connected =
                                        ready &&
                                        account &&
                                        chain &&
                                        (!authenticationStatus ||
                                            authenticationStatus === 'authenticated')

                                    return (
                                        <div
                                            {...(!ready && {
                                                'aria-hidden': true,
                                                style: {
                                                    opacity: 0,
                                                    pointerEvents: 'none',
                                                    userSelect: 'none',
                                                },
                                            })}
                                        >
                                            {(() => {
                                                if (!connected) {
                                                    return (
                                                        <Button
                                                            onClick={openConnectModal}
                                                            className="w-full border border-green-400/60 bg-transparent text-green-300 hover:bg-green-500/15"
                                                        >
                                                            Connect Wallet
                                                        </Button>
                                                    )
                                                }

                                                if (chain.unsupported) {
                                                    return (
                                                        <Button
                                                            onClick={openChainModal}
                                                            className="w-full bg-red-500 hover:bg-red-600 text-white"
                                                        >
                                                            Wrong network
                                                        </Button>
                                                    )
                                                }

                                                return (
                                                    <div className="flex space-x-2">
                                                        <Button
                                                            onClick={openChainModal}
                                                            className="flex-1 bg-purple-500 hover:bg-purple-600 text-white"
                                                        >
                                                            {chain.hasIcon && (
                                                                <div
                                                                    style={{
                                                                        background: chain.iconBackground,
                                                                        width: 12,
                                                                        height: 12,
                                                                        borderRadius: 999,
                                                                        overflow: 'hidden',
                                                                        marginRight: 4,
                                                                    }}
                                                                >
                                                                    {chain.iconUrl && (
                                                                        <img
                                                                            alt={chain.name ?? 'Chain icon'}
                                                                            src={chain.iconUrl}
                                                                            style={{ width: 12, height: 12 }}
                                                                        />
                                                                    )}
                                                                </div>
                                                            )}
                                                            {chain.name}
                                                        </Button>
                                                        <Button
                                                            onClick={openAccountModal}
                                                            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
                                                        >
                                                            {account.displayName}
                                                            {account.displayBalance
                                                                ? ` (${account.displayBalance})`
                                                                : ''}
                                                        </Button>
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    )
                                }}
                            </ConnectButton.Custom>
                        </div>

                        {/* Mode helper */}
                        <div className="text-center">
                            <p className="text-gray-400 text-sm">
                                {mode === 'signin' ? 'Need an account?' : 'Already registered?'}{' '}
                                <button
                                    type="button"
                                    className="text-green-400 hover:text-green-300 font-semibold"
                                    onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                                >
                                    {mode === 'signin' ? 'Create one for free' : 'Sign in instead'}
                                </button>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

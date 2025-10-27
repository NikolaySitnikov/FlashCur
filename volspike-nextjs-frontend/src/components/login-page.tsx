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

export function LoginPage() {
    const [mode, setMode] = useState<'signin' | 'signup'>('signin')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [rememberMe, setRememberMe] = useState(false)
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
                        <div className="flex justify-center space-x-2" role="tablist" aria-label="Authentication mode">
                            <Button
                                type="button"
                                variant={mode === 'signin' ? 'default' : 'secondary'}
                                className={`flex-1 ${mode === 'signin' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
                                onClick={() => setMode('signin')}
                                aria-selected={mode === 'signin'}
                            >
                                Sign in
                            </Button>
                            <Button
                                type="button"
                                variant={mode === 'signup' ? 'default' : 'secondary'}
                                className={`flex-1 ${mode === 'signup' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
                                onClick={() => setMode('signup')}
                                aria-selected={mode === 'signup'}
                            >
                                Create account
                            </Button>
                        </div>
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
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder={mode === 'signup' ? 'Create a secure password' : 'Enter your password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                                    required
                                />
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
                                className="w-full bg-green-500 hover:bg-green-600 text-white"
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
                                                            className="w-full bg-green-500 hover:bg-green-600 text-white"
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
                                    className="text-green-500 hover:text-green-400 font-medium"
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

'use client'

import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Loader2, Mail } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const signupSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string()
        .min(12, 'Must be at least 12 characters')
        .regex(/[A-Z]/, 'Must contain an uppercase letter')
        .regex(/[0-9]/, 'Must contain a number')
        .regex(/[^A-Za-z0-9]/, 'Must contain a symbol'),
    remember: z.boolean().optional(),
})

const signinSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
    remember: z.boolean().optional(),
})

type SignupForm = z.infer<typeof signupSchema>
type SigninForm = z.infer<typeof signinSchema>

function passwordStrength(pw: string): number {
    let score = 0
    if (pw.length >= 12) score++
    if (/[A-Z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    return score
}

export default function AuthPage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const signupForm = useForm<SignupForm>({
        resolver: zodResolver(signupSchema),
        defaultValues: { email: '', password: '', remember: true },
        mode: 'onChange',
    })

    const signinForm = useForm<SigninForm>({
        resolver: zodResolver(signinSchema),
        defaultValues: { email: '', password: '', remember: true },
    })

    const signupPasswordValue = signupForm.watch('password')
    const pwStrength = passwordStrength(signupPasswordValue || '')

    const [tab, setTab] = useState<'signin' | 'signup'>(
        searchParams?.get('tab') === 'signup' ? 'signup' : 'signin'
    )
    const [showPassword, setShowPassword] = useState(false)
    const [isAuthLoading, setIsAuthLoading] = useState(false)
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)
    const [isResending, setIsResending] = useState(false)
    const [authError, setAuthError] = useState('')
    const [verificationMessage, setVerificationMessage] = useState('')
    const [showVerificationAlert, setShowVerificationAlert] = useState(false)

    useEffect(() => {
        const tabParam = searchParams.get('tab')
        if (tabParam === 'signin' || tabParam === 'signup') {
            setTab(tabParam)
        }
    }, [searchParams])

    useEffect(() => {
        setAuthError('')
        signinForm.clearErrors()
        signupForm.clearErrors()
    }, [tab, signinForm, signupForm])

    async function handleSignin(data: SigninForm) {
        setIsAuthLoading(true)
        setAuthError('')

        try {
            const result = await signIn('credentials', {
                email: data.email,
                password: data.password,
                redirect: false,
            })

            if (result?.ok) {
                router.push('/')
            } else {
                const message = 'Invalid email or password. Please try again.'
                setAuthError(message)
                signinForm.setError('password', { message })
            }
        } catch (error) {
            const message = 'An error occurred during sign in. Please try again.'
            setAuthError(message)
            signinForm.setError('password', { message })
        } finally {
            setIsAuthLoading(false)
        }
    }

    async function handleSignup(data: SignupForm) {
        setIsAuthLoading(true)
        setAuthError('')
        setVerificationMessage('')
        setShowVerificationAlert(false)

        try {
            const response = await fetch(`${API_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: data.email, password: data.password, tier: 'free' }),
            })

            const payload = await response.json().catch(() => ({}))

            if (!response.ok) {
                const message = payload?.error || 'Could not create account'
                signupForm.setError('password', { message })
                setAuthError(message)
                return
            }

            if (payload?.requiresVerification) {
                const message = payload.message || 'Please check your email to verify your account.'
                setVerificationMessage(message)
                setShowVerificationAlert(true)
                signupForm.reset()
                setTab('signin')
                return
            }

            const signinResult = await signIn('credentials', {
                email: data.email,
                password: data.password,
                redirect: false,
            })

            if (signinResult?.ok) {
                router.push('/')
            } else {
                const message = 'Account created. Please verify your email, then sign in.'
                setVerificationMessage(message)
                setShowVerificationAlert(true)
            }
        } catch (error) {
            const message = 'Network error. Please try again.'
            signupForm.setError('password', { message })
            setAuthError(message)
        } finally {
            setIsAuthLoading(false)
        }
    }

    async function handleGoogleSignIn() {
        setIsGoogleLoading(true)
        setAuthError('')

        try {
            await signIn('google', { callbackUrl: '/' })
        } catch (error) {
            setAuthError('Google sign in failed. Please try again.')
            setIsGoogleLoading(false)
        }
    }

    async function resendVerification() {
        const email = signupForm.getValues('email') || signinForm.getValues('email')
        if (!email) return

        setIsResending(true)
        try {
            const response = await fetch(`${API_URL}/api/auth/request-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })

            const data = await response.json().catch(() => ({}))
            setVerificationMessage(data?.message || 'Verification email sent successfully.')
            setShowVerificationAlert(true)
        } catch (error) {
            setVerificationMessage('Failed to resend verification email. Please try again.')
            setShowVerificationAlert(true)
        } finally {
            setIsResending(false)
        }
    }

    const isBusy = isAuthLoading || isGoogleLoading

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4 shadow-[0_0_30px_rgba(16,185,129,0.35)]">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">VolSpike</h1>
                    <p className="text-gray-400">Professional cryptocurrency market analysis and volume alerts</p>
                </div>

                <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                    <CardHeader className="space-y-4">
                        <div className="flex justify-center space-x-2 text-sm" role="tablist" aria-label="Authentication mode">
                            <button
                                type="button"
                                className={`flex-1 rounded-full border px-4 py-2 transition-all ${tab === 'signin'
                                    ? 'border-green-500 bg-green-500/10 text-green-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                                    : 'border-gray-700 bg-gray-800/80 text-gray-300 hover:border-gray-600'}`}
                                onClick={() => setTab('signin')}
                                aria-selected={tab === 'signin'}
                            >
                                Email Login
                            </button>
                            <button
                                type="button"
                                className={`flex-1 rounded-full border px-4 py-2 transition-all ${tab === 'signup'
                                    ? 'border-green-500 bg-green-500/10 text-green-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                                    : 'border-gray-700 bg-gray-800/80 text-gray-300 hover:border-gray-600'}`}
                                onClick={() => setTab('signup')}
                                aria-selected={tab === 'signup'}
                            >
                                Create Account
                            </button>
                        </div>
                        <div className="space-y-1 text-center">
                            <CardTitle className="text-2xl text-white">
                                {tab === 'signin' ? 'Welcome back' : 'Create your account'}
                            </CardTitle>
                            <CardDescription className="text-gray-400">
                                {tab === 'signin'
                                    ? 'Sign in to access real-time volume spike alerts'
                                    : 'Start tracking Binance perp markets in seconds'}
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {showVerificationAlert && (
                            <div className="flex items-start gap-3 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-3 text-sm text-green-200">
                                <Mail className="mt-0.5 h-4 w-4" />
                                <div>
                                    <p>{verificationMessage}</p>
                                    <button
                                        type="button"
                                        onClick={resendVerification}
                                        className="mt-2 inline-flex items-center text-xs font-semibold text-green-200 underline underline-offset-4 hover:text-green-100 disabled:opacity-70"
                                        disabled={isResending}
                                    >
                                        {isResending ? 'Resending...' : 'Resend email'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {tab === 'signin' ? (
                            <form onSubmit={signinForm.handleSubmit(handleSignin)} noValidate className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="signin-email" className="text-gray-300">Email Address</Label>
                                    <Input
                                        id="signin-email"
                                        type="email"
                                        placeholder="you@example.com"
                                        className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                                        {...signinForm.register('email')}
                                    />
                                    {signinForm.formState.errors.email && (
                                        <p className="text-xs text-red-300">{signinForm.formState.errors.email.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signin-password" className="text-gray-300">Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="signin-password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Enter your password"
                                            className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 pr-10"
                                            {...signinForm.register('password')}
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
                                    {signinForm.formState.errors.password && (
                                        <p className="text-xs text-red-300">{signinForm.formState.errors.password.message}</p>
                                    )}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Controller
                                        control={signinForm.control}
                                        name="remember"
                                        render={({ field }) => (
                                            <Checkbox
                                                id="signin-remember"
                                                checked={field.value ?? false}
                                                onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                                            />
                                        )}
                                    />
                                    <Label htmlFor="signin-remember" className="text-gray-300 text-sm">
                                        Remember me for 30 days
                                    </Label>
                                </div>
                                {authError && (
                                    <div className="rounded-md bg-red-500/10 border border-red-500 px-3 py-2 text-sm text-red-400">
                                        {authError}
                                    </div>
                                )}
                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-green-500 via-emerald-400 to-green-500 text-white shadow-[0_20px_60px_rgba(16,185,129,0.35)] hover:brightness-105"
                                    disabled={isBusy}
                                >
                                    {isAuthLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Signing in...
                                        </>
                                    ) : (
                                        'Sign in'
                                    )}
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={signupForm.handleSubmit(handleSignup)} noValidate className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="signup-email" className="text-gray-300">Email Address</Label>
                                    <Input
                                        id="signup-email"
                                        type="email"
                                        placeholder="you@example.com"
                                        className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                                        {...signupForm.register('email')}
                                    />
                                    {signupForm.formState.errors.email && (
                                        <p className="text-xs text-red-300">{signupForm.formState.errors.email.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signup-password" className="text-gray-300">Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="signup-password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Create a secure password"
                                            className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 pr-10"
                                            {...signupForm.register('password')}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                                        >
                                            {showPassword ? (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                    <div className="mt-2 flex gap-1" aria-hidden>
                                        {[0, 1, 2, 3].map((i) => (
                                            <div
                                                key={i}
                                                className={`h-1.5 flex-1 rounded-full ${pwStrength > i ? 'bg-green-400' : 'bg-gray-600'}`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        Minimum 12 characters with uppercase, number and symbol
                                    </p>
                                    {signupForm.formState.errors.password && (
                                        <p className="text-xs text-red-300">{signupForm.formState.errors.password.message}</p>
                                    )}
                                </div>
                                {authError && (
                                    <div className="rounded-md bg-red-500/10 border border-red-500 px-3 py-2 text-sm text-red-400">
                                        {authError}
                                    </div>
                                )}
                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-green-500 via-emerald-400 to-green-500 text-white shadow-[0_20px_60px_rgba(16,185,129,0.35)] hover:brightness-105"
                                    disabled={isBusy || !signupForm.formState.isValid}
                                >
                                    {isAuthLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating account...
                                        </>
                                    ) : (
                                        'Create account'
                                    )}
                                </Button>
                            </form>
                        )}

                        <div className="flex items-center space-x-4">
                            <div className="flex-1 h-px bg-gray-700" />
                            <span className="bg-gray-800 px-2 text-gray-400">or</span>
                            <div className="flex-1 h-px bg-gray-700" />
                        </div>

                        <Button
                            type="button"
                            onClick={handleGoogleSignIn}
                            disabled={isBusy}
                            className="w-full border border-green-400/60 bg-transparent text-green-300 hover:bg-green-500/15"
                            variant="outline"
                        >
                            {isGoogleLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                <>
                                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                        <path
                                            fill="currentColor"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        />
                                    </svg>
                                    Continue with Google
                                </>
                            )}
                        </Button>

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
                                        (!authenticationStatus || authenticationStatus === 'authenticated')

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
                                                            disabled={!ready || isBusy}
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

                        <div className="text-center">
                            <p className="text-gray-400 text-sm">
                                {tab === 'signin' ? 'Need an account?' : 'Already registered?'}{' '}
                                <button
                                    type="button"
                                    className="text-green-400 hover:text-green-300 font-semibold"
                                    onClick={() => setTab(tab === 'signin' ? 'signup' : 'signin')}
                                >
                                    {tab === 'signin' ? 'Create one for free' : 'Sign in instead'}
                                </button>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

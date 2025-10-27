'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { clsx } from 'clsx'
import { Mail, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

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
    const [openWallet, setOpenWallet] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [tab, setTab] = useState<'signin' | 'signup'>('signup')
    const [isLoading, setIsLoading] = useState(false)
    const [verificationMessage, setVerificationMessage] = useState('')
    const [showVerificationAlert, setShowVerificationAlert] = useState(false)
    const router = useRouter()

    const signupForm = useForm<SignupForm>({
        resolver: zodResolver(signupSchema),
        defaultValues: { email: '', password: '', remember: true },
    })

    const signinForm = useForm<SigninForm>({
        resolver: zodResolver(signinSchema),
        defaultValues: { email: '', password: '', remember: true },
    })

    const pwStrength = useMemo(
        () => passwordStrength(signupForm.watch('password') || ''),
        [signupForm.watch('password')]
    )

    async function handleSignin(data: SigninForm) {
        setIsLoading(true)
        try {
            const result = await signIn('credentials', {
                email: data.email,
                password: data.password,
                redirect: false,
            })

            if (result?.ok) {
                router.push('/')
            } else {
                signinForm.setError('password', { message: 'Invalid email or password' })
            }
        } catch (error) {
            signinForm.setError('password', { message: 'An error occurred during sign in' })
        } finally {
            setIsLoading(false)
        }
    }

    async function handleSignup(data: SignupForm) {
        setIsLoading(true)
        try {
            const response = await fetch(`${API_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: data.email, password: data.password, tier: 'free' }),
            })

            const payload = await response.json()

            if (!response.ok) {
                signupForm.setError('password', { message: payload?.error || 'Could not create account' })
                return
            }

            if (payload.requiresVerification) {
                setVerificationMessage(payload.message || 'Please check your email to verify your account.')
                setShowVerificationAlert(true)
                signupForm.reset()
            } else {
                await handleSignin({ email: data.email, password: data.password, remember: data.remember })
            }
        } catch (error) {
            signupForm.setError('password', { message: 'Network error. Please try again.' })
        } finally {
            setIsLoading(false)
        }
    }

    async function handleGoogleSignIn() {
        setIsLoading(true)
        try {
            await signIn('google', { callbackUrl: '/' })
        } catch (error) {
            console.error('Google sign in error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    async function resendVerification() {
        const email = signupForm.getValues('email') || signinForm.getValues('email')
        if (!email) return

        setIsLoading(true)
        try {
            const response = await fetch(`${API_URL}/api/auth/request-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })

            const data = await response.json()
            setVerificationMessage(data.message || 'Verification email sent successfully.')
            setShowVerificationAlert(true)
        } catch (error) {
            setVerificationMessage('Failed to resend verification email. Please try again.')
            setShowVerificationAlert(true)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <main className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
            {/* Background gradient */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        'radial-gradient(70rem 70rem at 50% -10%, rgba(34,197,94,0.18), transparent 45%), radial-gradient(45rem 45rem at -10% 80%, rgba(34,197,94,0.10), transparent 40%), linear-gradient(180deg, #020617 0%, #020617 100%)',
                }}
            />

            <section className="relative mx-auto flex max-w-7xl flex-col items-center px-6 py-14">
                {/* Brand */}
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-400/50 shadow-[0_0_40px_rgba(16,185,129,0.35)]">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-emerald-400">
                            <path d="M13 2L3 14h7l-1 8 11-12h-7V2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-semibold tracking-tight">VolSpike</h1>
                    <p className="mt-2 text-sm text-slate-400">Professional cryptocurrency market analysis and volume alerts</p>
                </div>

                {/* Card */}
                <Card className="w-full max-w-md bg-slate-900/70 backdrop-blur-md ring-1 ring-white/10 shadow-2xl rounded-2xl">
                    <CardContent className="p-6">
                        {/* Verification Alert */}
                        {showVerificationAlert && (
                            <Alert className="mb-4 border-blue-500 bg-blue-50 dark:bg-blue-950">
                                <Mail className="h-4 w-4" />
                                <AlertDescription>
                                    {verificationMessage}
                                    <Button
                                        variant="link"
                                        size="sm"
                                        onClick={resendVerification}
                                        disabled={isLoading}
                                        className="ml-2 p-0 h-auto text-blue-600 hover:text-blue-500"
                                    >
                                        Resend email
                                    </Button>
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Tabs */}
                        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 rounded-xl bg-slate-800/60 p-1">
                                <TabsTrigger value="signin" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
                                    Sign in
                                </TabsTrigger>
                                <TabsTrigger value="signup" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
                                    Create account
                                </TabsTrigger>
                            </TabsList>

                            {/* Sign in */}
                            <TabsContent value="signin" className="mt-6 space-y-4">
                                <form onSubmit={signinForm.handleSubmit(handleSignin)} noValidate>
                                    <div className="space-y-2">
                                        <Label htmlFor="si-email">Email address</Label>
                                        <Input
                                            id="si-email"
                                            type="email"
                                            placeholder="you@example.com"
                                            {...signinForm.register('email')}
                                            className="bg-slate-800/70 border-white/10"
                                        />
                                        {signinForm.formState.errors.email && (
                                            <p className="text-xs text-red-300">{signinForm.formState.errors.email.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="si-password">Password</Label>
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="text-xs text-slate-400 hover:text-slate-200"
                                            >
                                                {showPassword ? 'Hide' : 'Show'}
                                            </button>
                                        </div>
                                        <Input
                                            id="si-password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Your password"
                                            {...signinForm.register('password')}
                                            className="bg-slate-800/70 border-white/10"
                                        />
                                        {signinForm.formState.errors.password && (
                                            <p className="text-xs text-red-300">{signinForm.formState.errors.password.message}</p>
                                        )}
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Signing in...
                                            </>
                                        ) : (
                                            'Sign in'
                                        )}
                                    </Button>
                                </form>
                            </TabsContent>

                            {/* Create account */}
                            <TabsContent value="signup" className="mt-6 space-y-4">
                                <form onSubmit={signupForm.handleSubmit(handleSignup)} noValidate>
                                    <div className="space-y-2">
                                        <Label htmlFor="su-email">Email address</Label>
                                        <Input
                                            id="su-email"
                                            type="email"
                                            placeholder="you@example.com"
                                            {...signupForm.register('email')}
                                            className="bg-slate-800/70 border-white/10"
                                        />
                                        {signupForm.formState.errors.email && (
                                            <p className="text-xs text-red-300">{signupForm.formState.errors.email.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="su-password">Password</Label>
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="text-xs text-slate-400 hover:text-slate-200"
                                            >
                                                {showPassword ? 'Hide' : 'Show'}
                                            </button>
                                        </div>
                                        <Input
                                            id="su-password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Create a strong password"
                                            {...signupForm.register('password')}
                                            className="bg-slate-800/70 border-white/10"
                                        />
                                        {/* Strength meter */}
                                        <div className="mt-2 flex gap-1" aria-hidden>
                                            {[0, 1, 2, 3].map((i) => (
                                                <div
                                                    key={i}
                                                    className={clsx(
                                                        'h-1.5 w-1/4 rounded-full',
                                                        pwStrength > i ? 'bg-emerald-400' : 'bg-slate-600'
                                                    )}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-xs text-slate-400">
                                            Min 12 chars with upper, number & symbol
                                        </p>
                                        {signupForm.formState.errors.password && (
                                            <p className="text-xs text-red-300">{signupForm.formState.errors.password.message}</p>
                                        )}
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500"
                                        disabled={!signupForm.formState.isValid || isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Creating account...
                                            </>
                                        ) : (
                                            'Create account'
                                        )}
                                    </Button>
                                </form>
                            </TabsContent>
                        </Tabs>

                        <div className="my-6 flex items-center gap-4">
                            <Separator className="flex-1 bg-white/10" />
                            <span className="text-xs text-slate-500">or</span>
                            <Separator className="flex-1 bg-white/10" />
                        </div>

                        {/* Google Sign In */}
                        <Button
                            variant="outline"
                            className="w-full border-white/10 bg-slate-800/60 hover:bg-slate-700/60"
                            onClick={handleGoogleSignIn}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Signing in...
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

                        {/* Connect Wallet */}
                        <Button
                            variant="outline"
                            className="w-full mt-3 border-white/10 bg-slate-800/60 hover:bg-slate-700/60"
                            onClick={() => setOpenWallet(true)}
                            disabled={isLoading}
                        >
                            Connect Wallet
                        </Button>

                        <p className="mt-6 text-center text-sm text-slate-400">
                            {tab === 'signin' ? (
                                <>
                                    New here?{' '}
                                    <button
                                        className="text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline"
                                        onClick={() => setTab('signup')}
                                        type="button"
                                    >
                                        Create an account
                                    </button>
                                </>
                            ) : (
                                <>
                                    Already registered?{' '}
                                    <button
                                        className="text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline"
                                        onClick={() => setTab('signin')}
                                        type="button"
                                    >
                                        Sign in instead
                                    </button>
                                </>
                            )}
                        </p>
                    </CardContent>
                </Card>
            </section>

            {/* Wallet Dialog */}
            <Dialog open={openWallet} onOpenChange={setOpenWallet}>
                <DialogContent className="bg-slate-900/90 backdrop-blur ring-1 ring-white/10 border-white/10">
                    <DialogHeader>
                        <DialogTitle>Connect your wallet</DialogTitle>
                    </DialogHeader>
                    <div className="mt-2 rounded-xl border border-white/10 p-4">
                        <ConnectButton showBalance={false} accountStatus="avatar" />
                    </div>
                    <p className="mt-3 text-xs text-slate-400">
                        We never store your private keys. SIWE is used for authentication; signature is verified server-side.
                    </p>
                </DialogContent>
            </Dialog>
        </main>
    )
}

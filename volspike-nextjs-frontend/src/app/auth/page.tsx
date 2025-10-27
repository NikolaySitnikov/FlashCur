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
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { clsx } from 'clsx'

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
    }

    async function handleSignup(data: SignupForm) {
        const response = await fetch(`${API_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: data.email, password: data.password, tier: 'free' }),
        })

        if (!response.ok) {
            const payload = await response.json().catch(() => ({}))
            signupForm.setError('password', { message: payload?.error || 'Could not create account' })
            return
        }

        await handleSignin({ email: data.email, password: data.password, remember: data.remember })
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
                                    <Button type="submit" className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500">
                                        Sign in
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
                                        disabled={!signupForm.formState.isValid}
                                    >
                                        Create account
                                    </Button>
                                </form>
                            </TabsContent>
                        </Tabs>

                        <div className="my-6 flex items-center gap-4">
                            <Separator className="flex-1 bg-white/10" />
                            <span className="text-xs text-slate-500">or</span>
                            <Separator className="flex-1 bg-white/10" />
                        </div>

                        {/* Connect Wallet */}
                        <Button
                            variant="outline"
                            className="w-full border-white/10 bg-slate-800/60 hover:bg-slate-700/60"
                            onClick={() => setOpenWallet(true)}
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

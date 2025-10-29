'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { useEffect, useState } from 'react'

const signinSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
    remember: z.boolean().optional(),
})

type SigninFormValues = z.infer<typeof signinSchema>

interface SigninFormProps {
    onSuccess: (email: string) => void
    isAdminMode?: boolean
    nextUrl?: string
    initialError?: string
}

const ERROR_MESSAGES: Record<string, string> = {
    CredentialsSignin: 'Invalid email or password. Please check your credentials and try again.',
    OAuthSignin: 'Error signing in with OAuth provider.',
    OAuthCallback: 'Error during OAuth callback.',
    OAuthCreateAccount: 'Could not create OAuth account.',
    EmailCreateAccount: 'Could not create email account.',
    Callback: 'Error during callback.',
    OAuthAccountNotLinked: 'Account already exists with a different provider.',
    EmailSignin: 'Error sending email verification.',
    SessionRequired: 'Please sign in to access this page.',
    Default: 'An error occurred during sign in. Please try again.',
    'Authentication service unavailable': 'Unable to connect to authentication service. Please try again later.',
    'Invalid credentials': 'Invalid email or password. Please check your credentials and try again.',
    'Invalid email or password': 'Invalid email or password. Please check your credentials and try again.',
    'Please verify your email address before signing in': 'Please verify your email address before signing in.',
    'Please use OAuth login (Google) for this account': 'Please use Google login for this account.',
}

const mapErrorMessage = (code?: string | null) => {
    if (!code) {
        return ERROR_MESSAGES.Default
    }
    return ERROR_MESSAGES[code] ?? code
}

export function SigninForm({ onSuccess, isAdminMode = false, nextUrl = '/dashboard', initialError }: SigninFormProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [showPassword, setShowPassword] = useState(false)
    const [authError, setAuthError] = useState('')

    const { handleSubmit, control, formState, watch } = useForm<SigninFormValues>({
        resolver: zodResolver(signinSchema),
        defaultValues: { email: '', password: '', remember: true },
    })

    const { isSubmitting, errors } = formState
    const emailValue = watch('email')

    useEffect(() => {
        if (initialError === undefined) {
            return
        }
        if (initialError) {
            setAuthError(mapErrorMessage(initialError))
        } else {
            setAuthError('')
        }
    }, [initialError])

    // Handle URL error parameters
    useEffect(() => {
        const urlError = searchParams.get('error')
        if (urlError) {
            console.log('[SigninForm] URL error parameter:', urlError)
            setAuthError(mapErrorMessage(urlError))
        }
    }, [searchParams])

    const onSubmit = async (data: SigninFormValues) => {
        setAuthError('')
        console.log('[SigninForm] Attempting sign in with:', data.email)

        try {
            const result = await signIn('credentials', {
                email: data.email,
                password: data.password,
                redirect: false,
                callbackUrl: nextUrl,
            })

            console.log('[SigninForm] Sign in result:', JSON.stringify(result, null, 2))
            console.log('[SigninForm] Result.error:', result?.error)

            if (result?.ok) {
                console.log('[SigninForm] Sign in successful')
                onSuccess(data.email)
                router.refresh()
                router.push(nextUrl)
            } else {
                console.log('[SigninForm] Sign in failed, error:', result?.error)
                const errorMessage = result?.error || 'Authentication failed'
                const mappedMessage = mapErrorMessage(errorMessage)
                console.log('[SigninForm] Mapped error message:', mappedMessage)
                setAuthError(mappedMessage)
            }
        } catch (error) {
            console.error('[SigninForm] Sign in exception:', error)
            const message = error instanceof Error
                ? mapErrorMessage(error.message)
                : mapErrorMessage('Authentication service unavailable')
            setAuthError(message)
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-gray-300">Email Address</Label>
                <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                        <Input
                            id="signin-email"
                            type="email"
                            placeholder="you@example.com"
                            className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                            autoComplete="email"
                            {...field}
                        />
                    )}
                />
                {errors.email && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.email.message}
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="signin-password" className="text-gray-300">Password</Label>
                <div className="relative">
                    <Controller
                        name="password"
                        control={control}
                        render={({ field }) => (
                            <Input
                                id="signin-password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter your password"
                                className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 pr-10"
                                autoComplete="current-password"
                                {...field}
                            />
                        )}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                        {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                        ) : (
                            <Eye className="w-5 h-5" />
                        )}
                    </button>
                </div>
                {errors.password && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.password.message}
                    </p>
                )}
            </div>

            {!isAdminMode && (
                <div className="flex items-center space-x-2">
                    <Controller
                        name="remember"
                        control={control}
                        render={({ field }) => (
                            <Checkbox
                                id="signin-remember"
                                checked={field.value ?? false}
                                onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                            />
                        )}
                    />
                    <Label htmlFor="signin-remember" className="text-gray-300 text-sm cursor-pointer">
                        Remember me for 30 days
                    </Label>
                </div>
            )}

            {authError && (
                <div className="rounded-md bg-red-500/10 border border-red-500/50 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>{authError}</span>
                </div>
            )}

            <Button
                type="submit"
                className="w-full bg-gradient-to-r from-green-500 via-emerald-400 to-green-500 text-white shadow-[0_20px_60px_rgba(16,185,129,0.35)] hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                    </>
                ) : (
                    isAdminMode ? 'Sign in as Admin' : 'Sign in'
                )}
            </Button>
        </form>
    )
}

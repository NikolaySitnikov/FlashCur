'use client'

import { useForm, Controller, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'

const signinSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
    remember: z.boolean().optional(),
})

type SigninFormValues = z.infer<typeof signinSchema>

interface SigninFormProps {
    onSuccess: () => void
    authError: string
    setAuthError: (error: string) => void
    showPassword: boolean
    setShowPassword: (show: boolean) => void
}

export function SigninForm({ onSuccess, authError, setAuthError, showPassword, setShowPassword }: SigninFormProps) {
    const router = useRouter()
    
    const methods = useForm<SigninFormValues>({
        resolver: zodResolver(signinSchema),
        defaultValues: { email: '', password: '', remember: true },
    })
    
    const { handleSubmit, control, formState, watch } = methods
    const isSubmitting = formState.isSubmitting

    const onSubmit = async (data: SigninFormValues) => {
        setAuthError('')
        
        try {
            const result = await signIn('credentials', {
                email: data.email,
                password: data.password,
                redirect: false,
            })

            if (result?.ok) {
                onSuccess()
                router.push('/')
            } else {
                const message = 'Invalid email or password. Please try again.'
                setAuthError(message)
            }
        } catch (error) {
            const message = 'An error occurred during sign in. Please try again.'
            setAuthError(message)
        }
    }

    return (
        <FormProvider {...methods}>
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
                                {...field}
                            />
                        )}
                    />
                    {formState.errors.email && (
                        <p className="text-xs text-red-300">{formState.errors.email.message}</p>
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
                                    {...field}
                                />
                            )}
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
                    {formState.errors.password && (
                        <p className="text-xs text-red-300">{formState.errors.password.message}</p>
                    )}
                </div>
                
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
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in...
                        </>
                    ) : (
                        'Sign in'
                    )}
                </Button>
            </form>
        </FormProvider>
    )
}

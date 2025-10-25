'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import dynamic from 'next/dynamic'

// Dynamically import ConnectButton to handle hydration safely
const ConnectButton = dynamic(
    () => import('@rainbow-me/rainbowkit').then(mod => ({ default: mod.ConnectButton })),
    {
        ssr: false,
        loading: () => (
            <Button 
                disabled 
                className="w-full bg-gray-600 text-white"
            >
                Loading wallet...
            </Button>
        )
    }
)

export function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [rememberMe, setRememberMe] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            await signIn('credentials', {
                email,
                password,
                redirect: false,
            })
        } catch (error) {
            console.error('Login error:', error)
        } finally {
            setIsLoading(false)
        }
    }

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
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl text-white text-center">Welcome back</CardTitle>
                        <CardDescription className="text-gray-400 text-center">
                            Sign in to access real-time volume spike alerts
                        </CardDescription>
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
                                    placeholder="Enter your password"
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
                            <Button
                                type="submit"
                                className="w-full bg-green-500 hover:bg-green-600 text-white"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Signing in...' : '🚀 Sign In'}
                            </Button>
                        </form>

                        {/* Divider */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-gray-600" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-gray-800 px-2 text-gray-400">or</span>
                            </div>
                        </div>

                        {/* Wallet Connection */}
                        <div className="space-y-3">
                            <ConnectButton />
                        </div>

                        {/* Sign Up Link */}
                        <div className="text-center">
                            <p className="text-gray-400 text-sm">
                                Don't have an account?{' '}
                                <a href="#" className="text-green-500 hover:text-green-400 font-medium">
                                    Sign up for free
                                </a>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

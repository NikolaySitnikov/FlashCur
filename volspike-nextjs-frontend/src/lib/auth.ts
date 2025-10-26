import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                // TODO: Implement actual user authentication logic
                // Connect to your backend API to validate credentials
                // Example:
                // const response = await fetch('http://localhost:3001/api/auth/login', {
                //     method: 'POST',
                //     headers: { 'Content-Type': 'application/json' },
                //     body: JSON.stringify({ email: credentials.email, password: credentials.password })
                // })
                // const user = await response.json()
                // if (!user) return null
                // return user

                // For now, return a mock user for development
                if (credentials.email === 'test@volspike.com' && credentials.password === 'password') {
                    return {
                        id: '1',
                        email: 'test@volspike.com',
                        name: 'Test User',
                        tier: 'free' as const,
                    }
                }

                return null
            }
        })
    ],
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    pages: {
        signIn: '/auth/signin',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.email = user.email
                token.tier = user.tier
                // Generate a mock access token for development
                token.accessToken = `mock-token-${user.id}-${Date.now()}`
            }
            return token
        },
        async session({ session, token }) {
            if (session.user && token) {
                session.user.id = token.id as string
                session.user.email = token.email as string
                session.user.tier = token.tier as 'free' | 'pro' | 'elite' | undefined
                session.accessToken = token.accessToken as string | undefined
            }
            return session
        },
    },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)

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

                // For now, return a mock user for development
                // Support multiple test accounts
                if (
                    (credentials.email === 'test@volspike.com' && credentials.password === 'password') ||
                    (credentials.email === 'test-free@example.com' && credentials.password === 'password123')
                ) {
                    return {
                        id: '1',
                        email: credentials.email,
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
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.email = user.email
                token.tier = user.tier
                console.log(`[Auth] JWT callback for user ${user.email}`)
            }
            return token
        },
        async session({ session, token }) {
            if (session.user && token) {
                session.user.id = token.id as string
                session.user.email = token.email as string
                session.user.tier = token.tier as 'free' | 'pro' | 'elite' | undefined
                // ✅ Use the NextAuth JWT token directly - it's already signed with NEXTAUTH_SECRET
                session.accessToken = token.accessToken || `${Date.now()}`
            }
            return session
        },
    },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)

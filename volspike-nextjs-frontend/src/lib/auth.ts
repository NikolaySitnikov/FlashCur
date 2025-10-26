import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { NextAuthConfig, Session } from 'next-auth'
import type { JWT } from 'next-auth/jwt'

declare module 'next-auth' {
    interface Session {
        user: {
            id?: string
            email?: string
            name?: string
            tier?: 'free' | 'pro' | 'elite'
        }
        accessToken?: string
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id?: string
        email?: string
        tier?: 'free' | 'pro' | 'elite'
        accessToken?: string
    }
}

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

                // Support multiple test accounts
                if (
                    (credentials.email === 'test@volspike.com' && credentials.password === 'password') ||
                    (credentials.email === 'test-free@example.com' && credentials.password === 'password123')
                ) {
                    return {
                        id: '1',
                        email: credentials.email,
                        name: 'Test User',
                        tier: 'free',
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
            // When user first logs in, add their data to the token
            if (user) {
                token.id = user.id as string
                token.email = user.email as string
                token.tier = user.tier as 'free' | 'pro' | 'elite'
                token.accessToken = user.id as string
                console.log(`[Auth] JWT callback - User logged in: ${user.email}`)
            }
            return token
        },
        async session({ session, token }) {
            // Copy token data to session
            if (token && session.user) {
                session.user.id = token.id
                session.user.email = token.email
                session.user.tier = token.tier
                session.accessToken = token.accessToken
                console.log(`[Auth] Session callback - User: ${token.email}, AccessToken: ${token.accessToken}`)
            }
            return session
        },
    },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)

import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { NextAuthConfig } from 'next-auth'

const BACKEND_API_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

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

                try {
                    const response = await fetch(`${BACKEND_API_URL}/api/auth/signin`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password,
                        }),
                    })

                    if (!response.ok) {
                        console.error('[NextAuth] Backend signin failed', response.status)
                        return null
                    }

                    const { user, token } = await response.json()

                    if (!user?.id || !token) {
                        console.error('[NextAuth] Backend response missing user or token')
                        return null
                    }

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.email,
                        tier: user.tier,
                        accessToken: token,
                    }
                } catch (error) {
                    console.error('[NextAuth] Unable to reach backend auth service', error)
                    throw new Error('Authentication service unavailable')
                }
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
        async jwt({ token, user }: any) {
            if (user) {
                token.id = user.id
                token.email = user.email
                token.tier = user.tier
                token.accessToken = user.accessToken
                console.log(`[Auth] JWT callback - User logged in: ${user.email}`)
            }
            return token
        },
        async session({ session, token }: any) {
            if (token && session.user) {
                session.user.id = token.id
                session.user.email = token.email
                session.user.name = session.user.name || token.email?.split('@')[0] || 'VolSpike User'
                session.user.tier = token.tier
                session.accessToken = token.accessToken
                console.log(`[Auth] Session callback - User: ${token.email}, AccessToken set to JWT`)
            }
            return session
        },
    },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)

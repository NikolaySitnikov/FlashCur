import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import type { NextAuthConfig } from 'next-auth'

const BACKEND_API_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export const authConfig: NextAuthConfig = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            profile(profile) {
                return {
                    id: profile.sub,
                    email: profile.email,
                    name: profile.name,
                    image: profile.picture,
                }
            }
        }),
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
                        const errorData = await response.json().catch(() => ({ error: 'Authentication failed' }))
                        console.error('[NextAuth] Backend error:', errorData)

                        // Return null for invalid credentials - NextAuth will handle this properly
                        if (response.status === 401) {
                            return null
                        } else if (response.status === 403) {
                            return null
                        }

                        // For other errors, still return null to let NextAuth handle it
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
                        emailVerified: user.emailVerified,
                        role: user.role,
                        status: user.status,
                        twoFactorEnabled: user.twoFactorEnabled,
                        accessToken: token,
                    }
                } catch (error) {
                    console.error('[NextAuth] Authorization error:', error)
                    // Return null for any errors - NextAuth will handle this properly
                    return null
                }
            }
        })
    ],
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    pages: {
        signIn: '/auth',
        error: '/auth',
    },
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        async jwt({ token, user, account }: any) {
            if (user) {
                token.id = user.id
                token.email = user.email
                token.tier = user.tier
                token.emailVerified = user.emailVerified
                token.role = user.role
                token.status = user.status
                token.twoFactorEnabled = user.twoFactorEnabled
                token.accessToken = user.accessToken
                console.log(`[Auth] JWT callback - User logged in: ${user.email}`)
            }

            // Handle Google OAuth account linking
            if (account?.provider === 'google' && user?.email) {
                try {
                    // Check if user exists in our database
                    const response = await fetch(`${BACKEND_API_URL}/api/auth/oauth-link`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            email: user.email,
                            name: user.name,
                            image: user.image,
                            provider: 'google',
                            providerId: user.id,
                        }),
                    })

                    if (response.ok) {
                        const { user: dbUser, token: dbToken } = await response.json()
                        token.id = dbUser.id
                        token.tier = dbUser.tier
                        token.emailVerified = dbUser.emailVerified
                        token.role = dbUser.role
                        token.status = dbUser.status
                        token.twoFactorEnabled = dbUser.twoFactorEnabled
                        token.accessToken = dbToken
                    }
                } catch (error) {
                    console.error('[NextAuth] OAuth linking failed:', error)
                }
            }

            return token
        },
        async session({ session, token }: any) {
            if (token && session.user) {
                session.user.id = token.id
                session.user.email = token.email
                session.user.name = session.user.name || token.email?.split('@')[0] || 'VolSpike User'
                session.user.tier = token.tier
                session.user.emailVerified = token.emailVerified
                session.user.role = token.role
                session.user.status = token.status
                session.user.twoFactorEnabled = token.twoFactorEnabled
                session.accessToken = token.accessToken
                console.log(`[Auth] Session callback - User: ${token.email}, AccessToken set to JWT`)
            }
            return session
        },
    },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)

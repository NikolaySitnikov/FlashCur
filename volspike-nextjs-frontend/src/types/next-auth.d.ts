import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    email: string
    name?: string
    tier?: 'free' | 'pro' | 'elite'
  }

  interface Session {
    user: {
      id: string
      email: string
      name?: string
      tier?: 'free' | 'pro' | 'elite'
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    email: string
    tier?: 'free' | 'pro' | 'elite'
  }
}

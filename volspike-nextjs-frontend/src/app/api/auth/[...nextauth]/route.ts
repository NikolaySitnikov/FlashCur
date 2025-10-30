// App Router NextAuth route handler
import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers

// Ensure Node runtime (not edge) for NextAuth
export const runtime = 'nodejs'
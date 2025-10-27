'use client'

import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSession } from 'next-auth/react'

export function useSocket() {
    const [socket, setSocket] = useState<Socket | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { data: session } = useSession()

    useEffect(() => {
        if (!session?.user?.email) {
            console.log('[Socket] No session or email, waiting for auth')
            return
        }

        // ✅ Use email as token - it's consistent and reliable across environments
        const token = process.env.NODE_ENV === 'development'
            ? `mock-token-${session.user.email}-${Date.now()}`
            : session.user.email  // ✅ Use email in production

        console.log('[Socket] Connecting with token type:', process.env.NODE_ENV === 'development' ? 'mock' : 'production')
        console.log('[Socket] Token:', token.substring(0, 30) + '...')

        const socketInstance = io(
            process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
            {
                auth: {
                    token: token,
                },
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: 5,
            }
        )

        socketInstance.on('connect', () => {
            setIsConnected(true)
            setError(null)
            console.log('[Socket] ✅ Connected successfully')
        })

        socketInstance.on('disconnect', (reason) => {
            setIsConnected(false)
            console.log('[Socket] ❌ Disconnected:', reason)
        })

        socketInstance.on('connect_error', (error) => {
            console.error('[Socket] ❌ Connection error:', error)
            setError(error.message || 'Connection failed')
        })

        socketInstance.on('error', (error) => {
            console.error('[Socket] ❌ Error:', error)
            setError(error)
        })

        setSocket(socketInstance)

        return () => {
            socketInstance.close()
        }
    }, [session?.user?.email])

    return { socket, isConnected, error }
}

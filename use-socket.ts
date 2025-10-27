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
        if (!session?.user?.id) return

        const userId = session.user.id
        
        // In development: use mock token for easier testing
        // In production: send session user ID (backend will validate against database)
        const token = process.env.NODE_ENV === 'development'
            ? `mock-token-${userId}-${Date.now()}`
            : userId

        // Log token type for debugging
        console.log('[Socket] Connecting with token type:', process.env.NODE_ENV === 'development' ? 'mock' : 'production')

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
            console.log('[Socket] Connected successfully')
        })

        socketInstance.on('disconnect', (reason) => {
            setIsConnected(false)
            console.log('[Socket] Disconnected:', reason)
        })

        socketInstance.on('connect_error', (error) => {
            console.error('[Socket] Connection error:', error)
            setError(error.message || 'Connection failed')
        })

        socketInstance.on('error', (error) => {
            console.error('[Socket] Error:', error)
            setError(error)
        })

        setSocket(socketInstance)

        return () => {
            socketInstance.close()
        }
    }, [session])

    return { socket, isConnected, error }
}

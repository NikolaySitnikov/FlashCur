'use client'

import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSession } from 'next-auth/react'

export function useSocket() {
    const [socket, setSocket] = useState<Socket | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const { data: session } = useSession()

    useEffect(() => {
        if (!session) return

        // Use session user ID for Socket.io authentication
        // For development, we use a mock token pattern
        const userId = session.user?.id || '1'
        const token = process.env.NODE_ENV === 'development'
            ? `mock-token-${userId}-${Date.now()}`
            : userId

        const socketInstance = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001', {
            auth: {
                token: token,
            },
            transports: ['websocket', 'polling'],
        })

        socketInstance.on('connect', () => {
            setIsConnected(true)
            console.log('Socket connected')
        })

        socketInstance.on('disconnect', () => {
            setIsConnected(false)
            console.log('Socket disconnected')
        })

        socketInstance.on('connect_error', (error) => {
            console.error('Socket connection error:', error)
        })

        setSocket(socketInstance)

        return () => {
            socketInstance.close()
        }
    }, [session])

    return { socket, isConnected }
}

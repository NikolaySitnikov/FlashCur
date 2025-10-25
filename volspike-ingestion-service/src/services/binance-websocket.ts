import WebSocket from 'ws'
import { createLogger } from '../lib/logger'
import { EventEmitter } from 'events'

const logger = createLogger()

export class BinanceWebSocketClient extends EventEmitter {
    private ws: WebSocket | null = null
    private isConnected = false
    private reconnectAttempts = 0
    private maxReconnectAttempts = 10
    private reconnectDelay = 3000
    private pingInterval: NodeJS.Timeout | null = null

    async connect() {
        try {
            const wsUrl = 'wss://fstream.binance.com/ws/!ticker@arr'
            this.ws = new WebSocket(wsUrl)

            this.ws.on('open', () => {
                this.isConnected = true
                this.reconnectAttempts = 0
                logger.info('✅ Connected to Binance WebSocket')

                // Start ping interval
                this.startPingInterval()
            })

            this.ws.on('message', (data: WebSocket.Data) => {
                try {
                    const message = JSON.parse(data.toString())
                    this.handleMessage(message)
                } catch (error) {
                    logger.error('Error parsing WebSocket message:', error)
                }
            })

            this.ws.on('close', (code, reason) => {
                this.isConnected = false
                this.stopPingInterval()
                logger.warn(`Binance WebSocket closed: ${code} - ${reason}`)
                this.handleReconnection()
            })

            this.ws.on('error', (error) => {
                logger.error('Binance WebSocket error:', error)
                this.handleReconnection()
            })

        } catch (error) {
            logger.error('Failed to connect to Binance WebSocket:', error)
            throw error
        }
    }

    async disconnect() {
        this.stopPingInterval()

        if (this.ws) {
            this.ws.close()
            this.ws = null
        }

        this.isConnected = false
        logger.info('Disconnected from Binance WebSocket')
    }

    private handleMessage(message: any) {
        try {
            if (Array.isArray(message)) {
                // Handle ticker data
                this.emit('ticker', message)
            } else if (message.e === '24hrTicker') {
                // Handle individual ticker updates
                this.emit('ticker', [message])
            } else if (message.e === 'markPriceUpdate') {
                // Handle funding rate updates
                this.emit('funding', [message])
            }
        } catch (error) {
            logger.error('Error handling WebSocket message:', error)
        }
    }

    private startPingInterval() {
        this.pingInterval = setInterval(() => {
            if (this.ws && this.isConnected) {
                this.ws.ping()
            }
        }, 30000) // Ping every 30 seconds
    }

    private stopPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval)
            this.pingInterval = null
        }
    }

    private handleReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error('Max reconnection attempts reached')
            return
        }

        this.reconnectAttempts++
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

        logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

        setTimeout(async () => {
            try {
                await this.connect()
            } catch (error) {
                logger.error('Reconnection failed:', error)
                this.handleReconnection()
            }
        }, delay)
    }

    get connected(): boolean {
        return this.isConnected
    }
}

'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'

interface BinanceTicker {
  s: string  // symbol
  c: string  // last price
  v: string  // volume
  q: string  // quote volume
  P: string  // price change percent
  r?: string // funding rate (from markPrice stream)
}

interface MarketData {
  symbol: string
  price: number
  volume24h: number
  volumeChange: number
  fundingRate: number
  openInterest: number
  timestamp: number
}

export function useBinanceWebSocket() {
  const { data: session } = useSession()
  const [isConnected, setIsConnected] = useState(false)
  const [marketData, setMarketData] = useState<MarketData[]>([])
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const tickerMapRef = useRef<Map<string, BinanceTicker>>(new Map())
  const fundingMapRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    // Only connect for Elite tier users
    if (!session?.user || session.user.tier !== 'elite') {
      return
    }

    const connectWebSocket = () => {
      try {
        // Use Binance combined stream for ticker and funding data
        const wsUrl = 'wss://fstream.binance.com/stream?streams=!ticker@arr/!markPrice@arr'
        wsRef.current = new WebSocket(wsUrl)

        wsRef.current.onopen = () => {
          console.log('✅ Binance WebSocket connected (client-side)')
          setIsConnected(true)
          setError(null)
        }

        wsRef.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            
            if (message.stream && message.data) {
              // Combined stream format
              handleStreamData(message.stream, message.data)
            } else if (Array.isArray(message)) {
              // Direct array format
              handleTickerData(message)
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err)
          }
        }

        wsRef.current.onerror = (error) => {
          console.error('Binance WebSocket error:', error)
          setError('WebSocket connection error')
          setIsConnected(false)
        }

        wsRef.current.onclose = () => {
          console.log('Binance WebSocket disconnected')
          setIsConnected(false)
          
          // Auto-reconnect after 5 seconds
          setTimeout(() => {
            if (session?.user?.tier === 'elite') {
              connectWebSocket()
            }
          }, 5000)
        }

      } catch (err) {
        console.error('Failed to connect to Binance WebSocket:', err)
        setError('Failed to connect to Binance')
      }
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [session?.user?.tier])

  const handleStreamData = (stream: string, data: any) => {
    try {
      if (stream === '!ticker@arr') {
        handleTickerData(data)
      } else if (stream === '!markPrice@arr') {
        handleFundingData(data)
      }
    } catch (err) {
      console.error(`Error handling stream ${stream}:`, err)
    }
  }

  const handleTickerData = (data: BinanceTicker[]) => {
    try {
      if (!Array.isArray(data)) return

      // Update ticker map
      data.forEach(ticker => {
        if (ticker.s && ticker.s.endsWith('USDT')) {
          tickerMapRef.current.set(ticker.s, ticker)
        }
      })

      // Convert to market data format
      updateMarketData()
    } catch (err) {
      console.error('Error processing ticker data:', err)
    }
  }

  const handleFundingData = (data: any[]) => {
    try {
      if (!Array.isArray(data)) return

      data.forEach(item => {
        if (item.s && item.r !== undefined) {
          fundingMapRef.current.set(item.s, parseFloat(item.r))
        }
      })

      // Update market data with new funding rates
      updateMarketData()
    } catch (err) {
      console.error('Error processing funding data:', err)
    }
  }

  const updateMarketData = () => {
    const marketDataArray: MarketData[] = []
    
    tickerMapRef.current.forEach((ticker, symbol) => {
      const price = parseFloat(ticker.c)
      const volume24h = parseFloat(ticker.q)
      
      // Only include symbols with good volume
      if (volume24h > 1000000) {
        marketDataArray.push({
          symbol,
          price,
          volume24h,
          volumeChange: parseFloat(ticker.P) || 0,
          fundingRate: fundingMapRef.current.get(symbol) || 0,
          openInterest: 0,
          timestamp: Date.now(),
        })
      }
    })

    // Sort by volume and update state
    marketDataArray.sort((a, b) => b.volume24h - a.volume24h)
    setMarketData(marketDataArray)
  }

  return {
    isConnected,
    marketData,
    error,
    reconnect: () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }
}

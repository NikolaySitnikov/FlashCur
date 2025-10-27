import { useState, useEffect, useRef } from 'react';

interface MarketData {
  symbol: string;
  price: number;
  volume24h: number;
  change24h?: number;
  volumeChange?: number;
  fundingRate: number;
  openInterest: number;
  timestamp: number;
}

interface UseClientOnlyMarketDataProps {
  tier: 'elite' | 'pro' | 'free';
  onDataUpdate?: (data: MarketData[]) => void;
}

export function useClientOnlyMarketData({ tier, onDataUpdate }: UseClientOnlyMarketDataProps) {
  const [data, setData] = useState<MarketData[]>([]);
  const [status, setStatus] = useState<'connecting' | 'live' | 'reconnecting' | 'error'>('connecting');
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [nextUpdate, setNextUpdate] = useState<number>(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const tickersRef = useRef<Map<string, any>>(new Map());
  const fundingRef = useRef<Map<string, any>>(new Map());
  const lastRenderRef = useRef<number>(0);
  const firstPaintDoneRef = useRef<boolean>(false);
  const reconnectAttemptsRef = useRef<number>(0);
  const renderPendingRef = useRef<boolean>(false);

  // Tier-based update intervals
  const CADENCE = tier === 'elite' ? 0 : (tier === 'pro' ? 300_000 : 900_000); // 0ms, 5min, 15min

  const buildSnapshot = (): MarketData[] => {
    const out: MarketData[] = [];
    
    for (const [sym, t] of Array.from(tickersRef.current.entries())) {
      const f = fundingRef.current.get(sym);
      out.push({
        symbol: sym,
        price: Number(t.c || t.lastPrice || 0),
        volume24h: Number(t.v || t.quoteVolume || 0),
        change24h: Number(t.P || t.priceChangePercent || 0),
        fundingRate: f ? Number(f.r || f.fr || 0) : 0,
        openInterest: 0, // Not available in ticker stream
        timestamp: Date.now(),
      });
    }
    
    // Sort by volume and limit to top 300 for performance
    out.sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));
    return out.slice(0, 300);
  };

  const render = (snapshot: MarketData[]) => {
    setData(snapshot);
    setLastUpdate(Date.now());
    
    // Save to localStorage for fallback
    try {
      localStorage.setItem('volspike:lastSnapshot', JSON.stringify({ 
        t: Date.now(), 
        rows: snapshot 
      }));
    } catch {}
    
    // Call callback if provided
    onDataUpdate?.(snapshot);
  };

  const connect = () => {
    const WS_URL = 'wss://fstream.binance.com/stream?streams=!ticker@arr/!markPrice@arr';
    
    try {
      wsRef.current = new WebSocket(WS_URL);
      let opened = false;

      wsRef.current.onopen = () => {
        opened = true;
        reconnectAttemptsRef.current = 0;
        setStatus('live');
        console.log('✅ Binance WebSocket connected');
      };

      wsRef.current.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          const payload = msg?.data ?? msg;
          const arr = Array.isArray(payload) ? payload : [payload];

          // Process ticker data
          for (const it of arr) {
            if (it?.e === '24hrTicker' || it?.c || it?.v) {
              tickersRef.current.set(it.s, it);
            }
            if (it?.r !== undefined || it?.fr !== undefined) {
              fundingRef.current.set(it.s, it);
            }
          }

          const snapshot = buildSnapshot();
          const now = Date.now();

          // First paint - render immediately
          if (!firstPaintDoneRef.current && snapshot.length > 0) {
            render(snapshot);
            firstPaintDoneRef.current = true;
            lastRenderRef.current = now;
            return;
          }

          // Elite tier - render with debouncing
          if (tier === 'elite') {
            if (!renderPendingRef.current) {
              renderPendingRef.current = true;
              setTimeout(() => {
                render(snapshot);
                renderPendingRef.current = false;
              }, 200); // 200ms debounce
            }
          } 
          // Pro/Free tiers - render based on cadence
          else if (now - lastRenderRef.current >= CADENCE) {
            render(snapshot);
            lastRenderRef.current = now;
          }

          // Update next update countdown
          if (tier !== 'elite') {
            const nextUpdateTime = lastRenderRef.current + CADENCE;
            setNextUpdate(nextUpdateTime);
          }

        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('error');
      };

      wsRef.current.onclose = () => {
        setStatus('reconnecting');
        console.log('WebSocket closed, reconnecting...');
        
        // Exponential backoff: 1s, 2s, 4s, 8s... up to 30s
        const delay = Math.min(30_000, (2 ** reconnectAttemptsRef.current) * 1000);
        reconnectAttemptsRef.current++;
        
        setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.CLOSED) {
            connect();
          }
        }, delay);
      };

      // If it never opens (geofence), show fallback after 5s
      setTimeout(() => {
        if (!opened && wsRef.current?.readyState !== WebSocket.OPEN) {
          geofenceFallback();
        }
      }, 5000);

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setStatus('error');
    }
  };

  const geofenceFallback = () => {
    console.log('Region may be blocked, trying localStorage fallback');
    
    try {
      const raw = localStorage.getItem('volspike:lastSnapshot');
      if (raw) {
        const { rows } = JSON.parse(raw);
        if (rows?.length) {
          render(rows);
          setStatus('error');
          return;
        }
      }
    } catch {}
    
    setStatus('error');
  };

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [tier]);

  // Update countdown timer
  useEffect(() => {
    if (tier === 'elite' || nextUpdate === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now >= nextUpdate) {
        setNextUpdate(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [nextUpdate, tier]);

  return {
    data,
    status,
    lastUpdate,
    nextUpdate,
    isLive: status === 'live',
    isConnecting: status === 'connecting',
    isReconnecting: status === 'reconnecting',
    hasError: status === 'error',
  };
}

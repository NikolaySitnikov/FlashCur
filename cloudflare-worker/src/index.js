// Cloudflare Worker to proxy Binance API requests
// This avoids Railway's shared IP being blocked by Binance

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      })
    }
    
    // Map /binance/** to https://fapi.binance.com/**
    if (url.pathname.startsWith('/binance/')) {
      const binancePath = url.pathname.replace('/binance', '')
      const binanceUrl = `https://fapi.binance.com${binancePath}${url.search}`
      
      try {
        const response = await fetch(binanceUrl, {
          method: request.method,
          headers: {
            'User-Agent': 'VolSpike-Proxy/1.0',
            'Accept': 'application/json',
          },
        })
        
        const data = await response.text()
        
        return new Response(data, {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=30', // Cache for 30 seconds
          },
        })
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Proxy error', message: error.message }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        })
      }
    }
    
    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        timestamp: Date.now(),
        service: 'volspike-binance-proxy'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }
    
    return new Response('Not Found', { status: 404 })
  },
}

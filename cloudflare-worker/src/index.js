// Enhanced Cloudflare Worker for Binance API proxy with caching
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }
    
    // Forward /fapi/* to Binance futures API
    if (url.pathname.startsWith('/fapi/')) {
      const upstream = 'https://fapi.binance.com' + url.pathname + url.search;
      
      try {
        const resp = await fetch(upstream, {
          headers: { 
            'User-Agent': 'volspike-proxy',
            'Accept': 'application/json'
          },
          cf: { 
            cacheTtl: 30, // Cache for 30 seconds
            cacheEverything: true 
          }
        });
        
        const data = await resp.text();
        
        return new Response(data, {
          status: resp.status,
          headers: {
            'content-type': resp.headers.get('content-type') || 'application/json',
            'access-control-allow-origin': '*',
            'cache-control': 'public, max-age=30',
            'x-proxy-cache': resp.headers.get('cf-cache-status') || 'MISS'
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: 'Proxy error', 
          message: error.message,
          timestamp: Date.now()
        }), {
          status: 500,
          headers: {
            'content-type': 'application/json',
            'access-control-allow-origin': '*',
          },
        });
      }
    }
    
    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        timestamp: Date.now(),
        service: 'volspike-binance-proxy',
        version: '2.0'
      }), {
        headers: {
          'content-type': 'application/json',
          'access-control-allow-origin': '*',
        },
      });
    }
    
    return new Response('Not Found', { status: 404 });
  },
}

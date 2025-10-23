/**
 * Cloudflare Worker - Binance API Proxy for VolSpike
 * 
 * This worker proxies requests to Binance Futures API to bypass regional restrictions.
 * Deploy this on Cloudflare Workers (free tier: 100,000 requests/day)
 * 
 * Setup Instructions:
 * 1. Go to https://workers.cloudflare.com/
 * 2. Create a new Worker
 * 3. Copy this code
 * 4. Deploy
 * 5. Get your Worker URL (e.g., https://volspike-proxy.your-subdomain.workers.dev)
 * 6. Set BINANCE_API_BASE env var in Railway to your Worker URL
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Only allow GET requests
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Get the path from the request
    const url = new URL(request.url)
    const path = url.pathname + url.search
    
    // Build Binance Futures API URL
    const binanceUrl = `https://fapi.binance.com${path}`
    
    console.log(`Proxying request to: ${binanceUrl}`)
    
    // Forward the request to Binance with proper headers
    const binanceResponse = await fetch(binanceUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
      }
    })
    
    // Get the response body
    const body = await binanceResponse.text()
    
    // Create new response with CORS headers
    const response = new Response(body, {
      status: binanceResponse.status,
      statusText: binanceResponse.statusText,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=10', // Cache for 10 seconds
      }
    })
    
    return response
    
  } catch (error) {
    console.error('Proxy error:', error)
    return new Response(JSON.stringify({ 
      error: 'Proxy error', 
      message: error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
  }
}

// Handle OPTIONS requests for CORS
addEventListener('fetch', event => {
  if (event.request.method === 'OPTIONS') {
    event.respondWith(handleOptions(event.request))
  }
})

function handleOptions(request) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  })
}


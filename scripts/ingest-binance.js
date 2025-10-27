import fetch from "node-fetch";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const toNum = (v) => (v == null ? null : Number(v));

// Use Cloudflare Worker proxy if available, fallback to direct Binance
const BASE = process.env.BINANCE_BASE_URL || 'https://fapi.binance.com';
const TICKER_24H = `${BASE}/fapi/v1/ticker/24hr`;
const PREMIUM = `${BASE}/fapi/v1/premiumIndex`;

async function getJson(url) {
  const res = await fetch(url, { 
    headers: { 'User-Agent': 'volspike-ingest' },
    timeout: 10000 // 10 second timeout
  });
  
  if (res.status === 451) throw new Error('BINANCE_451');
  if (res.status === 429) throw new Error('BINANCE_429');
  if (!res.ok) throw new Error(`HTTP_${res.status}`);
  
  return res.json();
}

async function ingestBinanceData() {
  try {
    console.log("🔄 Starting Binance data ingestion...");
    console.log(`📡 Using base URL: ${BASE}`);
    
    let tickers, fundingRates;
    
    try {
      // Fetch 24h ticker data and funding rates in parallel
      [tickers, fundingRates] = await Promise.all([
        getJson(TICKER_24H),
        getJson(PREMIUM)
      ]);
    } catch (error) {
      // If we get 451 and we're not already using a proxy, try fallback
      if (String(error.message).includes('BINANCE_451') && BASE === 'https://fapi.binance.com') {
        const workerBase = process.env.WORKER_FALLBACK_BASE;
        if (workerBase) {
          console.log(`🔄 Direct Binance blocked (451), trying Worker proxy: ${workerBase}`);
          const workerTicker = `${workerBase}/fapi/v1/ticker/24hr`;
          const workerPremium = `${workerBase}/fapi/v1/premiumIndex`;
          
          [tickers, fundingRates] = await Promise.all([
            getJson(workerTicker),
            getJson(workerPremium)
          ]);
        } else {
          throw error;
        }
      } else if (String(error.message).includes('BINANCE_429')) {
        // Rate limited - wait and retry once
        console.log("⏳ Rate limited (429), waiting 2 seconds before retry...");
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));
        
        [tickers, fundingRates] = await Promise.all([
          getJson(TICKER_24H),
          getJson(PREMIUM)
        ]);
      } else {
        throw error;
      }
    }
    
    // Create funding rate map
    const fundingMap = new Map(
      fundingRates.map(rate => [rate.symbol, parseFloat(rate.lastFundingRate)])
    );
    
    // Process and normalize data - keep only USDT pairs with good volume
    const marketData = tickers
      .filter(ticker => 
        ticker.symbol.endsWith('USDT') && 
        parseFloat(ticker.quoteVolume) > 1000000 // Filter out low volume pairs
      )
      .map(ticker => {
        const price = parseFloat(ticker.lastPrice);
        const volume24h = parseFloat(ticker.quoteVolume);
        const volumeChange = calculateVolumeChange(ticker);
        const fundingRate = fundingMap.get(ticker.symbol) || 0;
        
        return {
          symbol: ticker.symbol,
          price,
          volume24h,
          volumeChange,
          fundingRate,
          openInterest: 0, // Will be fetched separately if needed
          timestamp: Date.now(),
        };
      })
      .sort((a, b) => b.volume24h - a.volume24h); // Sort by volume descending
    
    const now = Date.now();
    
    // Store in Redis with appropriate TTL
    await redis.setex("market:data", 300, JSON.stringify(marketData)); // 5 minutes TTL
    await redis.setex("market:lastUpdate", 600, now.toString()); // 10 minutes TTL
    
    // Store individual symbols for faster lookups
    for (const item of marketData.slice(0, 50)) { // Store top 50 symbols individually
      await redis.setex(`market:symbol:${item.symbol}`, 300, JSON.stringify(item));
    }
    
    // Update heartbeat
    await redis.setex("ingestion:heartbeat", 600, now.toString());
    await redis.del("ingestion:last_error"); // Clear any previous errors
    
    console.log(`✅ Successfully ingested ${marketData.length} market data points`);
    console.log(`📊 Top 5 by volume: ${marketData.slice(0, 5).map(x => x.symbol).join(', ')}`);
    
  } catch (error) {
    console.error("❌ Ingestion failed:", error);
    
    // Store error for debugging
    await redis.setex("ingestion:last_error", 1800, String(error).slice(0, 200));
    
    throw error;
  }
}

function calculateVolumeChange(ticker) {
  try {
    const currentVolume = parseFloat(ticker.quoteVolume);
    const previousVolume = parseFloat(ticker.prevClosePrice) * parseFloat(ticker.count);
    
    if (previousVolume === 0) return 0;
    
    return ((currentVolume - previousVolume) / previousVolume) * 100;
  } catch (error) {
    return 0;
  }
}

// Run the ingestion
ingestBinanceData()
  .then(() => {
    console.log("🎉 Ingestion completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Ingestion failed:", error);
    process.exit(1);
  });

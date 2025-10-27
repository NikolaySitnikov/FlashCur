import fetch from "node-fetch";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const toNum = (v) => (v == null ? null : Number(v));

async function ingestBinanceData() {
  try {
    console.log("🔄 Starting Binance data ingestion...");
    
    // Fetch 24h ticker data for all perpetual futures
    const tickerResponse = await fetch("https://fapi.binance.com/fapi/v1/ticker/24hr");
    if (!tickerResponse.ok) {
      throw new Error(`Binance API error: ${tickerResponse.status}`);
    }
    const tickers = await tickerResponse.json();
    
    // Fetch funding rates
    const fundingResponse = await fetch("https://fapi.binance.com/fapi/v1/premiumIndex");
    if (!fundingResponse.ok) {
      throw new Error(`Binance funding API error: ${fundingResponse.status}`);
    }
    const fundingRates = await fundingResponse.json();
    
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

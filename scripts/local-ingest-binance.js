#!/usr/bin/env node

// Local Binance ingestion script for Plan B
// Run this from your residential IP in Mexico

import fetch from 'node-fetch';

// Your new Upstash Redis credentials
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function fetchBinanceData() {
    console.log('🔄 Fetching Binance data from residential IP (Mexico)...');

    try {
        const response = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        });

        console.log(`📊 Response status: ${response.status}`);

        if (!response.ok) {
            throw new Error(`Binance API error: ${response.status}`);
        }

        const data = await response.json();
        console.log(`✅ Got ${data.length} tickers from Binance`);

        // Filter and shape data
        const marketData = data
            .filter(x => x.symbol.endsWith('USDT') && parseFloat(x.quoteVolume) > 1000000)
            .map(x => ({
                symbol: x.symbol,
                price: parseFloat(x.lastPrice),
                volume24h: parseFloat(x.quoteVolume),
                change24h: parseFloat(x.priceChangePercent) || 0,
                fundingRate: 0, // Will be fetched separately if needed
                openInterest: 0,
                timestamp: Date.now(),
            }))
            .sort((a, b) => b.volume24h - a.volume24h);

        console.log(`✅ Processed ${marketData.length} market data points`);

        // Store in Upstash Redis
        await storeInRedis(marketData);

        return marketData;

    } catch (error) {
        console.error('❌ Error fetching Binance data:', error.message);
        throw error;
    }
}

async function storeInRedis(marketData) {
    if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
        console.error('❌ Missing Redis credentials');
        return;
    }

    try {
        console.log('🔄 Testing Redis connection...');
        console.log('Redis URL:', UPSTASH_REDIS_REST_URL);
        console.log('Redis Token (first 20 chars):', UPSTASH_REDIS_REST_TOKEN.substring(0, 20) + '...');

        // Test Redis connection with a simple GET request
        console.log('🔍 Testing Redis connection...');
        const testResponse = await fetch(`${UPSTASH_REDIS_REST_URL}/get/test`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
            }
        });

        console.log('Test response status:', testResponse.status);
        if (!testResponse.ok) {
            const errorText = await testResponse.text();
            console.log('Test response error:', errorText);
            console.log('❌ Redis connection failed - check your credentials');
            return;
        }

        console.log('✅ Redis connection successful!');

        const now = Date.now();

        // Store market data
        console.log('📤 Storing market data...');
        const dataResponse = await fetch(`${UPSTASH_REDIS_REST_URL}/set/market:data`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(marketData)
        });

        console.log('Data response status:', dataResponse.status);
        if (!dataResponse.ok) {
            const errorText = await dataResponse.text();
            console.log('Data response error:', errorText);
        }

        // Store last update timestamp
        console.log('📤 Storing timestamp...');
        const timestampResponse = await fetch(`${UPSTASH_REDIS_REST_URL}/set/market:lastUpdate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
                'Content-Type': 'text/plain'
            },
            body: String(now)
        });

        console.log('Timestamp response status:', timestampResponse.status);
        if (!timestampResponse.ok) {
            const errorText = await timestampResponse.text();
            console.log('Timestamp response error:', errorText);
        }

        // Update heartbeat
        console.log('📤 Storing heartbeat...');
        const heartbeatResponse = await fetch(`${UPSTASH_REDIS_REST_URL}/set/ingestion:heartbeat`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
                'Content-Type': 'text/plain'
            },
            body: String(now)
        });

        console.log('Heartbeat response status:', heartbeatResponse.status);
        if (!heartbeatResponse.ok) {
            const errorText = await heartbeatResponse.text();
            console.log('Heartbeat response error:', errorText);
        }

        if (dataResponse.ok && timestampResponse.ok && heartbeatResponse.ok) {
            console.log(`✅ Successfully stored ${marketData.length} data points in Redis`);
        } else {
            console.error('❌ Failed to store data in Redis');
        }

    } catch (error) {
        console.error('❌ Redis storage error:', error.message);
        console.error('Full error:', error);
    }
}

// Run the ingestion
fetchBinanceData()
    .then(() => {
        console.log('✅ Ingestion completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Ingestion failed:', error.message);
        process.exit(1);
    });

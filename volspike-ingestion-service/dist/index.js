"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("./lib/logger");
const redis_1 = require("./lib/redis");
const bullmq_1 = require("./lib/bullmq");
const binance_websocket_1 = require("./services/binance-websocket");
const alert_processor_1 = require("./services/alert-processor");
const market_data_processor_1 = require("./services/market-data-processor");
const logger = (0, logger_1.createLogger)();
// Initialize Prisma
exports.prisma = new client_1.PrismaClient();
// Initialize Redis
const redis = (0, redis_1.setupRedis)();
// Initialize BullMQ
const { alertQueue, marketDataQueue } = (0, bullmq_1.setupBullMQ)(redis);
// Initialize services
const binanceClient = new binance_websocket_1.BinanceWebSocketClient();
const alertProcessor = new alert_processor_1.AlertProcessor(exports.prisma, redis, alertQueue);
const marketDataProcessor = new market_data_processor_1.MarketDataProcessor(exports.prisma, redis, marketDataQueue);
// Main ingestion service
class IngestionService {
    constructor() {
        this.isRunning = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 3000;
    }
    async start() {
        try {
            logger.info('🚀 Starting VolSpike Ingestion Service');
            // Start BullMQ workers
            await this.startWorkers();
            // Start Binance WebSocket connection
            await this.startBinanceConnection();
            this.isRunning = true;
            logger.info('✅ Ingestion service started successfully');
        }
        catch (error) {
            logger.error('❌ Failed to start ingestion service:', error);
            process.exit(1);
        }
    }
    async startWorkers() {
        // Start alert processing worker
        alertProcessor.startWorker();
        logger.info('📊 Alert processor worker started');
        // Start market data processing worker
        marketDataProcessor.startWorker();
        logger.info('📈 Market data processor worker started');
    }
    async startBinanceConnection() {
        try {
            await binanceClient.connect();
            // Handle market data updates
            binanceClient.on('ticker', async (data) => {
                try {
                    // Process and normalize data
                    const normalizedData = this.normalizeTickerData(data);
                    // Store in Redis cache
                    await redis.setex(`market:data`, 15, // 15 seconds TTL
                    JSON.stringify(normalizedData));
                    // Store in Redis for specific symbols
                    for (const item of normalizedData) {
                        await redis.setex(`market:symbol:${item.symbol}`, 15, JSON.stringify(item));
                    }
                    // Publish to Redis pub/sub for real-time updates
                    await redis.publish('market:updates', JSON.stringify(normalizedData));
                    // Queue for database storage
                    await marketDataQueue.add('store-market-data', {
                        data: normalizedData,
                        timestamp: Date.now(),
                    });
                    // Check for volume spikes
                    await this.checkVolumeSpikes(normalizedData);
                }
                catch (error) {
                    logger.error('Error processing ticker data:', error);
                }
            });
            // Handle funding rate updates
            binanceClient.on('funding', async (data) => {
                try {
                    // Process funding rate data
                    const normalizedData = this.normalizeFundingData(data);
                    // Update market data with funding rates
                    for (const item of normalizedData) {
                        await redis.setex(`market:symbol:${item.symbol}`, 15, JSON.stringify(item));
                    }
                }
                catch (error) {
                    logger.error('Error processing funding data:', error);
                }
            });
            binanceClient.on('error', (error) => {
                logger.error('Binance WebSocket error:', error);
                this.handleReconnection();
            });
            binanceClient.on('close', () => {
                logger.warn('Binance WebSocket connection closed');
                this.handleReconnection();
            });
        }
        catch (error) {
            logger.error('Failed to start Binance connection:', error);
            throw error;
        }
    }
    normalizeTickerData(data) {
        return data
            .filter(item => item.symbol.endsWith('USDT'))
            .map(item => ({
            symbol: item.symbol,
            price: parseFloat(item.lastPrice),
            volume24h: parseFloat(item.quoteVolume),
            volumeChange: this.calculateVolumeChange(item),
            fundingRate: 0, // Will be updated by funding rate stream
            openInterest: 0, // Would need separate API call
            timestamp: Date.now(),
        }))
            .filter(item => item.volume24h > 1000000) // Filter low volume
            .sort((a, b) => b.volume24h - a.volume24h);
    }
    normalizeFundingData(data) {
        return data.map(item => ({
            symbol: item.symbol,
            fundingRate: parseFloat(item.lastFundingRate),
            timestamp: Date.now(),
        }));
    }
    calculateVolumeChange(ticker) {
        try {
            const currentPrice = parseFloat(ticker.lastPrice);
            const openPrice = parseFloat(ticker.openPrice);
            return ((currentPrice - openPrice) / openPrice) * 100;
        }
        catch (error) {
            return 0;
        }
    }
    async checkVolumeSpikes(marketData) {
        try {
            for (const item of marketData) {
                // Get historical volume data
                const historicalData = await this.getHistoricalVolume(item.symbol);
                if (historicalData.length < 2)
                    continue;
                // Calculate volume spike
                const currentVolume = item.volume24h;
                const avgVolume = historicalData.reduce((sum, d) => sum + d.volume24h, 0) / historicalData.length;
                const volumeMultiplier = currentVolume / avgVolume;
                // Check if volume spike threshold is met
                if (volumeMultiplier >= 3.0 && currentVolume >= 1000000) {
                    // Queue alert processing
                    await alertQueue.add('process-volume-spike', {
                        symbol: item.symbol,
                        currentVolume,
                        avgVolume,
                        volumeMultiplier,
                        timestamp: Date.now(),
                    });
                }
            }
        }
        catch (error) {
            logger.error('Error checking volume spikes:', error);
        }
    }
    async getHistoricalVolume(symbol) {
        try {
            // Get historical data from Redis cache
            const cached = await redis.get(`historical:${symbol}`);
            if (cached) {
                return JSON.parse(cached);
            }
            // Fallback to database
            const contract = await exports.prisma.contract.findUnique({
                where: { symbol },
            });
            if (!contract)
                return [];
            const historical = await exports.prisma.marketSnapshot.findMany({
                where: { contractId: contract.id },
                orderBy: { timestamp: 'desc' },
                take: 10,
            });
            return historical;
        }
        catch (error) {
            logger.error(`Error getting historical volume for ${symbol}:`, error);
            return [];
        }
    }
    handleReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error('Max reconnection attempts reached. Exiting.');
            process.exit(1);
        }
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        setTimeout(async () => {
            try {
                await this.startBinanceConnection();
                this.reconnectAttempts = 0;
                logger.info('✅ Reconnected successfully');
            }
            catch (error) {
                logger.error('Reconnection failed:', error);
                this.handleReconnection();
            }
        }, delay);
    }
    async stop() {
        logger.info('🛑 Stopping ingestion service');
        this.isRunning = false;
        await binanceClient.disconnect();
        await alertProcessor.stopWorker();
        await marketDataProcessor.stopWorker();
        await exports.prisma.$disconnect();
        logger.info('✅ Ingestion service stopped');
    }
}
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    await ingestionService.stop();
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    await ingestionService.stop();
    process.exit(0);
});
// Start the service
const ingestionService = new IngestionService();
ingestionService.start().catch(error => {
    logger.error('Failed to start ingestion service:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map
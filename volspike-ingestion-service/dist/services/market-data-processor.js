"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketDataProcessor = void 0;
const bullmq_1 = require("bullmq");
const logger_1 = require("../lib/logger");
const logger = (0, logger_1.createLogger)();
class MarketDataProcessor {
    constructor(prisma, redis, marketDataQueue) {
        this.prisma = prisma;
        this.redis = redis;
        this.marketDataQueue = marketDataQueue;
        this.worker = null;
    }
    startWorker() {
        this.worker = new bullmq_1.Worker('market-data', async (job) => {
            const { name, data } = job;
            switch (name) {
                case 'store-market-data':
                    await this.storeMarketData(data);
                    break;
                case 'update-contracts':
                    await this.updateContracts(data);
                    break;
                default:
                    logger.warn(`Unknown job type: ${name}`);
            }
        }, {
            connection: this.redis,
            concurrency: 3,
        });
        this.worker.on('completed', (job) => {
            logger.info(`Market data job ${job.id} completed`);
        });
        this.worker.on('failed', (job, err) => {
            logger.error(`Market data job ${job?.id} failed:`, err);
        });
        logger.info('Market data processor worker started');
    }
    async stopWorker() {
        if (this.worker) {
            await this.worker.close();
            this.worker = null;
        }
    }
    async storeMarketData(data) {
        try {
            const { data: marketData, timestamp } = data;
            // Batch insert market snapshots
            const snapshots = [];
            for (const item of marketData) {
                // Get or create contract
                let contract = await this.prisma.contract.findUnique({
                    where: { symbol: item.symbol },
                });
                if (!contract) {
                    contract = await this.prisma.contract.create({
                        data: {
                            symbol: item.symbol,
                            precision: 2,
                        },
                    });
                }
                snapshots.push({
                    contractId: contract.id,
                    price: item.price,
                    volume24h: item.volume24h,
                    fundingRate: item.fundingRate,
                    openInterest: item.openInterest,
                    timestamp: new Date(timestamp),
                });
            }
            // Batch insert
            await this.prisma.marketSnapshot.createMany({
                data: snapshots,
                skipDuplicates: true,
            });
            // Update historical cache for volume spike detection
            await this.updateHistoricalCache(marketData);
            logger.info(`Stored ${snapshots.length} market snapshots`);
        }
        catch (error) {
            logger.error('Error storing market data:', error);
        }
    }
    async updateContracts(data) {
        try {
            for (const item of data) {
                await this.prisma.contract.upsert({
                    where: { symbol: item.symbol },
                    update: {
                        isActive: true,
                        precision: item.precision || 2,
                    },
                    create: {
                        symbol: item.symbol,
                        precision: item.precision || 2,
                        isActive: true,
                    },
                });
            }
            logger.info(`Updated ${data.length} contracts`);
        }
        catch (error) {
            logger.error('Error updating contracts:', error);
        }
    }
    async updateHistoricalCache(marketData) {
        try {
            for (const item of marketData) {
                const key = `historical:${item.symbol}`;
                // Get existing historical data
                const existing = await this.redis.get(key);
                let historical = existing ? JSON.parse(existing) : [];
                // Add new data point
                historical.push({
                    symbol: item.symbol,
                    volume24h: item.volume24h,
                    price: item.price,
                    timestamp: Date.now(),
                });
                // Keep only last 20 data points
                if (historical.length > 20) {
                    historical = historical.slice(-20);
                }
                // Store back to Redis
                await this.redis.setex(key, 3600, JSON.stringify(historical)); // 1 hour TTL
            }
        }
        catch (error) {
            logger.error('Error updating historical cache:', error);
        }
    }
}
exports.MarketDataProcessor = MarketDataProcessor;
//# sourceMappingURL=market-data-processor.js.map
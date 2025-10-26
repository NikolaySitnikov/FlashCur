import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
export declare class MarketDataProcessor {
    private prisma;
    private redis;
    private marketDataQueue;
    private worker;
    constructor(prisma: PrismaClient, redis: Redis, marketDataQueue: Queue);
    startWorker(): void;
    stopWorker(): Promise<void>;
    private storeMarketData;
    private updateContracts;
    private updateHistoricalCache;
}
//# sourceMappingURL=market-data-processor.d.ts.map
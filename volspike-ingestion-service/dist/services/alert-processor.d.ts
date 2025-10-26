import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
export declare class AlertProcessor {
    private prisma;
    private redis;
    private alertQueue;
    private worker;
    constructor(prisma: PrismaClient, redis: Redis, alertQueue: Queue);
    startWorker(): void;
    stopWorker(): Promise<void>;
    private processVolumeSpike;
    private sendNotification;
    private sendEmailNotification;
    private sendSMSNotification;
    private sendTelegramNotification;
    private sendDiscordNotification;
}
//# sourceMappingURL=alert-processor.d.ts.map
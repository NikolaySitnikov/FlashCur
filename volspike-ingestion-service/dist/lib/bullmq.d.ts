import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
export declare function setupBullMQ(redis: Redis): {
    alertQueue: Queue<any, any, string>;
    marketDataQueue: Queue<any, any, string>;
};
//# sourceMappingURL=bullmq.d.ts.map
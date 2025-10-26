"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupBullMQ = setupBullMQ;
const bullmq_1 = require("bullmq");
const logger_1 = require("../lib/logger");
const logger = (0, logger_1.createLogger)();
function setupBullMQ(redis) {
    // Alert processing queue
    const alertQueue = new bullmq_1.Queue('alerts', {
        connection: redis,
        defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
        },
    });
    // Market data processing queue
    const marketDataQueue = new bullmq_1.Queue('market-data', {
        connection: redis,
        defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
        },
    });
    // Queue event listeners
    alertQueue.on('error', (error) => {
        logger.error('Alert queue error:', error);
    });
    marketDataQueue.on('error', (error) => {
        logger.error('Market data queue error:', error);
    });
    logger.info('BullMQ queues initialized');
    return {
        alertQueue,
        marketDataQueue,
    };
}
//# sourceMappingURL=bullmq.js.map
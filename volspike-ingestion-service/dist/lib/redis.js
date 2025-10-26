"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRedis = setupRedis;
const ioredis_1 = require("ioredis");
const logger_1 = require("../lib/logger");
const logger = (0, logger_1.createLogger)();
function setupRedis() {
    const redis = new ioredis_1.Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
    });
    redis.on('connect', () => {
        logger.info('Redis client connected');
    });
    redis.on('error', (error) => {
        logger.error('Redis client error:', error);
    });
    return redis;
}
//# sourceMappingURL=redis.js.map
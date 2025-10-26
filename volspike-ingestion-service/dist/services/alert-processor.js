"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertProcessor = void 0;
const bullmq_1 = require("bullmq");
const logger_1 = require("../lib/logger");
const logger = (0, logger_1.createLogger)();
class AlertProcessor {
    constructor(prisma, redis, alertQueue) {
        this.prisma = prisma;
        this.redis = redis;
        this.alertQueue = alertQueue;
        this.worker = null;
    }
    startWorker() {
        this.worker = new bullmq_1.Worker('alerts', async (job) => {
            const { name, data } = job;
            switch (name) {
                case 'process-volume-spike':
                    await this.processVolumeSpike(data);
                    break;
                case 'send-notification':
                    await this.sendNotification(data);
                    break;
                default:
                    logger.warn(`Unknown job type: ${name}`);
            }
        }, {
            connection: this.redis,
            concurrency: 5,
        });
        this.worker.on('completed', (job) => {
            logger.info(`Alert job ${job.id} completed`);
        });
        this.worker.on('failed', (job, err) => {
            logger.error(`Alert job ${job?.id} failed:`, err);
        });
        logger.info('Alert processor worker started');
    }
    async stopWorker() {
        if (this.worker) {
            await this.worker.close();
            this.worker = null;
        }
    }
    async processVolumeSpike(data) {
        try {
            const { symbol, currentVolume, avgVolume, volumeMultiplier } = data;
            // Get contract
            let contract = await this.prisma.contract.findUnique({
                where: { symbol },
            });
            if (!contract) {
                contract = await this.prisma.contract.create({
                    data: {
                        symbol,
                        precision: 2,
                    },
                });
            }
            // Get users who have alerts for this symbol
            const users = await this.prisma.user.findMany({
                where: {
                    alerts: {
                        some: {
                            contractId: contract.id,
                        },
                    },
                },
                include: {
                    preferences: true,
                },
            });
            // Create alerts for each user
            for (const user of users) {
                const alert = await this.prisma.alert.create({
                    data: {
                        userId: user.id,
                        contractId: contract.id,
                        reason: 'volume_spike',
                        threshold: user.preferences?.volumeThreshold || 3.0,
                        triggeredValue: volumeMultiplier,
                    },
                });
                // Queue notification
                await this.alertQueue.add('send-notification', {
                    alertId: alert.id,
                    userId: user.id,
                    symbol,
                    volumeMultiplier,
                    currentVolume,
                    userTier: user.tier,
                });
            }
            // Publish to Redis for real-time updates
            await this.redis.publish('alerts:new', JSON.stringify({
                symbol,
                volumeMultiplier,
                currentVolume,
                timestamp: Date.now(),
            }));
            logger.info(`Volume spike processed for ${symbol}: ${volumeMultiplier}x`);
        }
        catch (error) {
            logger.error('Error processing volume spike:', error);
        }
    }
    async sendNotification(data) {
        try {
            const { alertId, userId, symbol, volumeMultiplier, currentVolume, userTier } = data;
            // Get user preferences
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                include: {
                    preferences: true,
                },
            });
            if (!user)
                return;
            const prefs = user.preferences;
            // Send notifications based on user preferences and tier
            const notifications = [];
            if (prefs?.emailAlerts) {
                notifications.push(this.sendEmailNotification(user, symbol, volumeMultiplier, currentVolume));
            }
            if (prefs?.smsAlerts && userTier === 'elite') {
                notifications.push(this.sendSMSNotification(user, symbol, volumeMultiplier, currentVolume));
            }
            if (prefs?.telegramAlerts) {
                notifications.push(this.sendTelegramNotification(user, symbol, volumeMultiplier, currentVolume));
            }
            if (prefs?.discordAlerts) {
                notifications.push(this.sendDiscordNotification(user, symbol, volumeMultiplier, currentVolume));
            }
            // Send all notifications
            await Promise.allSettled(notifications);
            // Mark alert as delivered
            await this.prisma.alert.update({
                where: { id: alertId },
                data: { isDelivered: true },
            });
            logger.info(`Notifications sent for alert ${alertId}`);
        }
        catch (error) {
            logger.error('Error sending notification:', error);
        }
    }
    async sendEmailNotification(user, symbol, volumeMultiplier, currentVolume) {
        // TODO: Implement email notification
        logger.info(`Email notification sent to ${user.email} for ${symbol}`);
    }
    async sendSMSNotification(user, symbol, volumeMultiplier, currentVolume) {
        // TODO: Implement SMS notification
        logger.info(`SMS notification sent to ${user.email} for ${symbol}`);
    }
    async sendTelegramNotification(user, symbol, volumeMultiplier, currentVolume) {
        // TODO: Implement Telegram notification
        logger.info(`Telegram notification sent to ${user.email} for ${symbol}`);
    }
    async sendDiscordNotification(user, symbol, volumeMultiplier, currentVolume) {
        // TODO: Implement Discord notification
        logger.info(`Discord notification sent to ${user.email} for ${symbol}`);
    }
}
exports.AlertProcessor = AlertProcessor;
//# sourceMappingURL=alert-processor.js.map
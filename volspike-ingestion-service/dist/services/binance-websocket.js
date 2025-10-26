"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinanceWebSocketClient = void 0;
const ws_1 = __importDefault(require("ws"));
const logger_1 = require("../lib/logger");
const events_1 = require("events");
const logger = (0, logger_1.createLogger)();
class BinanceWebSocketClient extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 3000;
        this.pingInterval = null;
    }
    async connect() {
        try {
            const wsUrl = 'wss://fstream.binance.com/ws/!ticker@arr';
            this.ws = new ws_1.default(wsUrl);
            this.ws.on('open', () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                logger.info('✅ Connected to Binance WebSocket');
                // Start ping interval
                this.startPingInterval();
            });
            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleMessage(message);
                }
                catch (error) {
                    logger.error('Error parsing WebSocket message:', error);
                }
            });
            this.ws.on('close', (code, reason) => {
                this.isConnected = false;
                this.stopPingInterval();
                logger.warn(`Binance WebSocket closed: ${code} - ${reason}`);
                this.handleReconnection();
            });
            this.ws.on('error', (error) => {
                logger.error('Binance WebSocket error:', error);
                this.handleReconnection();
            });
        }
        catch (error) {
            logger.error('Failed to connect to Binance WebSocket:', error);
            throw error;
        }
    }
    async disconnect() {
        this.stopPingInterval();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        logger.info('Disconnected from Binance WebSocket');
    }
    handleMessage(message) {
        try {
            if (Array.isArray(message)) {
                // Handle ticker data
                this.emit('ticker', message);
            }
            else if (message.e === '24hrTicker') {
                // Handle individual ticker updates
                this.emit('ticker', [message]);
            }
            else if (message.e === 'markPriceUpdate') {
                // Handle funding rate updates
                this.emit('funding', [message]);
            }
        }
        catch (error) {
            logger.error('Error handling WebSocket message:', error);
        }
    }
    startPingInterval() {
        this.pingInterval = setInterval(() => {
            if (this.ws && this.isConnected) {
                this.ws.ping();
            }
        }, 30000); // Ping every 30 seconds
    }
    stopPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    handleReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error('Max reconnection attempts reached');
            return;
        }
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        setTimeout(async () => {
            try {
                await this.connect();
            }
            catch (error) {
                logger.error('Reconnection failed:', error);
                this.handleReconnection();
            }
        }, delay);
    }
    get connected() {
        return this.isConnected;
    }
}
exports.BinanceWebSocketClient = BinanceWebSocketClient;
//# sourceMappingURL=binance-websocket.js.map
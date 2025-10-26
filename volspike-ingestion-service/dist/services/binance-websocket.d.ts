import { EventEmitter } from 'events';
export declare class BinanceWebSocketClient extends EventEmitter {
    private ws;
    private isConnected;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    private pingInterval;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    private handleMessage;
    private startPingInterval;
    private stopPingInterval;
    private handleReconnection;
    get connected(): boolean;
}
//# sourceMappingURL=binance-websocket.d.ts.map
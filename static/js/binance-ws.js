/**
 * Binance WebSocket Manager for VolSpike
 * 
 * Handles real-time data streaming from Binance Futures WebSocket API
 * Streams: !ticker@arr (24h tickers) and !markPrice@arr (mark prices + funding rates)
 */

class BinanceWS {
    constructor(streams = ['!ticker@arr', '!markPrice@arr'], base = 'wss://fstream.binance.com/stream?streams=') {
        this.url = base + streams.join('/');
        console.log('🔌 BinanceWS constructor - streams:', streams);
        console.log('🔌 BinanceWS constructor - base URL:', base);
        console.log('🔌 BinanceWS constructor - final URL:', this.url);
        this.ws = null;
        this.listeners = new Set();
        this.backoff = 1000; // start with 1s
        this.stopped = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
    }

    start() {
        this.stopped = false;
        this.reconnectAttempts = 0;
        this.connect();
    }

    stop() {
        this.stopped = true;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    on(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    connect() {
        if (this.stopped) return;

        try {
            console.log('🔌 Creating WebSocket connection to:', this.url);
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                console.log('🔌 Binance WebSocket connected to:', this.url);
                console.log('🔌 WebSocket readyState:', this.ws.readyState);
                this.backoff = 1000; // reset backoff on successful connection
                this.reconnectAttempts = 0;
            };

            this.ws.onmessage = (event) => {
                try {
                    console.log('🔌 Raw WebSocket message received, length:', event.data.length);
                    const message = JSON.parse(event.data);
                    console.log('🔌 Binance WebSocket received:', message.stream || 'unknown', 'data length:', message.data?.length || 0);
                    this.listeners.forEach(fn => fn(message));
                } catch (error) {
                    console.error('❌ Error parsing WebSocket message:', error);
                    console.error('❌ Raw message data:', event.data);
                }
            };

            this.ws.onclose = (event) => {
                console.log('🔌 Binance WebSocket closed:', event.code, event.reason);
                if (!this.stopped) {
                    this.reconnect();
                }
            };

            this.ws.onerror = (error) => {
                console.error('🔌 Binance WebSocket error:', error);
                this.ws?.close();
            };

        } catch (error) {
            console.error('Error creating WebSocket connection:', error);
            this.reconnect();
        }
    }

    reconnect() {
        if (this.stopped || this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const wait = this.backoff + Math.floor(Math.random() * 500); // add jitter

        console.log(`🔄 Reconnecting in ${wait}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(() => {
            if (!this.stopped) {
                this.connect();
            }
        }, wait);

        // Exponential backoff with max of 15s
        this.backoff = Math.min(this.backoff * 2, 15000);
    }

    getConnectionState() {
        if (!this.ws) return 'disconnected';
        switch (this.ws.readyState) {
            case WebSocket.CONNECTING: return 'connecting';
            case WebSocket.OPEN: return 'connected';
            case WebSocket.CLOSING: return 'closing';
            case WebSocket.CLOSED: return 'disconnected';
            default: return 'unknown';
        }
    }
}

// Export for use in other modules
window.BinanceWS = BinanceWS;

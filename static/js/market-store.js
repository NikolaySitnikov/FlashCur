/**
 * Market Data Store for VolSpike
 * 
 * Manages real-time market data state from Binance WebSocket streams
 * Handles ticker data, mark prices, funding rates, and volume calculations
 */

class MarketStore {
    constructor() {
        this.state = {
            bySymbol: {},
            connectionState: 'disconnected',
            lastUpdate: null
        };
        this.listeners = new Set();
        
        // Volume calculation buffers
        this.volumeBuffers = {}; // last 60 deltas per symbol
        this.lastQuoteVolume = {}; // last 24h quote volume per symbol
    }

    // Subscribe to state changes
    subscribe(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    // Get current state
    getState() {
        return { ...this.state };
    }

    // Get symbols filtered by criteria
    getSymbols(filter = {}) {
        const { endsWith = 'USDT', limit = 200, sortBy = 'vol24hQuote' } = filter;
        
        return Object.entries(this.state.bySymbol)
            .filter(([symbol, data]) => symbol.endsWith(endsWith))
            .sort(([, a], [, b]) => {
                if (sortBy === 'vol24hQuote') {
                    return (b.vol24hQuote || 0) - (a.vol24hQuote || 0);
                }
                return 0;
            })
            .slice(0, limit)
            .map(([symbol, data]) => ({ symbol, ...data }));
    }

    // Update connection state
    setConnectionState(state) {
        this.state.connectionState = state;
        this.notify();
    }

    // Update ticker data from !ticker@arr stream
    updateTickers(tickers) {
        const now = Date.now();
        let hasChanges = false;

        for (const ticker of tickers) {
            const symbol = ticker.s;
            const lastPrice = parseFloat(ticker.c);
            const changePct = parseFloat(ticker.P);
            const vol24hQuote = parseFloat(ticker.q);
            const vol24hBase = parseFloat(ticker.v);

            if (!this.state.bySymbol[symbol]) {
                this.state.bySymbol[symbol] = {};
            }

            const current = this.state.bySymbol[symbol];
            const updated = {
                ...current,
                symbol,
                lastPrice,
                changePct,
                vol24hQuote,
                vol24hBase,
                lastUpdate: now
            };

            // Calculate 1h volume if we have previous data
            if (current.vol24hQuote !== undefined) {
                const delta = vol24hQuote - current.vol24hQuote;
                if (delta >= 0) { // ignore day wrap
                    this.updateVolumeCalculation(symbol, delta);
                }
            }

            this.state.bySymbol[symbol] = updated;
            hasChanges = true;
        }

        if (hasChanges) {
            this.state.lastUpdate = now;
            this.notify();
        }
    }

    // Update mark prices and funding rates from !markPrice@arr stream
    updateMarkPrices(markPrices) {
        const now = Date.now();
        let hasChanges = false;

        for (const mark of markPrices) {
            const symbol = mark.s;
            const markPrice = parseFloat(mark.p);
            const fundingRate = mark.r ? parseFloat(mark.r) : null;

            if (!this.state.bySymbol[symbol]) {
                this.state.bySymbol[symbol] = {};
            }

            const current = this.state.bySymbol[symbol];
            const updated = {
                ...current,
                markPrice,
                fundingRate,
                lastUpdate: now
            };

            this.state.bySymbol[symbol] = updated;
            hasChanges = true;
        }

        if (hasChanges) {
            this.state.lastUpdate = now;
            this.notify();
        }
    }

    // Update volume calculation for 1h rolling volume
    updateVolumeCalculation(symbol, delta) {
        if (!this.volumeBuffers[symbol]) {
            this.volumeBuffers[symbol] = [];
        }

        const buffer = this.volumeBuffers[symbol];
        buffer.push(Math.max(0, delta));
        
        // Keep only last 60 updates (assuming ~1/min tick cadence)
        if (buffer.length > 60) {
            buffer.shift();
        }

        // Calculate 1h volume
        const vol1hQuote = buffer.reduce((sum, val) => sum + val, 0);
        
        // Calculate spike detection
        const spike3x = this.calculateSpike(symbol, vol1hQuote);

        // Update state
        if (this.state.bySymbol[symbol]) {
            this.state.bySymbol[symbol] = {
                ...this.state.bySymbol[symbol],
                vol1hQuote,
                spike3x
            };
        }
    }

    // Calculate 3x spike detection using median baseline
    calculateSpike(symbol, vol1hQuote) {
        const buffer = this.volumeBuffers[symbol];
        if (!buffer || buffer.length < 30) return false; // need some history

        // Group into 10-minute blocks
        const blockSize = 10;
        const blocks = [];
        
        for (let i = 0; i + blockSize <= buffer.length; i += blockSize) {
            const blockSum = buffer.slice(i, i + blockSize).reduce((sum, val) => sum + val, 0);
            blocks.push(blockSum);
        }

        // Use median of previous blocks (excluding the last one)
        const historicalBlocks = blocks.slice(0, -1);
        if (historicalBlocks.length === 0) return false;

        const sorted = [...historicalBlocks].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];

        return median > 0 && vol1hQuote >= 3 * median;
    }

    // Notify all listeners of state changes
    notify() {
        this.listeners.forEach(fn => fn(this.getState()));
    }

    // Get spike alerts (for notifications)
    getSpikeAlerts() {
        return Object.entries(this.state.bySymbol)
            .filter(([, data]) => data.spike3x)
            .map(([symbol, data]) => ({
                symbol,
                vol1hQuote: data.vol1hQuote,
                lastPrice: data.lastPrice,
                changePct: data.changePct
            }));
    }

    // Clear all data
    clear() {
        this.state.bySymbol = {};
        this.volumeBuffers = {};
        this.lastQuoteVolume = {};
        this.state.lastUpdate = null;
        this.notify();
    }
}

// Create global store instance
window.marketStore = new MarketStore();

// Export for use in other modules
window.MarketStore = MarketStore;

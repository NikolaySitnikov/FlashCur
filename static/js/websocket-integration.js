(function (global) {
    function formatCompactUsd(value) {
        if (!Number.isFinite(value)) return '-';
        const abs = Math.abs(value);
        if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
        if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
        if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
        if (abs >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
        return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }

    function formatPrice(value) {
        if (!Number.isFinite(value)) return '-';
        if (value < 0.01) return `$${value.toFixed(6)}`;
        if (value < 1) return `$${value.toFixed(4)}`;
        if (value < 100) return `$${value.toFixed(3)}`;
        return `$${value.toFixed(2)}`;
    }

    function formatFundingRate(value) {
        if (!Number.isFinite(value)) return 'N/A';
        return `${value.toFixed(4)}%`;
    }

    const MIN_VOLUME_USD = 100_000_000;

    class WebSocketIntegration {
        constructor() {
            this.store = global.marketStore;
            this.unsubscribe = null;
            this.ws = null;
            this.wsUnsubscribe = null;
            this.wsStatusUnsubscribe = null;
            this.isConnected = false;
            this._lastRows = [];
            this.hasHydrated = false;
            this.liveUpdatesEnabled = false;
        }

        init() {
            if (!this.store && global.marketStore) {
                this.store = global.marketStore;
            }

            this.subscribeToStore();
            const tier = typeof global.userTier === 'number' ? global.userTier : 0;
            const features = global.userFeatures || {};
            this.applyPermissions({ tier, features, startWebsocket: true });
            this.updateScrollIndicators();
        }

        destroy() {
            if (typeof this.unsubscribe === 'function') {
                this.unsubscribe();
                this.unsubscribe = null;
            }
            this.teardownWebSocket();
            this.isConnected = false;
            this.hasHydrated = false;
            this.liveUpdatesEnabled = false;
        }

        applyPermissions({ tier = 0, features = {}, startWebsocket = false } = {}) {
            const allowLive = this.shouldEnableLiveUpdates(tier, features);
            const previouslyEnabled = this.liveUpdatesEnabled;
            this.liveUpdatesEnabled = allowLive;

            if (!allowLive) {
                if (previouslyEnabled) {
                    this.teardownWebSocket();
                }
                this.handleWsStatus('disabled');
                return;
            }

            if (allowLive && startWebsocket && !previouslyEnabled) {
                this.initializeWebSocket();
            }
        }

        shouldEnableLiveUpdates(tier, features) {
            if (features && typeof features.real_time_updates === 'boolean') {
                return Boolean(features.real_time_updates);
            }
            if (typeof tier === 'number') {
                return tier >= 2;
            }
            return false;
        }

        initializeWebSocket() {
            if (!this.liveUpdatesEnabled) {
                return;
            }

            if (this.ws) {
                this.teardownWebSocket();
            }

            const WsCtor = global.BinanceWS;
            if (typeof WsCtor !== 'function') {
                console.warn('🟡 BinanceWS class not available; skipping live updates.');
                this.handleWsStatus('disabled');
                return;
            }

            this.handleWsStatus('connecting');
            this.ws = new WsCtor(['!ticker@arr', '!markPrice@arr']);
            this.wsUnsubscribe = this.ws.on(message => this.handleWsMessage(message));
            this.wsStatusUnsubscribe = this.ws.onStatusChange(status => this.handleWsStatus(status));
            try {
                this.ws.start();
                global.binanceWsClient = this.ws;
            } catch (error) {
                console.error('❌ Failed to start Binance WebSocket:', error);
                this.handleWsStatus('disconnected');
            }
        }

        teardownWebSocket() {
            if (typeof this.wsUnsubscribe === 'function') {
                this.wsUnsubscribe();
                this.wsUnsubscribe = null;
            }

            if (typeof this.wsStatusUnsubscribe === 'function') {
                this.wsStatusUnsubscribe();
                this.wsStatusUnsubscribe = null;
            }

            if (this.ws && typeof this.ws.stop === 'function') {
                try {
                    this.ws.stop();
                } catch (error) {
                    console.error('❌ Failed to stop Binance WebSocket:', error);
                }
            }

            this.ws = null;
        }

        handleWsStatus(status) {
            const normalized = (status || '').toLowerCase();

            this.isConnected = normalized === 'connected';

            if (this.store && typeof this.store.setConnectionState === 'function') {
                this.store.setConnectionState(normalized);
            } else {
                this.updateConnectionIndicator(normalized);
            }
        }

        handleWsMessage(message) {
            if (!message || typeof message !== 'object') {
                return;
            }

            const streamName = String(
                message.stream ||
                message.topic ||
                message.channel ||
                message.event ||
                ''
            ).toLowerCase();

            const payload = this.resolvePayloadArray(message);

            if (!payload.length) {
                if (!global.__wsSeenEmpty) {
                    global.__wsSeenEmpty = true;
                    console.warn('WS message had no resolvable payload shape:', message);
                }
                return;
            }

            if (streamName.includes('ticker')) {
                if (this.store && typeof this.store.updateTickers === 'function') {
                    this.store.updateTickers(payload);
                }
                return;
            }

            if (streamName.includes('markprice')) {
                if (this.store && typeof this.store.updateMarkPrices === 'function') {
                    this.store.updateMarkPrices(payload);
                }
                return;
            }

            const eventType = String(message.e || message.event || '').toLowerCase();
            if (eventType === '24hrticker') {
                if (this.store && typeof this.store.updateTickers === 'function') {
                    this.store.updateTickers(payload);
                }
                return;
            }

            const looksLikeMark = (
                eventType.includes('mark') ||
                (payload[0] && typeof payload[0] === 'object' && 'p' in payload[0] && 's' in payload[0])
            );
            if (looksLikeMark) {
                if (this.store && typeof this.store.updateMarkPrices === 'function') {
                    this.store.updateMarkPrices(payload);
                }
            }
        }

        resolvePayloadArray(message) {
            if (!message) return [];

            const candidates = [
                message.data,
                message.data?.data,
                message.payload,
                message.payload?.data,
                message.result,
                message.params?.data,
                message
            ];

            for (const candidate of candidates) {
                if (Array.isArray(candidate)) {
                    return candidate;
                }

                if (candidate && typeof candidate === 'object') {
                    const hasSymbol = ('s' in candidate) || ('symbol' in candidate);
                    const hasAnyFields = (
                        ('c' in candidate) ||
                        ('p' in candidate) ||
                        ('q' in candidate) ||
                        ('v' in candidate) ||
                        ('r' in candidate) ||
                        ('fundingRate' in candidate)
                    );
                    if (hasSymbol && hasAnyFields) {
                        return [candidate];
                    }
                }
            }

            return [];
        }

        subscribeToStore() {
            if (!this.store || typeof this.store.subscribe !== 'function') {
                console.warn('🟡 marketStore not available; real-time updates disabled.');
                return;
            }

            this.unsubscribe = this.store.subscribe((state) => this.handleStoreUpdate(state));
            if (typeof this.store.getState === 'function') {
                this.handleStoreUpdate(this.store.getState());
            }
        }

        handleStoreUpdate(state) {
            if (!state) return;

            this.updateConnectionIndicator(state.connectionState || 'connected');

            const rows = this.extractRows(state);
            if (!rows.length) {
                return;
            }

            this._lastRows = rows;

            const hasProMetrics = Boolean(
                (global.userFeatures && global.userFeatures.additional_metrics) ||
                (typeof global.userTier === 'number' && global.userTier >= 1)
            );

            if (global.marketTable && typeof global.marketTable.ingestRows === 'function') {
                global.marketTable.ingestRows(rows, { hasProMetrics });
                this.hasHydrated = true;
            } else {
                const sortedRows = this.applySorting(rows);
                const displayRows = Array.isArray(sortedRows) ? sortedRows : rows;

                if (Array.isArray(displayRows) && typeof global.renderSortedTables === 'function') {
                    global.renderSortedTables(displayRows);
                }

                if (typeof syncTableCaches === 'function') {
                    syncTableCaches(displayRows, rows);
                } else {
                    global.dataCache = Array.isArray(displayRows) ? [...displayRows] : [];
                    global.originalDataCache = Array.isArray(rows) ? [...rows] : [];
                }

                if (typeof updateSortIndicators === 'function') {
                    updateSortIndicators();
                }

                if (!this.hasHydrated) {
                    if (typeof hideLoading === 'function') hideLoading();
                    if (typeof showDownloadButton === 'function') showDownloadButton();
                    if (typeof updateLastUpdated === 'function') updateLastUpdated();
                    this.hasHydrated = true;
                }
            }

            this.updateScrollIndicators();
        }

        extractRows(state) {
            if (!state || !state.bySymbol) return [];

            const symbols = Object.values(state.bySymbol);
            const rows = symbols
                .filter(item => item && typeof item.symbol === 'string' && item.symbol.endsWith('USDT'))
                .map(item => this.mapSymbolToRow(item))
                .filter(row => this.passesVolumeThreshold(row));

            rows.sort((a, b) => (b.volume || 0) - (a.volume || 0));
            return rows;
        }

        passesVolumeThreshold(row) {
            if (!row || !Number.isFinite(row.volume)) {
                return false;
            }
            return row.volume >= MIN_VOLUME_USD;
        }

        mapSymbolToRow(symbolState) {
            if (!symbolState || !symbolState.symbol) {
                return null;
            }

            const symbol = symbolState.symbol;
            const asset = symbol.replace(/USDT$/i, '');

            const volume = Number(symbolState.vol24hQuote);
            const price = Number(symbolState.lastPrice);
            const changePct = Number(symbolState.changePct);
            const openInterestUsd = Number(symbolState.openInterestUsd ?? symbolState.openInterestUSDT);

            let fundingRate = null;
            if (typeof symbolState.fundingRate === 'number') {
                fundingRate = symbolState.fundingRate;
            }

            return {
                asset,
                symbol,
                volume,
                volume_formatted: formatCompactUsd(volume),
                price,
                price_formatted: formatPrice(price),
                price_change_pct: Number.isFinite(changePct) ? changePct : null,
                price_change_formatted: Number.isFinite(changePct)
                    ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`
                    : '-',
                funding_rate: fundingRate,
                funding_formatted: formatFundingRate(fundingRate),
                open_interest_usd: Number.isFinite(openInterestUsd) ? openInterestUsd : null,
                open_interest_formatted: Number.isFinite(openInterestUsd) ? formatCompactUsd(openInterestUsd) : '-',
                liquidation_risk: symbolState.liquidationRisk || symbolState.liquidation_risk || '-'
            };
        }

        applySorting(data) {
            if (typeof global.applySorting === 'function') {
                return global.applySorting(Array.isArray(data) ? [...data] : []);
            }
            return Array.isArray(data) ? [...data] : [];
        }

        updateScrollIndicators() {
            const desktop = document.getElementById('tableContainer');
            const mobile = document.getElementById('mobileTableContainer');
            if (desktop) updateHorizontalOverflowState(desktop);
            if (mobile) updateHorizontalOverflowState(mobile);
        }

        updateConnectionIndicator(state) {
            const indicator = document.getElementById('connection-indicator');
            if (!indicator) return;

            const normalized = (state || '').toLowerCase();
            let display = '🟡 Connecting...';
            let color = 'text-yellow-500';

            if (normalized === 'connected') {
                display = '🟢 Live';
                color = 'text-green-500';
            } else if (normalized === 'disconnected') {
                display = '🔴 Disconnected';
                color = 'text-red-500';
            } else if (normalized === 'disabled') {
                display = '🟠 Auto refresh';
                color = 'text-yellow-500';
            }

            indicator.textContent = display;
            indicator.classList.remove('text-yellow-500', 'text-green-500', 'text-red-500');
            indicator.classList.add(color);
        }
    }

    global.WebSocketIntegration = WebSocketIntegration;

    WebSocketIntegration.prototype.updatePermissions = function updatePermissions(tier, features = {}) {
        this.applyPermissions({ tier, features, startWebsocket: true });
    };

    document.addEventListener('DOMContentLoaded', () => {
        if (!global.wsIntegration) {
            global.wsIntegration = new WebSocketIntegration();
            global.wsIntegration.init();
        }
    });
})(typeof window !== 'undefined' ? window : this);

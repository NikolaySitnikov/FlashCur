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

    class WebSocketIntegration {
        constructor() {
            this.store = global.marketStore;
            this.table = null;
            this.unsubscribe = null;
            this.isConnected = false;
            this._lastRows = [];
        }

        init() {
            this.table = global.marketTable || null;
            this.subscribeToStore();
            this.updateConnectionIndicator('connecting');
            this.isConnected = true;
            this.updateScrollIndicators();
        }

        destroy() {
            if (typeof this.unsubscribe === 'function') {
                this.unsubscribe();
                this.unsubscribe = null;
            }
            this.isConnected = false;
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

            if (this.table) {
                this.table.ingest(rows, { replaceSource: true });
                if (typeof syncTableCaches === 'function') {
                    syncTableCaches();
                }
                if (typeof syncSortStateToWindow === 'function') {
                    syncSortStateToWindow();
                }
            } else if (typeof global.renderSortedTables === 'function') {
                global.renderSortedTables(rows);
            }

            this.updateScrollIndicators();
        }

        extractRows(state) {
            if (!state || !state.bySymbol) return [];

            const symbols = Object.values(state.bySymbol);
            const rows = symbols
                .filter(item => item && typeof item.symbol === 'string' && item.symbol.endsWith('USDT'))
                .map(item => this.mapSymbolToRow(item))
                .filter(Boolean);

            rows.sort((a, b) => (b.volume || 0) - (a.volume || 0));
            return rows;
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
                // Store tracks mark funding as decimal; convert to percentage points
                fundingRate = symbolState.fundingRate * 100;
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
                return global.applySorting(data);
            }
            if (Array.isArray(data)) {
                return [...data];
            }
            return [];
        }

        updateScrollIndicators() {
            if (this.table) {
                this.table.updateOverflow();
                return;
            }

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
            }

            indicator.textContent = display;
            indicator.classList.remove('text-yellow-500', 'text-green-500', 'text-red-500');
            indicator.classList.add(color);
        }
    }

    global.WebSocketIntegration = WebSocketIntegration;

    document.addEventListener('DOMContentLoaded', () => {
        if (!global.wsIntegration) {
            global.wsIntegration = new WebSocketIntegration();
            global.wsIntegration.init();
        }
    });
})(typeof window !== 'undefined' ? window : this);

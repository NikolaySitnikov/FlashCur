/**
 * WebSocket Integration for VolSpike Dashboard
 * 
 * Connects Binance WebSocket streams to the market store
 * Handles real-time data updates and UI synchronization
 */

class WebSocketIntegration {
    constructor() {
        this.ws = null;
        this.store = window.marketStore;
        console.log('🔗 wsIntegration.store === window.marketStore ?',
            this.store === window.marketStore, this.store);
        this.isConnected = false;
        this.reconnectTimeout = null;

        // B) Paint scheduler properties
        this._paintScheduled = false;
        this._paintToken = 0;

        // C) Last non-empty rows cache
        this._lastNonEmptyRows = [];
        this.updateInterval = null;   // tier-paced UI paint timer (Free/Pro)
        this.firstPaintDone = false;  // track one-time initial paint for Free/Pro
        this.hasShownCompleteData = false;  // track whether we've painted with funding rates
        this.sampleDataShown = false;
        this.userTier = 0;            // 0=Free,1=Pro,2=Elite
        this.refreshInterval = 15 * 60 * 1000;
        this.tickerSeen = false;
        this.markSeen = false;
    }

    // B) Paint scheduler to coalesce concurrent paints
    scheduleDashboardPaint() {
        if (this._paintScheduled) return;
        this._paintScheduled = true;
        const token = ++this._paintToken;
        // Use rAF for smoother DOM work
        requestAnimationFrame(() => {
            // Only the latest token paints
            if (token === this._paintToken) {
                try {
                    this.updateDashboard();
                } finally {
                    this._paintScheduled = false;
                }
            } else {
                // a newer paint superseded this one
                this._paintScheduled = false;
            }
        });
    }

    // Initialize WebSocket connection
    init() {
        console.log('🚀 Initializing WebSocket integration...');
        console.log('🚀 init() starting. About to subscribe…', this.store);

        // Get user tier and set appropriate refresh rate
        this.getUserTierAndSetupRefresh();

        // Subscribe to store changes for real-time updates
        this.unsubscribe = this.store.subscribe((state) => {
            console.log('📥 Store subscription callback ENTERED. state.lastUpdate:', state.lastUpdate);
            console.log('📥 firstPaintDone:', this.firstPaintDone, 'hasShownCompleteData:', this.hasShownCompleteData, 'userTier:', this.userTier);
            // Update connection indicator based on store state
            this.updateConnectionIndicator(state.connectionState);

            // A) Calculate data completeness telemetry
            const values = Object.values(state.bySymbol);
            const total = values.length;
            const withFunding = values.filter(s => s.fundingRate != null).length;
            const withPrice = values.filter(s => Number.isFinite(s.lastPrice)).length;
            const withVol = values.filter(s => Number.isFinite(s.vol24hQuote)).length;

            const pctPrice = total ? withPrice / total : 0;
            const pctVol = total ? withVol / total : 0;
            const hasFundingRates = withFunding > 0;
            // Paint as soon as both streams have arrived at least once
            const datasetComplete = this.tickerSeen && this.markSeen;

            // F) Add focused diagnostics
            console.log('🧮 completeness',
                {
                    total, withFunding, withPrice, withVol,
                    pctPrice: pctPrice.toFixed(2), pctVol: pctVol.toFixed(2)
                });

            // ✅ First paint must wait for COMPLETE data (both streams)
            if (!this.firstPaintDone || !this.hasShownCompleteData) {
                if (!datasetComplete) {
                    console.log('⏳ Waiting for COMPLETE data (funding + ticker) before first paint...',
                        { total, withFunding, withPrice, withVol, pctPrice, pctVol });
                    return;
                }
                console.log('🎨 First complete paint (funding + ticker)');
                this.scheduleDashboardPaint();
                this.firstPaintDone = true;
                this.hasShownCompleteData = true;

                // Clear the fallback timer since we got complete data
                if (this.initialFallbackTimer) {
                    clearTimeout(this.initialFallbackTimer);
                    this.initialFallbackTimer = null;
                }

                // Start the tier timer only AFTER the complete first paint (Free/Pro only)
                if (this.userTier < 2 && !this.updateInterval) {
                    console.log('⏰ Starting tier-based timer after complete first paint');
                    this.startUIUpdates();
                }

                // Elite continues below (realtime after first complete paint)
            }

            // B) One-time hydration repaint for Free/Pro
            this._lastCompleteness = this._lastCompleteness || { pctPrice: 0, pctVol: 0 };
            const improved = (pctPrice - this._lastCompleteness.pctPrice >= 0.2) ||
                (pctVol - this._lastCompleteness.pctVol >= 0.2);

            if (this.firstPaintDone && this.userTier < 2 && improved) {
                console.log('💧 Hydration repaint (Free/Pro): ticker completeness significantly improved.');
                this.scheduleDashboardPaint();
                this._lastCompleteness = { pctPrice, pctVol };
            }

            // After initial complete paint:
            if (this.userTier >= 2) {
                // Elite -> real-time updates on every store change
                console.log('🎨 Elite tier - real-time update triggered');
                this.scheduleDashboardPaint();
            } else {
                // Free/Pro -> rely on tier timer (no-op here)
                console.log('📊 Free/Pro tier - relying on tier timer for updates');
            }
        });
        console.log('✅ Subscribed. unsubscribe is function?', typeof this.unsubscribe === 'function');

        // Set initial connection state to connected since WebSocket is working
        console.log('🧪 Forcing a connection state ping to trigger notify');
        this.store.setConnectionState('connected');

        // C) Safer 8-second fallback
        this.initialFallbackTimer = setTimeout(() => {
            if (!this.firstPaintDone) {
                // Get current completeness state
                const values = Object.values(this.store.getState().bySymbol);
                const total = values.length;
                const withFunding = values.filter(s => s.fundingRate != null).length;
                const withPrice = values.filter(s => Number.isFinite(s.lastPrice)).length;
                const withVol = values.filter(s => Number.isFinite(s.vol24hQuote)).length;
                const pctPrice = total ? withPrice / total : 0;
                const pctVol = total ? withVol / total : 0;
                const hasFundingRates = withFunding > 0;
                const enoughTicker = pctPrice >= 0.4 && pctVol >= 0.4;

                if (hasFundingRates && enoughTicker) {
                    console.warn('⏳ Fallback: close enough, painting.');
                    this.scheduleDashboardPaint();
                    this.firstPaintDone = true;
                    if (this.userTier < 2 && !this.updateInterval) {
                        this.startUIUpdates();
                    }
                } else {
                    console.warn('⏳ Fallback: insufficient completeness; painting partial real data (no sample).');
                    this.scheduleDashboardPaint();
                    this.firstPaintDone = true;            // let tier timer start for Free/Pro
                    if (this.userTier < 2 && !this.updateInterval) {
                        this.startUIUpdates();
                    }
                }
            }
        }, 8000);

        // Note: For Free/Pro, initial paint is triggered after first data arrives
        // inside setupRefreshBasedOnTier(); Elite already paints via subscription.

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseUpdates();
            } else {
                this.resumeUpdates();
            }
        });

        // Initialize scroll indicators
        this.updateScrollIndicators();

        // Add resize listener to update scroll indicators
        window.addEventListener('resize', () => {
            this.updateScrollIndicators();
        });

        console.log('✅ WebSocket integration initialized');
    }

    // Get user tier and setup appropriate refresh rate (like working version)
    async getUserTierAndSetupRefresh() {
        try {
            const response = await fetch('/api/user');
            const result = await response.json();

            if (result.authenticated) {
                this.userTier = result.tier;
                this.refreshInterval = result.refresh_interval;
                console.log(`User tier: ${result.tier_name} (${this.userTier})`);
                console.log(`Refresh interval: ${this.refreshInterval / 1000 / 60} minutes`);
            } else {
                // Guest user - default to Free tier settings
                this.userTier = 0;
                this.refreshInterval = 15 * 60 * 1000; // 15 minutes
                console.log('Guest user - using Free tier limits');
            }
        } catch (error) {
            console.error('Error fetching user tier:', error);
            // Default to Free tier on error
            this.userTier = 0;
            this.refreshInterval = 15 * 60 * 1000;
        }

        // Setup refresh based on tier
        this.setupRefreshBasedOnTier();
    }

    // Setup refresh based on user tier (WebSocket for all, different intervals)
    setupRefreshBasedOnTier() {
        // All tiers use WebSocket (because Binance blocks server-side API)
        console.log(`🚀 Tier ${this.userTier} - Using WebSocket with ${this.refreshInterval / 1000 / 60} minute UI updates`);

        // Create WebSocket connection for all tiers
        this.ws = new BinanceWS(['!ticker@arr', '!markPrice@arr']);
        this.ws.on((message) => {
            this.handleMessage(message);
        });
        this.ws.start();
        this.isConnected = true;

        // UI refresh by tier
        if (this.userTier >= 2) {
            // Elite → subscription handles all painting
            console.log('🚀 Elite tier - Real-time WebSocket updates');
        } else {
            // Free/Pro → subscription handles first paint, timer handles subsequent updates
            console.log(`📊 Tier ${this.userTier} - WebSocket data + ${this.refreshInterval / 1000 / 60} minute UI updates`);
            // Do NOT start timers here. We start them after the first complete paint
            // inside the store subscription once funding is present.
        }
    }

    // Resolve when the websocket store has symbols (first usable dataset)
    waitForFirstData(timeoutMs = 4000) {
        return new Promise((resolve, reject) => {
            const start = performance.now();
            const check = () => {
                const symbols = this.store.getSymbols({ endsWith: 'USDT', limit: 10 });
                if (symbols && symbols.length) return resolve();
                if (performance.now() - start > timeoutMs) return reject(new Error('timeout'));
                requestAnimationFrame(check);
            };
            check();
        });
    }

    // Handle incoming WebSocket messages
    handleMessage(message) {
        if (!this.store) {
            console.error('❌ this.store is undefined in handleMessage!');
            return;
        }
        // sanity: prove it's the same object
        if (this.store !== window.marketStore) {
            console.warn('⚠️ this.store !== window.marketStore (possible double instance)');
        }

        try {
            console.log('📨 Received WebSocket message:', message.stream, message.data?.length || 0, 'items');

            if (message.stream === '!ticker@arr') {
                // Update ticker data
                this.tickerSeen = true;
                console.log('📊 Processing ticker data:', message.data?.length || 0, 'tickers');
                this.store.updateTickers(message.data);
                this.store.setConnectionState('connected');

            } else if (message.stream === '!markPrice@arr') {
                // Update mark prices and funding rates
                this.markSeen = true;
                console.log('💰 Processing mark price data:', message.data?.length || 0, 'prices');
                try {
                    const sample = Array.isArray(message.data) ? message.data[0] : message.data;
                    console.log('💰 markPrice sample keys:', sample && Object.keys(sample));
                    console.log('💰 markPrice sample record:', JSON.stringify(sample));
                } catch (e) {
                    console.log('💰 markPrice sample log failed:', e);
                }
                this.store.updateMarkPrices(message.data);

            } else {
                console.log('❓ Unknown stream:', message.stream);
            }
        } catch (error) {
            console.error('❌ Error handling WebSocket message:', error);
            console.error('❌ Message that caused error:', message);
        }
    }

    // Start periodic UI updates (tier-based refresh rate)
    startUIUpdates() {
        if (this.updateInterval) clearInterval(this.updateInterval);
        // Don't force firstPaintDone here; the subscription sets it when datasetComplete
        this.updateInterval = setInterval(() => {
            this.scheduleDashboardPaint();
        }, this.refreshInterval || 15 * 60 * 1000);
    }

    // (Legacy methods that fetched server data are no longer needed for tier pacing)
    // loadDataForFreePro() remains available but unused.

    // Load data for Free/Pro tiers (server-side API)
    async loadDataForFreePro() {
        try {
            console.log('📊 Loading data for Free/Pro tier...');
            const response = await fetch('/api/data');
            const result = await response.json();

            if (result.success) {
                // Store data in global cache for sorting (like working version)
                window.originalDataCache = [...result.data];
                window.dataCache = this.applySorting([...result.data]);

                // Update tables with sorted data
                this.updateTable('tableBody', window.dataCache);
                this.updateTable('mobileTableBody', window.dataCache);

                // Update sort indicators
                if (window.updateSortIndicators) {
                    window.updateSortIndicators();
                }

                console.log('✅ Free/Pro tier data loaded successfully');
            } else {
                console.error('❌ Failed to load data:', result.error);
            }
        } catch (error) {
            console.error('❌ Error loading data for Free/Pro tier:', error);
        }
    }

    // Update dashboard with latest data
    updateDashboard() {
        const state = this.store.getState();

        // Update connection indicator
        this.updateConnectionIndicator(state.connectionState);

        // All tiers use WebSocket data, but different update frequencies
        if (this.userTier >= 2) {
            // Elite tier - Real-time updates (WebSocket data updates UI immediately)
            this.updateMarketTable();
        } else {
            // Free/Pro tier - Use WebSocket data but only update UI at tier intervals
            this.updateMarketTable();
        }

        // Check for spike alerts
        this.checkSpikeAlerts();
    }

    // Single unified sample-data path that uses the same atomic paint
    showSampleData() {
        const now = Date.now();
        const sampleData = [
            { symbol: 'BTCUSDT', lastPrice: 43250.50, changePct: 2.45, vol24hQuote: 1250000000, fundingRate: 0.0001, lastUpdate: now },
            { symbol: 'ETHUSDT', lastPrice: 2650.75, changePct: -1.23, vol24hQuote: 980000000, fundingRate: 0.0002, lastUpdate: now },
            { symbol: 'SOLUSDT', lastPrice: 98.25, changePct: 5.12, vol24hQuote: 320000000, fundingRate: 0.0003, lastUpdate: now },
        ];

        // Write through the store so the usual mapping/painting path is used
        for (const item of sampleData) {
            window.marketStore.state.bySymbol[item.symbol] = item;
        }
        window.marketStore.state.lastUpdate = now;
        window.marketStore.notify(); // triggers the usual subscription path
    }

    // Update connection indicator
    updateConnectionIndicator(state) {
        const indicator = document.getElementById('connection-indicator');
        if (!indicator) return;

        const states = {
            'connected': { text: '🟢 Live', class: 'text-green-500' },
            'connecting': { text: '🟡 Connecting...', class: 'text-yellow-500' },
            'disconnected': { text: '🔴 Disconnected', class: 'text-red-500' }
        };

        const status = states[state] || states['disconnected'];
        indicator.textContent = status.text;
        indicator.className = `text-sm font-medium ${status.class}`;

        // Don't update store state here to avoid circular dependency
        // The store state is updated in the WebSocket message handlers
    }

    // Map raw WebSocket data to display format (exactly like working version)
    mapToDisplayItems(symbols) {
        // Format volume with $ symbol (like working version)
        const formatVolume = (n) => {
            if (!n) return '-';
            if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
            if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
            if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
            return `$${n.toLocaleString()}`;
        };

        // Format price with $ symbol (like working version)
        const formatPrice = (p) => {
            if (!p) return '-';
            const price = parseFloat(p);
            if (price < 0.01) return `$${price.toFixed(6)}`;
            if (price < 1) return `$${price.toFixed(4)}`;
            if (price < 100) return `$${price.toFixed(3)}`;
            return `$${price.toFixed(2)}`;
        };

        // Format funding rate (like working version)
        const formatFunding = (r) => {
            console.log('🔍 formatFunding called with:', r, 'type:', typeof r);
            if (r === null || r === undefined) {
                console.log('🔍 formatFunding returning N/A for:', r);
                return 'N/A';
            }
            // Handle zero funding rate (show 0.0000% instead of N/A)
            const ratePercent = r * 100;
            const colorClass = ratePercent > 0.03 ? 'funding-positive' : ratePercent < -0.03 ? 'funding-negative' : '';
            const result = `<span class="${colorClass}">${ratePercent.toFixed(4)}%</span>`;
            console.log('🔍 formatFunding returning:', result);
            return result;
        };

        // Debug: Check what funding rates we're receiving
        console.log('🔍 mapToDisplayItems - sample symbol funding rates:',
            symbols.slice(0, 3).map(s => ({
                symbol: s.symbol,
                fundingRate: s.fundingRate,
                type: typeof s.fundingRate,
                raw: s.fundingRate
            }))
        );

        return symbols.map(s => {
            const volumeValue = Number(s.vol24hQuote);
            const priceValue = Number(s.lastPrice);
            const changePctValue = Number(s.changePct);
            const fundingValue = Number(s.fundingRate);
            const openInterestValue = Number(s.openInterest);
            const liquidationRiskValue = Number(s.liquidationRisk);

            return {
                // names the working code expects:
                asset: s.symbol.replace('USDT', ''),
                volume: Number.isFinite(volumeValue) ? volumeValue : 0,
                volume_formatted: formatVolume(s.vol24hQuote),
                funding_rate: Number.isFinite(fundingValue) ? fundingValue : null,
                funding_formatted: formatFunding(s.fundingRate),
                price: Number.isFinite(priceValue) ? priceValue : 0,
                price_formatted: formatPrice(s.lastPrice),
                price_change_pct: Number.isFinite(changePctValue) ? changePctValue : null,
                open_interest_usd: Number.isFinite(openInterestValue) ? openInterestValue : null,
                open_interest_formatted: s.openInterest ? formatVolume(s.openInterest) : '-',
                liquidation_risk: Number.isFinite(liquidationRiskValue) ? liquidationRiskValue : null
            };
        });
    }

    // Update market data table
    updateMarketTable() {
        console.log('🧭 updateMarketTable() tick at', new Date().toISOString());

        const symbols = this.store.getSymbols({
            endsWith: 'USDT',
            limit: 200,
            sortBy: 'vol24hQuote'
        });

        // Once we've shown the table, never hide it again during the session
        this._tableShown = this._tableShown || false;

        // If we temporarily see 0 symbols but have cached rows, keep rendering those
        const hasSymbols = symbols && symbols.length > 0;
        const hasCache = this._lastNonEmptyRows && this._lastNonEmptyRows.length > 0;

        // Visibility: only transition from loading → table once; never back to loading
        if ((hasSymbols || hasCache) && !this._tableShown) {
            const show = (el) => el && el.style && el.style.removeProperty('display');
            const hide = (el) => el && el.style && (el.style.display = 'none');
            const q = (ids) => ids.map(id => document.getElementById(id)).find(Boolean);

            const desktopLoading = q(['loadingContainer', 'loading-container']);
            const desktopContainer = q(['tableContainer', 'marketTableContainer', 'dataContainer']);
            const mobileLoading = q(['mobileLoadingContainer', 'mobile-loading']);
            const mobileContainer = q(['mobileTableContainer', 'mobile-table']);

            hide(desktopLoading);
            hide(mobileLoading);
            show(desktopContainer);
            show(mobileContainer);
            this._tableShown = true;
        }

        // If no data from WebSocket, skip painting (keep last good rows)
        if (symbols.length === 0) {
            console.warn('⏸️ No symbols available, keeping previous rows');
            return;
        }

        // Build rows with progressive fallback (never paint empty)
        let rows = symbols.filter(s => Number.isFinite(s.vol24hQuote) && s.vol24hQuote >= 1e8);
        if (rows.length < 20) rows = symbols.filter(s => Number.isFinite(s.vol24hQuote)).slice(0, 50);
        if (rows.length < 20) rows = symbols.slice(0, 50);

        // Map & sort
        const displayItems = this.mapToDisplayItems(rows);
        window.originalDataCache = [...displayItems];
        const sorter = (typeof window.applySorting === 'function')
            ? window.applySorting.bind(window)
            : this.applySorting.bind(this);
        window.dataCache = sorter([...displayItems]);

        // Choose rows to paint, falling back to cache if needed
        const rowsForPaint = (window.dataCache && window.dataCache.length) ? window.dataCache : this._lastNonEmptyRows;

        // If still empty, skip paint (keeps previous DOM intact)
        if (!rowsForPaint || rowsForPaint.length === 0) {
            console.warn('⏸️ Skipping paint: empty selection and no cache; keeping previous rows');
            return;
        }

        // Cache & paint
        this._lastNonEmptyRows = rowsForPaint;
        this.updateTable('tableBody', rowsForPaint);
        this.updateTable('mobileTableBody', rowsForPaint);

        // Update sort indicators
        if (window.updateSortIndicators) {
            window.updateSortIndicators();
        }
    }

    // Apply sorting to data array (like working version)
    applySorting(data) {
        if (!window.sortState || !window.sortState.column || !window.sortState.direction) {
            // No sorting - return original order
            return data;
        }

        const sorted = [...data];

        sorted.sort((a, b) => {
            let aVal, bVal;

            switch (window.sortState.column) {
                case 'asset':
                    aVal = a.asset;
                    bVal = b.asset;
                    break;
                case 'volume':
                    aVal = Number.isFinite(a.volume) ? a.volume : 0;
                    bVal = Number.isFinite(b.volume) ? b.volume : 0;
                    break;
                case 'price_change_pct':
                    aVal = a.price_change_pct !== undefined ? a.price_change_pct : -Infinity;
                    bVal = b.price_change_pct !== undefined ? b.price_change_pct : -Infinity;
                    break;
                case 'funding_rate':
                    aVal = a.funding_rate !== null ? a.funding_rate : -Infinity;
                    bVal = b.funding_rate !== null ? b.funding_rate : -Infinity;
                    break;
                case 'price':
                    aVal = Number.isFinite(a.price) ? a.price : 0;
                    bVal = Number.isFinite(b.price) ? b.price : 0;
                    break;
                case 'open_interest':
                    aVal = Number.isFinite(a.open_interest_usd) ? a.open_interest_usd : -Infinity;
                    bVal = Number.isFinite(b.open_interest_usd) ? b.open_interest_usd : -Infinity;
                    break;
                default:
                    return 0;
            }

            // Compare values
            let comparison = 0;
            if (typeof aVal === 'string') {
                comparison = aVal.localeCompare(bVal);
            } else {
                comparison = aVal - bVal;
            }

            // Apply direction
            return window.sortState.direction === 'asc' ? comparison : -comparison;
        });

        return sorted;
    }


    // Update specific table
    updateTable(tableId, symbols) {
        console.log(`📊 updateTable called for ${tableId} with ${symbols.length} symbols`);
        const el = document.getElementById(tableId);
        if (!el) {
            console.warn('⚠️ Missing element:', tableId);
            return;
        }

        // Accept TABLE or TBODY ids
        const oldTbody = el.tagName === 'TBODY' ? el : el.querySelector('tbody');
        if (!oldTbody) {
            console.warn('⚠️ Missing tbody for:', tableId);
            return;
        }

        // D) Never "erase" table on empty selection
        if (!symbols || symbols.length === 0) {
            console.warn(`⚠️ updateTable(${tableId}): empty dataset; keeping previous rows`);
            return; // Keep existing rows
        }

        // A) Build new tbody off-DOM
        const newTbody = document.createElement('tbody');
        const isPro = document.querySelector('.pro-column') !== null;

        console.log(`📊 Building ${symbols.length} rows for ${tableId}`);

        // Add new rows using mapped data format
        symbols.forEach((item) => {
            const tr = document.createElement('tr');
            tr.dataset.symbol = item.asset; // stable key

            tr.innerHTML = `
                <td class="px-4 py-2 font-medium">${item.asset}</td>
                <td class="px-4 py-2">${item.volume_formatted}</td>
                ${isPro ? `<td class="px-4 py-2 ${item.price_change_pct >= 0 ? 'text-green-600' : 'text-red-600'}">${item.price_change_pct ? item.price_change_pct.toFixed(2) + '%' : '-'}</td>` : ''}
                <td class="px-4 py-2">${item.funding_formatted}</td>
                <td class="px-4 py-2">${item.price_formatted}</td>
                ${isPro ? `<td class="px-4 py-2">${item.open_interest_formatted}</td>` : ''}
                ${isPro ? `<td class="px-4 py-2">${item.liquidation_risk ? item.liquidation_risk.toFixed(2) : '-'}</td>` : ''}
            `;

            newTbody.appendChild(tr);
        });

        // A) Atomic swap to avoid any blank state on screen
        oldTbody.replaceWith(newTbody);
    }

    // Check for spike alerts
    checkSpikeAlerts() {
        const alerts = this.store.getSpikeAlerts();

        if (alerts.length > 0) {
            // Show spike notifications
            alerts.forEach(alert => {
                this.showSpikeNotification(alert);
            });
        }
    }

    // Show spike notification
    showSpikeNotification(alert) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded shadow-lg z-50';
        notification.innerHTML = `
            <div class="flex items-center">
                <span class="text-xl mr-2">🔥</span>
                <div>
                    <div class="font-bold">Volume Spike Alert</div>
                    <div class="text-sm">${alert.symbol}: ${Math.round(alert.vol1hQuote).toLocaleString()} (1h vol)</div>
                </div>
                <button class="ml-4 text-yellow-600 hover:text-yellow-800" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // Pause updates when page is hidden
    pauseUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    // Resume updates when page is visible
    resumeUpdates() {
        if (this.userTier >= 2) {
            // Elite paints on store changes; do NOT start interval
            return;
        }
        if (!this.updateInterval) {
            this.startUIUpdates();
        }
    }

    // Disconnect and cleanup
    disconnect() {
        if (this.ws) {
            this.ws.stop();
            this.ws = null;
        }

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        this.isConnected = false;
        console.log('🔌 WebSocket integration disconnected');
    }

}

/**
 * Update scroll indicators for table containers
 * (define as a prototype method so `this.updateScrollIndicators()` works)
 */
WebSocketIntegration.prototype.updateScrollIndicators = function () {
    const containers = [document.getElementById('tableContainer'), document.getElementById('mobileTableContainer')]
        .filter(Boolean);
    containers.forEach((container) => {
        if (typeof updateHorizontalOverflowState === 'function') {
            const table = container.querySelector('table');
            updateHorizontalOverflowState(container, table);
        } else {
            const hasScroll = container.scrollWidth - container.clientWidth > 2;
            container.classList.toggle('has-scroll', hasScroll);
            if (!hasScroll) {
                container.classList.remove('scrolled');
            }
        }

        container.classList.toggle('scrolled', container.scrollLeft > 0);
    });
};

// Global error handler to catch JavaScript errors
window.addEventListener('error', (event) => {
    console.error('❌ Global JavaScript error caught:', event.error);
    console.error('❌ Error details:', event.message, event.filename, event.lineno);

    // If WebSocket integration fails, show fallback data
    if (!window.wsIntegration || !window.wsIntegration.isConnected) {
        console.log('📊 WebSocket integration failed, showing fallback data');
        showFallbackData();
    }
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Starting VolSpike WebSocket integration...');

    // Test WebSocket connection with proper error handling
    console.log('🔍 Testing WebSocket connection...');
    try {
        const testWs = new WebSocket('wss://fstream.binance.com/stream?streams=!ticker@arr');
        testWs.onopen = () => {
            console.log('✅ WebSocket connection successful!');
            testWs.close();
        };
        testWs.onerror = (error) => {
            console.error('❌ WebSocket connection failed:', error);
        };
        testWs.onclose = () => {
            console.log('🔍 Test WebSocket closed');
        };
    } catch (error) {
        console.error('❌ WebSocket creation failed:', error);
    }

    // Create global instance with error handling
    try {
        window.wsIntegration = new WebSocketIntegration();
        window.wsIntegration.init();
        console.log('✅ VolSpike WebSocket integration started');
    } catch (error) {
        console.error('❌ Failed to initialize WebSocket integration:', error);
        // Show sample data as fallback
        showFallbackData();
    }
});

// Fallback function to show sample data
function showFallbackData() {
    console.log('📊 Showing fallback data due to WebSocket failure');
    const sampleData = [
        { symbol: 'BTCUSDT', lastPrice: 43250.50, changePct: 2.45, vol24hQuote: 1250000000, vol1hQuote: 52000000, fundingRate: 0.0001, spike3x: false, openInterest: 1500000000, liquidationRisk: 0.15 },
        { symbol: 'ETHUSDT', lastPrice: 2650.75, changePct: -1.23, vol24hQuote: 980000000, vol1hQuote: 41000000, fundingRate: 0.0002, spike3x: true, openInterest: 1200000000, liquidationRisk: 0.22 },
        { symbol: 'ADAUSDT', lastPrice: 0.4850, changePct: 3.67, vol24hQuote: 450000000, vol1hQuote: 18000000, fundingRate: 0.0001, spike3x: false, openInterest: 800000000, liquidationRisk: 0.18 },
        { symbol: 'SOLUSDT', lastPrice: 98.25, changePct: 5.12, vol24hQuote: 320000000, vol1hQuote: 15000000, fundingRate: 0.0003, spike3x: true, openInterest: 600000000, liquidationRisk: 0.25 }
    ];

    // Format functions for fallback data
    const formatVolume = (volume) => {
        if (!volume) return '-';
        if (volume >= 1000000000) return (volume / 1000000000).toFixed(1) + 'B';
        if (volume >= 1000000) return (volume / 1000000).toFixed(1) + 'M';
        return Math.round(volume).toLocaleString();
    };

    const formatPrice = (price) => {
        if (!price) return '-';
        if (price >= 1000) return price.toFixed(2);
        if (price >= 1) return price.toFixed(4);
        return price.toFixed(6);
    };

    const formatFundingRate = (rate) => {
        if (rate == null || rate == undefined) return 'N/A';
        const ratePercent = rate * 100;
        const colorClass = ratePercent > 0.03 ? 'funding-positive' : ratePercent < -0.03 ? 'funding-negative' : '';
        return `<span class="${colorClass}">${ratePercent.toFixed(4)}%</span>`;
    };

    // Update desktop table
    const desktopTable = document.getElementById('tableBody');
    if (desktopTable) {
        desktopTable.innerHTML = sampleData.map(item => `
            <tr>
                <td class="px-4 py-2 font-medium">${item.symbol}</td>
                <td class="px-4 py-2">${formatVolume(item.vol24hQuote)}</td>
                <td class="px-4 py-2">${formatFundingRate(item.fundingRate)}</td>
                <td class="px-4 py-2">${formatPrice(item.lastPrice)}</td>
            </tr>
        `).join('');
    }

    // Update mobile table
    const mobileTable = document.getElementById('mobileTableBody');
    if (mobileTable) {
        mobileTable.innerHTML = sampleData.map(item => `
            <tr>
                <td class="px-4 py-2 font-medium">${item.symbol}</td>
                <td class="px-4 py-2">${formatVolume(item.vol24hQuote)}</td>
                <td class="px-4 py-2">${formatFundingRate(item.fundingRate)}</td>
                <td class="px-4 py-2">${formatPrice(item.lastPrice)}</td>
            </tr>
        `).join('');
    }

    // Update scroll indicators after table updates
    if (window.wsIntegration && typeof window.wsIntegration.updateScrollIndicators === 'function') {
        window.wsIntegration.updateScrollIndicators();
    }
}

// Export for use in other modules
window.WebSocketIntegration = WebSocketIntegration;

// Auto-initialize WebSocket integration (with guard against double initialization)
document.addEventListener('DOMContentLoaded', () => {
    if (!window.wsIntegration) {
        console.log('🚀 Auto-initializing WebSocket integration...');
        window.wsIntegration = new WebSocketIntegration();
        window.wsIntegration.init();
        console.log('✅ WebSocket integration auto-initialized');
    } else {
        console.log('⚠️ WebSocket integration already exists, skipping auto-initialization');
    }
});

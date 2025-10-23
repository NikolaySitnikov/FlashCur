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
        this.isConnected = false;
        this.reconnectTimeout = null;
        this.updateInterval = null;
        this.sampleDataShown = false;
    }

    // Initialize WebSocket connection
    init() {
        console.log('🚀 Initializing WebSocket integration...');

        // Create WebSocket connection
        this.ws = new BinanceWS(['!ticker@arr', '!markPrice@arr']);

        // Set up message handling
        this.ws.on((message) => {
            this.handleMessage(message);
        });

        // Start connection
        this.ws.start();
        this.isConnected = true;

        // Set up periodic UI updates
        this.startUIUpdates();

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseUpdates();
            } else {
                this.resumeUpdates();
            }
        });

        console.log('✅ WebSocket integration initialized');
    }

    // Handle incoming WebSocket messages
    handleMessage(message) {
        try {
            console.log('📨 Received WebSocket message:', message.stream, message.data?.length || 0, 'items');
            console.log('📨 Full message structure:', message);

            if (message.stream === '!ticker@arr') {
                // Update ticker data
                console.log('📊 Processing ticker data:', message.data?.length || 0, 'tickers');
                console.log('📊 First ticker sample:', message.data?.[0]);
                this.store.updateTickers(message.data);
                this.store.setConnectionState('connected');

            } else if (message.stream === '!markPrice@arr') {
                // Update mark prices and funding rates
                console.log('💰 Processing mark price data:', message.data?.length || 0, 'prices');
                console.log('💰 First mark price sample:', message.data?.[0]);
                this.store.updateMarkPrices(message.data);

            } else {
                console.log('❓ Unknown stream:', message.stream);
                console.log('❓ Unknown message structure:', message);
            }
        } catch (error) {
            console.error('❌ Error handling WebSocket message:', error);
            console.error('❌ Message that caused error:', message);
        }
    }

    // Start periodic UI updates
    startUIUpdates() {
        this.updateInterval = setInterval(() => {
            this.updateDashboard();
        }, 1000); // Update every second
    }

    // Update dashboard with latest data
    updateDashboard() {
        const state = this.store.getState();

        // Update connection indicator
        this.updateConnectionIndicator(state.connectionState);

        // Update market data table
        this.updateMarketTable();

        // Check for spike alerts
        this.checkSpikeAlerts();
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
    }

    // Update market data table
    updateMarketTable() {
        const symbols = this.store.getSymbols({
            endsWith: 'USDT',
            limit: 200,
            sortBy: 'vol24hQuote'
        });

        console.log('📊 Market table update - symbols count:', symbols.length);

        // If no data from WebSocket, show sample data after 3 seconds
        if (symbols.length === 0) {
            // Only show sample data if we've been trying for a while
            if (!this.sampleDataShown) {
                setTimeout(() => {
                    const currentSymbols = this.store.getSymbols({
                        endsWith: 'USDT',
                        limit: 200,
                        sortBy: 'vol24hQuote'
                    });
                    if (currentSymbols.length === 0) {
                        console.log('⏰ No real data after 3 seconds, showing sample data');
                        this.showSampleData();
                        this.sampleDataShown = true;
                    }
                }, 3000);
            }
            return;
        }

        // Update desktop table
        this.updateTable('tableBody', symbols);
        
        // Update mobile table
        this.updateTable('mobileTableBody', symbols);
    }

    // Show sample data when WebSocket is not working
    showSampleData() {
        const sampleData = [
            { symbol: 'BTCUSDT', lastPrice: 43250.50, changePct: 2.45, vol24hQuote: 1250000000, vol1hQuote: 52000000, fundingRate: 0.0001, spike3x: false },
            { symbol: 'ETHUSDT', lastPrice: 2650.75, changePct: -1.23, vol24hQuote: 890000000, vol1hQuote: 37000000, fundingRate: 0.0002, spike3x: true },
            { symbol: 'ADAUSDT', lastPrice: 0.4850, changePct: 3.67, vol24hQuote: 450000000, vol1hQuote: 19000000, fundingRate: 0.0003, spike3x: false },
            { symbol: 'SOLUSDT', lastPrice: 98.25, changePct: 5.12, vol24hQuote: 320000000, vol1hQuote: 15000000, fundingRate: 0.0004, spike3x: true }
        ];

        console.log('📊 Showing sample data (WebSocket not connected)');

        // Update desktop table
        this.updateTable('tableBody', sampleData);
        
        // Update mobile table
        this.updateTable('mobileTableBody', sampleData);
    }

    // Update specific table
    updateTable(tableId, symbols) {
        const tbody = document.getElementById(tableId);
        if (!tbody) return;

        // Clear existing rows
        tbody.innerHTML = '';

        // Add new rows
        symbols.forEach(({ symbol, lastPrice, changePct, vol24hQuote, vol1hQuote, fundingRate, spike3x }) => {
            const row = document.createElement('tr');
            row.className = spike3x ? 'bg-yellow-50 border-l-4 border-yellow-400' : '';

            row.innerHTML = `
                <td class="px-4 py-2 font-medium">${symbol}</td>
                <td class="px-4 py-2">${lastPrice ? lastPrice.toFixed(4) : '-'}</td>
                <td class="px-4 py-2 ${changePct >= 0 ? 'text-green-600' : 'text-red-600'}">
                    ${changePct ? changePct.toFixed(2) + '%' : '-'}
                </td>
                <td class="px-4 py-2">${fundingRate ? (fundingRate * 100).toFixed(4) + '%' : '-'}</td>
                <td class="px-4 py-2">${vol1hQuote ? Math.round(vol1hQuote).toLocaleString() : '-'}</td>
                <td class="px-4 py-2">${vol24hQuote ? Math.round(vol24hQuote).toLocaleString() : '-'}</td>
                <td class="px-4 py-2">${spike3x ? '🔥 3×' : ''}</td>
            `;

            tbody.appendChild(row);
        });
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

        this.isConnected = false;
        console.log('🔌 WebSocket integration disconnected');
    }
}

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
        { symbol: 'BTCUSDT', lastPrice: 43250.50, changePct: 2.45, vol24hQuote: 1250000000, vol1hQuote: 52000000, fundingRate: 0.0001, spike3x: false },
        { symbol: 'ETHUSDT', lastPrice: 2650.75, changePct: -1.23, vol24hQuote: 980000000, vol1hQuote: 41000000, fundingRate: 0.0002, spike3x: true },
        { symbol: 'ADAUSDT', lastPrice: 0.4850, changePct: 3.67, vol24hQuote: 450000000, vol1hQuote: 18000000, fundingRate: 0.0001, spike3x: false },
        { symbol: 'SOLUSDT', lastPrice: 98.25, changePct: 5.12, vol24hQuote: 320000000, vol1hQuote: 15000000, fundingRate: 0.0003, spike3x: true }
    ];

    // Update desktop table
    const desktopTable = document.getElementById('tableBody');
    if (desktopTable) {
        desktopTable.innerHTML = sampleData.map(item => `
            <tr>
                <td>${item.symbol}</td>
                <td>${item.lastPrice.toFixed(4)}</td>
                <td class="${item.changePct >= 0 ? 'text-green-500' : 'text-red-500'}">${item.changePct.toFixed(2)}%</td>
                <td>${Math.round(item.vol24hQuote).toLocaleString()}</td>
                <td>${item.fundingRate.toFixed(4)}</td>
                <td>${Math.round(item.vol1hQuote).toLocaleString()}</td>
                <td>${item.spike3x ? '🔥' : ''}</td>
            </tr>
        `).join('');
    }
    
    // Update mobile table
    const mobileTable = document.getElementById('mobileTableBody');
    if (mobileTable) {
        mobileTable.innerHTML = sampleData.map(item => `
            <tr>
                <td>${item.symbol}</td>
                <td>${item.lastPrice.toFixed(4)}</td>
                <td class="${item.changePct >= 0 ? 'text-green-500' : 'text-red-500'}">${item.changePct.toFixed(2)}%</td>
                <td>${Math.round(item.vol1hQuote).toLocaleString()}</td>
                <td>${item.spike3x ? '🔥' : ''}</td>
            </tr>
        `).join('');
    }
}

// Export for use in other modules
window.WebSocketIntegration = WebSocketIntegration;

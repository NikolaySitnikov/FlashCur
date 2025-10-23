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
            if (message.stream === '!ticker@arr') {
                // Update ticker data
                this.store.updateTickers(message.data);
                this.store.setConnectionState('connected');

            } else if (message.stream === '!markPrice@arr') {
                // Update mark prices and funding rates
                this.store.updateMarkPrices(message.data);

            } else {
                console.log('Unknown stream:', message.stream);
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
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

        // Update desktop table
        this.updateTable('marketTableBody', symbols);

        // Update mobile table
        this.updateTable('mobileMarketTableBody', symbols);
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Starting VolSpike WebSocket integration...');

    // Create global instance
    window.wsIntegration = new WebSocketIntegration();
    window.wsIntegration.init();

    console.log('✅ VolSpike WebSocket integration started');
});

// Export for use in other modules
window.WebSocketIntegration = WebSocketIntegration;

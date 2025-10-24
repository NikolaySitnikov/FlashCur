// Global variables
let currentTheme = 'dark';
let dataCache = [];
let originalDataCache = []; // Store original order from API
let tableController = null;
let isDataLoading = false;
let isAnimating = false; // Track if table animation is in progress
let currentTab = 'market-data';
let tabsInitialized = false;
let unreadAlertsCount = 0;
let lastViewedAlertsCount = 0;


// User tier and refresh settings
let userTier = 0;
let refreshInterval = 15 * 60 * 1000; // Default to 15 min (Free tier)
let refreshTimer = null;
let hasProMetrics = false; // Track if Pro metrics are available

// Simple navigation menu toggle
function toggleNavMenu() {
    const menu = document.getElementById('navDropdown');
    const btn = document.getElementById('navBtn');
    if (!menu || !btn) return;

    menu.classList.toggle('show');
    btn.innerHTML = menu.classList.contains('show') ? '✕' : '☰';
}

// Setup navigation menu
document.addEventListener('DOMContentLoaded', function () {
    const navBtn = document.getElementById('navBtn');
    const menu = document.getElementById('navDropdown');

    if (navBtn) {
        navBtn.addEventListener('click', toggleNavMenu);
    }

    // Close menu when clicking outside
    document.addEventListener('click', function (e) {
        if (menu && navBtn && !menu.contains(e.target) && !navBtn.contains(e.target)) {
            menu.classList.remove('show');
            navBtn.innerHTML = '☰';
        }
    });
});


// Sorting state
let sortState = {
    column: null,      // 'asset', 'volume', 'funding_rate', 'price', or null
    direction: null    // 'asc', 'desc', or null (default)
};
syncSortStateToWindow();

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', async function () {
    tableController = new MarketTableController();
    tableController.attach();
    window.marketTable = tableController;

    initializeTheme();
    initializeTabs();
    loadSortState();

    // Fetch user tier first, then set up dashboard
    await fetchUserTier();
    loadData();
    setupAutoRefresh();
});

// Tab Management
function initializeTabs() {
    if (tabsInitialized) return;

    const allTabButtons = document.querySelectorAll('.tab-button, .mobile-tab-button');
    allTabButtons.forEach(button => {
        if (button.tagName === 'BUTTON' && !button.getAttribute('type')) {
            button.setAttribute('type', 'button');
        }

        if (!button.__volTabHandler) {
            const handler = (event) => {
                handleTabButtonClick(event);
            };

            button.addEventListener('click', handler);
            button.__volTabHandler = handler;
        }
    });

    tabsInitialized = true;
}

function handleTabButtonClick(event) {
    const targetButton = event.currentTarget instanceof HTMLElement
        ? event.currentTarget
        : event.target.closest('.tab-button, .mobile-tab-button');
    if (!targetButton) return;

    const targetTab = targetButton.getAttribute('data-tab');
    if (!targetTab) return;

    event.preventDefault();
    switchTab(targetTab);
}

function switchTab(tabName) {
    const tabButtons = document.querySelectorAll('.tab-button');
    const mobileTabButtons = document.querySelectorAll('.mobile-tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    // Remove active class from all buttons and panels
    tabButtons.forEach(button => button.classList.remove('active'));
    mobileTabButtons.forEach(button => button.classList.remove('active'));
    tabPanels.forEach(panel => panel.classList.remove('active'));

    // Add active class to selected buttons and panel
    const activeButtons = document.querySelectorAll(`[data-tab="${tabName}"]`);
    const activePanel = document.getElementById(`${tabName}-panel`);

    activeButtons.forEach(button => button.classList.add('active'));

    if (activePanel) {
        activePanel.classList.add('active');
        currentTab = tabName;

        // If switching to alerts tab, mark alerts as viewed
        if (tabName === 'volume-alerts') {
            markAlertsAsViewed();
        }

        // Re-check overflow so the scroll hint is accurate after tab switch
        ['tableContainer', 'mobileTableContainer'].forEach(id => {
            const c = document.getElementById(id);
            if (!c) return;
            updateHorizontalOverflowState(c);
        });
    }
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    const badgeCount = badge?.querySelector('.badge-count');

    if (badge && badgeCount) {
        if (unreadAlertsCount > 0) {
            badge.style.display = 'flex';
            badgeCount.textContent = unreadAlertsCount;
        } else {
            badge.style.display = 'none';
        }
    }
}

function markAlertsAsViewed() {
    lastViewedAlertsCount = unreadAlertsCount;
    unreadAlertsCount = 0;
    updateNotificationBadge();
}

// Dark Mode Only - No theme switching needed
function initializeTheme() {
    // Force dark theme only
    document.body.classList.add('dark-theme');
}

// Data Loading
async function loadData() {
    if (isDataLoading) return;

    isDataLoading = true;
    showLoading();

    try {
        const response = await fetch('/api/data');
        const result = await response.json();

        if (result.success) {
            hasProMetrics = result.has_pro_metrics || false;

            if (tableController) {
                tableController.setHasProMetrics(hasProMetrics);
                tableController.ingest(result.data, { replaceSource: true });
                syncSortStateToController();
                syncSortStateToWindow();
            } else {
                originalDataCache = [...result.data];
                dataCache = applySorting([...result.data]);
                syncSortStateToWindow();
            }

            window.originalDataCache = [...originalDataCache];
            window.dataCache = [...dataCache];

            hideLoading();
            updateLastUpdated();
            showDownloadButton();
        } else {
            showError('Failed to load data: ' + result.error);
        }
    } catch (error) {
        showError('Network error: ' + error.message);
    } finally {
        isDataLoading = false;
        if (tableController) {
            tableController.updateOverflow();
        }
    }
}

function setRowDataAttributes(row, item) {
    if (!row || !item) return;

    const setValue = (key, value) => {
        if (value === null || value === undefined || (typeof value === 'number' && !Number.isFinite(value))) {
            delete row.dataset[key];
            return;
        }
        row.dataset[key] = String(value);
    };

    row.dataset.symbol = item.asset || '';
    setValue('asset', item.asset || item.symbol || '');
    setValue('volume', Number.isFinite(item.volume) ? item.volume : Number.isFinite(item.volume_usd) ? item.volume_usd : null);
    setValue('price', Number.isFinite(item.price) ? item.price : null);
    setValue('fundingRate', Number.isFinite(item.funding_rate) ? item.funding_rate : null);
    setValue('priceChangePct', Number.isFinite(item.price_change_pct) ? item.price_change_pct : null);
    setValue('openInterest', Number.isFinite(item.open_interest_usd) ? item.open_interest_usd : null);
    setValue('liquidationRisk', item.liquidation_risk ?? null);
}


// Loading States
function showLoading() {
    const loadingContainer = document.getElementById('loadingContainer');
    const tableContainer = document.getElementById('tableContainer');
    const downloadSection = document.getElementById('downloadSection');

    const mobileLoadingContainer = document.getElementById('mobileLoadingContainer');
    const mobileTableContainer = document.getElementById('mobileTableContainer');
    const mobileDownloadSection = document.getElementById('mobileDownloadSection');

    if (loadingContainer) loadingContainer.style.display = 'flex';
    if (tableContainer) tableContainer.style.display = 'none';
    if (downloadSection) downloadSection.style.display = 'none';

    if (mobileLoadingContainer) mobileLoadingContainer.style.display = 'flex';
    if (mobileTableContainer) mobileTableContainer.style.display = 'none';
    if (mobileDownloadSection) mobileDownloadSection.style.display = 'none';
}

function hideLoading() {
    const loadingContainer = document.getElementById('loadingContainer');
    const mobileLoadingContainer = document.getElementById('mobileLoadingContainer');

    if (loadingContainer) loadingContainer.style.display = 'none';
    if (mobileLoadingContainer) mobileLoadingContainer.style.display = 'none';
}

function showError(message) {
    const loadingContainer = document.getElementById('loadingContainer');
    loadingContainer.innerHTML = `
        <div style="color: #ff4757; text-align: center;">
            <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
            <div style="font-weight: 600; margin-bottom: 0.5rem;">Error</div>
            <div>${message}</div>
        </div>
    `;
}

// Update Last Updated Time
function updateLastUpdated() {
    const now = new Date();
    const timeString = now.toLocaleString('en-US', {
        timeZone: 'America/Cancun',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    document.getElementById('lastUpdated').textContent = `Last Updated: ${timeString} (Tulum)`;
}

// Download Functionality
function showDownloadButton() {
    const downloadSection = document.getElementById('downloadSection');
    const mobileDownloadSection = document.getElementById('mobileDownloadSection');

    if (downloadSection) downloadSection.style.display = 'block';
    if (mobileDownloadSection) mobileDownloadSection.style.display = 'block';
}

async function downloadWatchlist(format = 'txt') {
    try {
        const response = await fetch(`/api/watchlist?format=${format}`);

        // For CSV format, handle as file download directly
        if (format === 'csv') {
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'binance_watchlist.csv';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to download CSV');
            }
            return;
        }

        // For txt and json formats, handle as JSON response
        const result = await response.json();

        if (result.success) {
            if (format === 'json') {
                // Download JSON
                const jsonStr = JSON.stringify(result.data, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'binance_watchlist.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            } else {
                // Download TXT
                const blob = new Blob([result.watchlist], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'tradingview_watchlist.txt';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }
        } else {
            alert('Failed to download watchlist: ' + result.error);
        }
    } catch (error) {
        alert('Network error: ' + error.message);
    }
}

// Auto Refresh
// Fetch user tier and set appropriate refresh interval
async function fetchUserTier() {
    try {
        const response = await fetch('/api/user');
        const result = await response.json();

        if (result.authenticated) {
            userTier = result.tier;
            refreshInterval = result.refresh_interval;

            console.log(`User tier: ${result.tier_name} (${userTier})`);
            console.log(`Refresh interval: ${refreshInterval / 1000 / 60} minutes`);
        } else {
            // Guest user - default to Free tier settings
            userTier = 0;
            refreshInterval = 15 * 60 * 1000; // 15 minutes
            console.log('Guest user - using Free tier limits');
        }
    } catch (error) {
        console.error('Error fetching user tier:', error);
        // Default to Free tier on error
        userTier = 0;
        refreshInterval = 15 * 60 * 1000;
    }
}

function setupAutoRefresh() {
    // Clear any existing timer
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }

    // Set up refresh based on user's tier
    refreshTimer = setInterval(() => {
        if (!isDataLoading) {
            console.log('Auto-refreshing data...');
            loadData();
        }
    }, refreshInterval);

    console.log(`Auto-refresh set to ${refreshInterval / 1000 / 60} minutes`);
}

// Load real alerts from API
async function loadAlerts() {
    try {
        const response = await fetch('/api/alerts');
        const result = await response.json();

        if (result.success) {
            displayAlerts(result.alerts);
        } else {
            console.error('Failed to load alerts:', result.error);
        }
    } catch (error) {
        console.error('Network error loading alerts:', error);
    }
}

// Display real alerts
function displayAlerts(alertsData) {
    const alertsContainer = document.getElementById('alertsContainer');
    const mobileAlertsContainer = document.getElementById('mobileAlertsContainer');

    // Set initial viewed count on first load
    if (lastViewedAlertsCount === 0 && alertsData.length > 0) {
        lastViewedAlertsCount = alertsData.length;
    }

    // Update unread alerts count - only if we're not currently viewing alerts
    if (currentTab !== 'volume-alerts') {
        unreadAlertsCount = Math.max(0, alertsData.length - lastViewedAlertsCount);
    }

    // Update notification badge
    updateNotificationBadge();

    const alertHTML = generateAlertHTML(alertsData);

    if (alertsContainer) {
        alertsContainer.innerHTML = alertHTML;
    }

    if (mobileAlertsContainer) {
        mobileAlertsContainer.innerHTML = alertHTML;
    }
}

function generateAlertHTML(alertsData) {
    if (alertsData.length === 0) {
        return '<div class="no-alerts">No recent alerts</div>';
    }

    // Sort alerts by timestamp in descending order (most recent first)
    const sortedAlerts = [...alertsData].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    let html = '';
    sortedAlerts.forEach(alert => {
        // Format timestamp
        const timestamp = new Date(alert.timestamp);
        const timeString = timestamp.toLocaleTimeString('en-US', {
            timeZone: 'America/Cancun',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        html += `
            <div class="alert-item">
                <div class="alert-time">${timeString}</div>
                <div class="alert-message">${alert.message}</div>
            </div>
        `;
    });

    return html;
}

// Initialize alerts
document.addEventListener('DOMContentLoaded', function () {
    loadAlerts();
    // Refresh alerts every 30 seconds
    setInterval(loadAlerts, 30000);
});

// ============================================================================
// SORTING FUNCTIONALITY
// ============================================================================

// Load sorting state from localStorage
function loadSortState() {
    const saved = localStorage.getItem('sortState');
    if (saved) {
        try {
            sortState = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to parse sort state:', e);
            sortState = { column: null, direction: null };
        }
    }
    syncSortStateToWindow();
    syncSortStateToController();
}

// Save sorting state to localStorage
function saveSortState() {
    localStorage.setItem('sortState', JSON.stringify(sortState));
}

// Handle column header click
function handleSort(column) {
    // Prevent sorting while animation is in progress
    if (isAnimating) {
        return;
    }

    if (tableController) {
        tableController.toggleSort(column);
        sortState = tableController.getSortState();
        syncTableCaches();
        syncSortStateToWindow();
        saveSortState();
        return;
    }

    // If clicking the same column, cycle through states
    if (sortState.column === column) {
        if (sortState.direction === 'asc') {
            if (column === 'asset') {
                // Asset: asc → desc → default
                sortState.direction = 'desc';
            } else {
                // Numeric columns: desc → asc → default
                sortState.column = null;
                sortState.direction = null;
            }
        } else if (sortState.direction === 'desc') {
            if (column === 'asset') {
                // Asset: asc → desc → default
                sortState.column = null;
                sortState.direction = null;
            } else {
                // Numeric columns: desc → asc → default
                sortState.direction = 'asc';
            }
        }
    } else {
        // Clicking a different column - start with ascending for asset, descending for others
        sortState.column = column;
        if (column === 'asset') {
            sortState.direction = 'asc'; // A to Z
        } else {
            sortState.direction = 'desc'; // Highest to lowest for numeric columns
        }
    }

    syncSortStateToWindow();
    saveSortState();

    const sourceData = getSourceDataForSorting();
    if (!Array.isArray(sourceData)) {
        console.warn('⚠️ No sortable data available.');
        updateSortIndicators();
        return;
    }

    const sorter = (window.wsIntegration && typeof window.wsIntegration.applySorting === 'function')
        ? window.wsIntegration.applySorting.bind(window.wsIntegration)
        : applySorting;

    let workingCopy;
    try {
        workingCopy = Array.isArray(sourceData) ? [...sourceData] : [];
    } catch (error) {
        console.error('❌ Failed to copy source data for sorting:', error);
        workingCopy = [];
    }

    const sortedData = sorter ? sorter(workingCopy) : workingCopy;

    if (!Array.isArray(sortedData)) {
        console.warn('⚠️ Sorter returned a non-array result, skipping render.');
        updateSortIndicators();
        return;
    }

    renderSortedTables(sortedData);
    updateSortIndicators();
}

function syncSortStateToWindow() {
    window.sortState = { ...sortState };
}

function syncSortStateToController() {
    if (!tableController) return;
    tableController.setSortState(sortState);
    syncTableCaches();
}

function syncTableCaches() {
    if (!tableController) return;
    dataCache = tableController.getDisplayRows();
    originalDataCache = tableController.getSourceRows();
    window.dataCache = [...dataCache];
    window.originalDataCache = [...originalDataCache];
}

window.handleSort = handleSort;
window.applySorting = applySorting;
window.updateSortIndicators = updateSortIndicators;
window.setRowDataAttributes = setRowDataAttributes;
window.syncTableCaches = syncTableCaches;

function renderSortedTables(sortedData) {
    if (!Array.isArray(sortedData)) {
        console.warn('⚠️ renderSortedTables called without an array.');
        return;
    }

    if (tableController) {
        tableController.ingest(sortedData, { replaceSource: true });
        sortState = tableController.getSortState();
        syncSortStateToWindow();
        return;
    }

    dataCache = [...sortedData];
    window.dataCache = [...sortedData];

    const proEnabled = Boolean(
        hasProMetrics ||
        document.querySelector('#dataTable thead .pro-column') ||
        document.querySelector('#mobileDataTable thead .pro-column')
    );

    const desktopBody = document.getElementById('tableBody');
    const mobileBody = document.getElementById('mobileTableBody');

    if (desktopBody) {
        replaceTableBody(desktopBody, sortedData, proEnabled);
    }

    if (mobileBody) {
        replaceTableBody(mobileBody, sortedData, proEnabled);
    }

    const desktopContainer = document.getElementById('tableContainer');
    const mobileContainer = document.getElementById('mobileTableContainer');

    if (desktopContainer) {
        desktopContainer.style.display = 'block';
        updateHorizontalOverflowState(desktopContainer, desktopContainer.querySelector('table'));
    }

    if (mobileContainer) {
        mobileContainer.style.display = 'block';
        updateHorizontalOverflowState(mobileContainer, mobileContainer.querySelector('table'));
    }

    if (window.wsIntegration) {
        window.wsIntegration._lastNonEmptyRows = [...sortedData];
        if (typeof window.wsIntegration.updateScrollIndicators === 'function') {
            window.wsIntegration.updateScrollIndicators();
        }
    }
}

window.renderSortedTables = renderSortedTables;

function replaceTableBody(tbodyElement, rows, proEnabled) {
    if (!tbodyElement) return;

    const fragment = document.createDocumentFragment();
    rows.forEach(item => {
        fragment.appendChild(buildStaticRow(item, proEnabled));
    });

    while (tbodyElement.firstChild) {
        tbodyElement.removeChild(tbodyElement.firstChild);
    }

    tbodyElement.appendChild(fragment);
}

function buildStaticRow(item, proEnabled) {
    const tr = document.createElement('tr');

    const assetCell = document.createElement('td');
    assetCell.className = 'px-4 py-2 font-medium';
    assetCell.textContent = item.asset || '-';
    tr.appendChild(assetCell);

    const volumeCell = document.createElement('td');
    volumeCell.className = 'px-4 py-2';
    volumeCell.textContent = resolveVolumeDisplay(item);
    tr.appendChild(volumeCell);

    if (proEnabled) {
        const priceChangeCell = document.createElement('td');
        priceChangeCell.className = 'px-4 py-2 pro-column';
        const priceChangeValue = parseNumber(item.price_change_pct);
        const priceChangeDisplay = resolvePriceChangeDisplay(item, priceChangeValue);

        if (Number.isFinite(priceChangeValue)) {
            if (priceChangeValue > 0) {
                priceChangeCell.classList.add('price-change-positive', 'text-green-600');
            } else if (priceChangeValue < 0) {
                priceChangeCell.classList.add('price-change-negative', 'text-red-600');
            }
        }

        priceChangeCell.textContent = priceChangeDisplay;
        tr.appendChild(priceChangeCell);
    }

    const fundingCell = document.createElement('td');
    fundingCell.className = 'px-4 py-2';
    fundingCell.innerHTML = resolveFundingDisplay(item);
    tr.appendChild(fundingCell);

    const priceCell = document.createElement('td');
    priceCell.className = 'px-4 py-2';
    priceCell.textContent = resolvePriceDisplay(item);
    tr.appendChild(priceCell);

    if (proEnabled) {
        const oiCell = document.createElement('td');
        oiCell.className = 'px-4 py-2 pro-column';
        oiCell.textContent = resolveOpenInterestDisplay(item);
        tr.appendChild(oiCell);

        const liqCell = document.createElement('td');
        liqCell.className = 'px-4 py-2 pro-column';
        applyLiquidationStyling(liqCell, item.liquidation_risk);
        tr.appendChild(liqCell);
    }

    setRowDataAttributes(tr, item);

    return tr;
}

function resolveVolumeDisplay(item) {
    if (item.volume_formatted) return item.volume_formatted;
    if (Number.isFinite(item.volume)) return formatCompactUsd(item.volume);
    return '-';
}

function resolvePriceDisplay(item) {
    if (item.price_formatted) return item.price_formatted;
    if (Number.isFinite(item.price)) return formatPrice(item.price);
    return '-';
}

function resolveFundingDisplay(item) {
    if (item.funding_formatted) return item.funding_formatted;
    if (Number.isFinite(item.funding_rate)) {
        return formatFundingRate(item.funding_rate);
    }
    return 'N/A';
}

function resolveOpenInterestDisplay(item) {
    if (item.open_interest_formatted) return item.open_interest_formatted;
    if (Number.isFinite(item.open_interest_usd)) return formatCompactUsd(item.open_interest_usd);
    if (Number.isFinite(item.open_interest)) return formatCompactUsd(item.open_interest * (item.price || 1));
    return '-';
}

function resolvePriceChangeDisplay(item, rawValue) {
    if (item.price_change_formatted) return item.price_change_formatted;
    if (Number.isFinite(rawValue)) {
        const sign = rawValue > 0 ? '+' : '';
        return `${sign}${rawValue.toFixed(2)}%`;
    }
    return '-';
}

function applyLiquidationStyling(cell, value) {
    if (value === null || value === undefined || value === '') {
        cell.textContent = '-';
        return;
    }

    if (typeof value === 'string') {
        const normalized = value.toLowerCase();
        cell.textContent = value;
        if (normalized === 'high') {
            cell.classList.add('liq-risk-high');
        } else if (normalized === 'medium') {
            cell.classList.add('liq-risk-medium');
        } else if (normalized === 'low') {
            cell.classList.add('liq-risk-low');
        }
        return;
    }

    const numericValue = parseNumber(value);
    if (Number.isFinite(numericValue)) {
        cell.textContent = numericValue.toFixed(2);
        return;
    }

    cell.textContent = '-';
}

function formatCompactUsd(value) {
    if (!Number.isFinite(value)) return '-';
    const absValue = Math.abs(value);
    if (absValue >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (absValue >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (absValue >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
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
    const numeric = Math.abs(value) > 1 ? value : value * 100;
    return `${numeric.toFixed(4)}%`;
}

function parseNumber(value) {
    if (Number.isFinite(value)) return value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
}

function getSourceDataForSorting() {
    const integration = window.wsIntegration || {};
    const candidates = [
        integration._lastNonEmptyRows,
        window.dataCache,
        dataCache,
        window.originalDataCache,
        originalDataCache
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate) && candidate.length) {
            return candidate;
        }
    }

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
            return candidate;
        }
    }

    return [];
}

// Apply sorting to data array
function applySorting(data) {
    const helpers = window.sortingHelpers;
    if (helpers && typeof helpers.applySort === 'function') {
        const sorted = helpers.applySort(Array.isArray(data) ? data : [], sortState);
        if (Array.isArray(sorted)) {
            return sorted;
        }
        if (Array.isArray(data)) {
            return [...data];
        }
        return [];
    }

    if (!Array.isArray(data) || !sortState.column || !sortState.direction) {
        return Array.isArray(data) ? [...data] : [];
    }

    const column = sortState.column;
    const direction = sortState.direction === 'asc' ? 1 : -1;
    const fallback = [...data].map((item, index) => ({ item, index }));

    const getNumeric = (value) => (Number.isFinite(value) ? value : Number.NaN);

    fallback.sort((a, b) => {
        let aVal;
        let bVal;

        switch (column) {
            case 'asset':
                aVal = typeof a.item.asset === 'string' ? a.item.asset : '';
                bVal = typeof b.item.asset === 'string' ? b.item.asset : '';
                if (aVal === bVal) {
                    return a.index - b.index;
                }
                return direction * aVal.localeCompare(bVal);
            case 'volume':
                aVal = getNumeric(a.item.volume);
                bVal = getNumeric(b.item.volume);
                break;
            case 'price_change_pct':
                aVal = getNumeric(a.item.price_change_pct);
                bVal = getNumeric(b.item.price_change_pct);
                break;
            case 'funding_rate':
                aVal = getNumeric(a.item.funding_rate);
                bVal = getNumeric(b.item.funding_rate);
                break;
            case 'price':
                aVal = getNumeric(a.item.price);
                bVal = getNumeric(b.item.price);
                break;
            case 'open_interest':
                aVal = getNumeric(a.item.open_interest_usd);
                bVal = getNumeric(b.item.open_interest_usd);
                break;
            default:
                return a.index - b.index;
        }

        if (!Number.isFinite(aVal) && !Number.isFinite(bVal)) {
            return a.index - b.index;
        }
        if (!Number.isFinite(aVal)) {
            return 1;
        }
        if (!Number.isFinite(bVal)) {
            return -1;
        }

        const diff = aVal - bVal;
        if (diff === 0) {
            return a.index - b.index;
        }
        return direction * diff;
    });

    return fallback.map(entry => entry.item);
}

// Update visual sort indicators
function updateSortIndicators() {
    if (tableController) {
        tableController.updateIndicators();
        return;
    }

    // Update both desktop and mobile tables
    const tables = ['dataTable', 'mobileDataTable'];

    tables.forEach(tableId => {
        const table = document.getElementById(tableId);
        if (!table) return;

        // Remove all active indicators
        const headers = table.querySelectorAll('th.sortable');
        headers.forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            const indicator = th.querySelector('.sort-indicator');
            if (indicator) {
                indicator.textContent = '';
            }
        });

        // Add indicator to active column
        if (sortState.column && sortState.direction) {
            const activeHeader = table.querySelector(`th[data-column="${sortState.column}"]`);
            if (activeHeader) {
                const indicator = activeHeader.querySelector('.sort-indicator');
                if (indicator) {
                    if (sortState.direction === 'asc') {
                        activeHeader.classList.add('sort-asc');
                        // For Asset column: A to Z should show down arrow (▼)
                        // For other columns: ascending should show up arrow (▲)
                        indicator.textContent = sortState.column === 'asset' ? '▼' : '▲';
                    } else {
                        activeHeader.classList.add('sort-desc');
                        // For Asset column: Z to A should show up arrow (▲)
                        // For other columns: descending should show down arrow (▼)
                        indicator.textContent = sortState.column === 'asset' ? '▲' : '▼';
                    }
                }
            }
        }
    });
}

// ══════════════════════════════════════════════════════════════════════════════
// EMAIL CONFIRMATION (PRO TIER STEP 2)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Resend confirmation email to current user
 * Called when user clicks "Resend Email" button in confirmation banner
 */
async function resendConfirmation() {
    const button = document.getElementById('resendConfirmationBtn');

    if (!button) return;

    // Disable button during request
    button.disabled = true;
    const originalText = button.innerHTML;
    button.innerHTML = '<span class="resend-icon">⏳</span><span class="resend-text">Sending...</span>';

    try {
        const response = await fetch('/resend-confirmation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            // Success - show success message
            button.innerHTML = '<span class="resend-icon">✅</span><span class="resend-text">Email Sent!</span>';
            button.style.background = 'rgba(0, 255, 136, 0.15)';
            button.style.borderColor = 'rgba(0, 255, 136, 0.3)';
            button.style.color = '#00ff88';

            // Show success notification
            showNotification('📧 Confirmation email sent! Check your inbox.', 'success');

            // Re-enable button after 3 seconds
            setTimeout(() => {
                button.innerHTML = originalText;
                button.disabled = false;
                button.style.background = '';
                button.style.borderColor = '';
                button.style.color = '';
            }, 3000);
        } else {
            // Error - show error message
            button.innerHTML = '<span class="resend-icon">❌</span><span class="resend-text">Failed</span>';
            showNotification(`❌ ${data.message || 'Failed to send email'}`, 'error');

            // Re-enable button after 2 seconds
            setTimeout(() => {
                button.innerHTML = originalText;
                button.disabled = false;
            }, 2000);
        }
    } catch (error) {
        console.error('Error resending confirmation:', error);
        button.innerHTML = '<span class="resend-icon">❌</span><span class="resend-text">Error</span>';
        showNotification('❌ Network error. Please try again.', 'error');

        // Re-enable button after 2 seconds
        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 2000);
    }
}

/**
 * Show a temporary notification message
 * @param {string} message - Message to display
 * @param {string} type - Notification type ('success', 'error', 'info')
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? 'rgba(0, 255, 136, 0.15)' : 'rgba(239, 68, 68, 0.15)'};
        border: 1px solid ${type === 'success' ? 'rgba(0, 255, 136, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
        border-left: 4px solid ${type === 'success' ? '#00ff88' : '#ef4444'};
        color: ${type === 'success' ? '#00ff88' : '#ef4444'};
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-weight: 600;
        animation: slideInRight 0.4s ease-out;
        max-width: 400px;
    `;
    notification.textContent = message;

    // Add to page
    document.body.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.5s ease forwards';
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

// ══════════════════════════════════════════════════════════════════════════════
// MANUAL REFRESH (PRO TIER STEP 6)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Check if table container is scrollable and add visual indicator
 */
// Allow a little wiggle room so rounding errors or borders don't trigger overflow states
const WIDE_VIEWPORT_BREAKPOINT = 1280;
const HORIZONTAL_SCROLL_TOLERANCE_WIDE = 96;
const HORIZONTAL_SCROLL_TOLERANCE_DEFAULT = 24;

function resolveMeasurementTarget(container, measurementTarget) {
    if (measurementTarget) return measurementTarget;
    const table = container.querySelector('table');
    return table || container;
}

function measureHorizontalOverflow(container, measurementTarget) {
    if (!container) {
        return { overflowAmount: 0, hasOverflow: false };
    }

    const containerRect = container.getBoundingClientRect();
    if (!containerRect || containerRect.width <= 0) {
        return { overflowAmount: 0, hasOverflow: false };
    }

    const target = resolveMeasurementTarget(container, measurementTarget);
    const viewportWidth = Math.floor(container.clientWidth || containerRect.width || 0);
    const targetScrollWidth = target?.scrollWidth || 0;
    const targetBoundsWidth = target?.getBoundingClientRect ? target.getBoundingClientRect().width : 0;
    const containerScrollWidth = container.scrollWidth || 0;

    const contentWidth = Math.ceil(Math.max(targetScrollWidth, targetBoundsWidth, containerScrollWidth));
    const overflowAmount = Math.max(contentWidth - viewportWidth, 0);

    const tolerance = viewportWidth >= WIDE_VIEWPORT_BREAKPOINT
        ? HORIZONTAL_SCROLL_TOLERANCE_WIDE
        : HORIZONTAL_SCROLL_TOLERANCE_DEFAULT;

    return {
        overflowAmount,
        hasOverflow: overflowAmount > tolerance
    };
}

function updateHorizontalOverflowState(container, measurementTarget) {
    if (tableController) {
        tableController.updateOverflow();
        if (container) {
            return container.classList.contains('is-scrollable');
        }
        return false;
    }

    if (!container) return false;

    const { hasOverflow } = measureHorizontalOverflow(container, measurementTarget);

    container.classList.toggle('has-scroll', hasOverflow);

    if (hasOverflow) {
        container.style.setProperty('overflow-x', 'auto', 'important');
    } else {
        const prefersClip = typeof CSS !== 'undefined'
            && typeof CSS.supports === 'function'
            && CSS.supports('overflow-x', 'clip');
        container.style.setProperty('overflow-x', prefersClip ? 'clip' : 'hidden', 'important');
    }

    if (!hasOverflow) {
        container.classList.remove('scrolled');
        if (container.scrollLeft !== 0) {
            container.scrollLeft = 0;
        }
    }

    return hasOverflow;
}

function hasHorizontalOverflow(container, measurementTarget) {
    return measureHorizontalOverflow(container, measurementTarget).hasOverflow;
}

function checkTableScroll(container) {
    if (!container) return;

    if (tableController) {
        tableController.updateOverflow();
        return;
    }

    const table = container.querySelector('table');
    if (!table) return;

    updateHorizontalOverflowState(container, table);
}

// Check scroll on window resize
window.addEventListener('resize', () => {
    const tableContainer = document.getElementById('tableContainer');
    const mobileTableContainer = document.getElementById('mobileTableContainer');
    if (tableController) {
        tableController.updateOverflow();
    } else {
        if (tableContainer) checkTableScroll(tableContainer);
        if (mobileTableContainer) checkTableScroll(mobileTableContainer);
    }
});

/**
 * Add scroll event listeners to hide scroll hint after user scrolls
 */
function setupScrollHintDismissal() {
    const containers = [
        document.getElementById('tableContainer'),
        document.getElementById('mobileTableContainer')
    ];

    containers.forEach(container => {
        if (!container) return;

        // Hide hint after user scrolls horizontally
        container.addEventListener('scroll', function () {
            if (this.scrollLeft > 10) {
                this.classList.add('scrolled');
            }
        }, { passive: true });
    });
}

// Initialize scroll hint dismissal after DOM is ready
document.addEventListener('DOMContentLoaded', setupScrollHintDismissal);


// ===== BEAUTIFUL SCROLL INDICATOR MANAGEMENT =====
// Subtle, unobtrusive scroll indicators that appear only when needed
(function () {
    function wireScrollIndicator(container) {
        if (!container) return;

        function updateScrollState() {
            if (tableController) {
                tableController.updateOverflow();
            } else {
                updateHorizontalOverflowState(container);
            }
        }

        if (container.__overflowWired) {
            updateScrollState();
            return;
        }
        container.__overflowWired = true;

        if (typeof ResizeObserver !== 'undefined' && !container.__overflowObserver) {
            const observer = new ResizeObserver(() => updateScrollState());
            observer.observe(container);

            const table = container.querySelector('table');
            if (table) {
                observer.observe(table);
            }

            container.__overflowObserver = observer;
        }

        // Initial check
        updateScrollState();

        // Update on scroll
        container.addEventListener('scroll', () => {
            const scrolled = container.scrollLeft > 8;
            container.classList.toggle('scrolled', scrolled);
        }, { passive: true });

        // Update on resize
        window.addEventListener('resize', updateScrollState);

        if (typeof MutationObserver !== 'undefined' && !container.__overflowMutationObserver) {
            const mutationObserver = new MutationObserver(() => updateScrollState());
            mutationObserver.observe(container, { childList: true, subtree: true });
            container.__overflowMutationObserver = mutationObserver;
        } else {
            container.addEventListener('DOMSubtreeModified', updateScrollState);
        }
    }

    // Initialize for both desktop and mobile containers
    document.addEventListener('DOMContentLoaded', () => {
        wireScrollIndicator(document.getElementById('tableContainer'));
        wireScrollIndicator(document.getElementById('mobileTableContainer'));
    });

    // Re-check when data is loaded
    window.addEventListener('dataLoaded', () => {
        wireScrollIndicator(document.getElementById('tableContainer'));
        wireScrollIndicator(document.getElementById('mobileTableContainer'));
    });
})();

// One-time, auto-dismissing scroll hint
(function () {
    const HINT_KEY = 'bdScrollHintDismissed';

    function armHint(container) {
        if (!container) return;
        const show = () => {
            const hasScroll = updateHorizontalOverflowState(container);
            if (hasScroll && !localStorage.getItem(HINT_KEY)) {
                container.classList.add('show-hint');
                // auto-hide after 2.5s and never show again
                setTimeout(() => {
                    container.classList.remove('show-hint');
                    localStorage.setItem(HINT_KEY, '1');
                }, 2500);
            }
        };
        const dismiss = () => {
            container.classList.remove('show-hint');
            localStorage.setItem(HINT_KEY, '1');
        };
        show();
        container.addEventListener('scroll', () => {
            if (container.scrollLeft > 8) dismiss();
        }, { passive: true });
        window.addEventListener('resize', show);
    }

    document.addEventListener('DOMContentLoaded', () => {
        armHint(document.getElementById('tableContainer'));
        armHint(document.getElementById('mobileTableContainer'));
    });
})();

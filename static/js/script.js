// Global variables
let currentTheme = 'dark';
let dataCache = [];
let originalDataCache = []; // Store original order from API
let isDataLoading = false;
let isAnimating = false; // Track if table animation is in progress
let currentTab = 'market-data';
let unreadAlertsCount = 0;
let lastViewedAlertsCount = 0;

// User tier and refresh settings
let userTier = 0;
let refreshInterval = 15 * 60 * 1000; // Default to 15 min (Free tier)
let refreshTimer = null;

// Sorting state
let sortState = {
    column: null,      // 'asset', 'volume', 'funding_rate', 'price', or null
    direction: null    // 'asc', 'desc', or null (default)
};

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', async function () {
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
    const tabButtons = document.querySelectorAll('.tab-button');
    const mobileTabButtons = document.querySelectorAll('.mobile-tab-button');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });

    mobileTabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });
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

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
}

function toggleTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
}

function setTheme(theme) {
    currentTheme = theme;
    const body = document.body;
    const themeIcon = document.getElementById('themeIcon');

    if (theme === 'dark') {
        body.classList.remove('light-theme');
        themeIcon.textContent = '🌙';
    } else {
        body.classList.add('light-theme');
        themeIcon.textContent = '☀️';
    }
}

// Data Loading with Progressive Animation
async function loadData() {
    if (isDataLoading) return;

    isDataLoading = true;
    showLoading();

    try {
        const response = await fetch('/api/data');
        const result = await response.json();

        if (result.success) {
            originalDataCache = result.data; // Store original order
            dataCache = applySorting([...result.data]); // Apply current sorting
            hideLoading(); // Hide loading first
            await displayDataProgressive(dataCache);
            updateLastUpdated();
            showDownloadButton();
            updateSortIndicators();
        } else {
            showError('Failed to load data: ' + result.error);
        }
    } catch (error) {
        showError('Network error: ' + error.message);
    } finally {
        isDataLoading = false;
    }
}

// Progressive Data Display
async function displayDataProgressive(data) {
    isAnimating = true; // Set animation flag
    disableSortHeaders(); // Disable clicking during animation

    // Desktop display
    const tableBody = document.getElementById('tableBody');
    const tableContainer = document.getElementById('tableContainer');

    // Mobile display
    const mobileTableBody = document.getElementById('mobileTableBody');
    const mobileTableContainer = document.getElementById('mobileTableContainer');

    // Clear existing data
    if (tableBody) tableBody.innerHTML = '';
    if (mobileTableBody) mobileTableBody.innerHTML = '';

    // Show table containers
    if (tableContainer) tableContainer.style.display = 'block';
    if (mobileTableContainer) mobileTableContainer.style.display = 'block';

    // Add rows progressively with animation
    for (let i = 0; i < data.length; i++) {
        const row = createTableRow(data[i], i);
        const mobileRow = createTableRow(data[i], i);

        if (tableBody) tableBody.appendChild(row);
        if (mobileTableBody) mobileTableBody.appendChild(mobileRow);

        // Animate row appearance
        setTimeout(() => {
            if (row) row.classList.add('table-row');
            if (mobileRow) mobileRow.classList.add('table-row');
        }, i * 50); // 50ms delay between rows for faster loading

        // Start rolling animation for this row only
        setTimeout(() => {
            if (row) startCharacterCyclingForRow(row);
            if (mobileRow) startCharacterCyclingForRow(mobileRow);
        }, i * 50 + 100); // Start rolling 100ms after row appears

        // Small delay to show progressive loading
        await new Promise(resolve => setTimeout(resolve, 25));
    }

    // Calculate total animation time and clear flag when done
    const totalAnimationTime = data.length * 50 + 800; // rows * delay + rolling animation time (reduced)
    setTimeout(() => {
        isAnimating = false;
        enableSortHeaders(); // Re-enable clicking after animation
    }, totalAnimationTime);
}

// Create Table Row with Rolling Animations
function createTableRow(item, index) {
    const row = document.createElement('tr');
    row.style.animationDelay = `${index * 0.1}s`;

    // Asset column with rolling animation for letters only
    const assetCell = document.createElement('td');
    assetCell.innerHTML = createRollingText(item.asset, 0.1, true); // isTicker = true
    row.appendChild(assetCell);

    // Volume column with rolling animation for numbers only
    const volumeCell = document.createElement('td');
    volumeCell.innerHTML = createRollingText(item.volume_formatted, 0.1, false); // isTicker = false
    row.appendChild(volumeCell);

    // Funding rate column with rolling animation and color coding
    const fundingCell = document.createElement('td');
    const fundingRate = item.funding_rate;
    if (fundingRate !== null && fundingRate !== undefined) {
        if (fundingRate > 0.03) {
            fundingCell.className = 'funding-positive';
        } else if (fundingRate < -0.03) {
            fundingCell.className = 'funding-negative';
        }
    }
    fundingCell.innerHTML = createRollingText(item.funding_formatted, 0.1, false); // isTicker = false
    row.appendChild(fundingCell);

    // Price column with rolling animation for numbers only
    const priceCell = document.createElement('td');
    priceCell.innerHTML = createRollingText(item.price_formatted, 0.1, false); // isTicker = false
    row.appendChild(priceCell);

    return row;
}

// Create Railway Station Style Rolling Text Animation
function createRollingText(text, delay = 0.2, isTicker = false) {
    const chars = text.split('');
    let rollingHTML = '<span class="rolling-container">';

    chars.forEach((char, index) => {
        // For tickers: roll all letters including M and B
        if (isTicker && char.match(/[A-Z]/)) {
            const randomChars = generateRandomChars(char, 6, 'letters');
            rollingHTML += `<span class="rolling-char railway-style" style="animation-delay: ${index * delay}s" data-final="${char}" data-chars="${randomChars.join('')}">${randomChars[0]}</span>`;
        }
        // For volumes/prices: don't roll $, %, ., M, B - keep them static
        else if (!isTicker && (char === '$' || char === '%' || char === '.' || char === 'M' || char === 'B')) {
            rollingHTML += char;
        }
        // For numbers/volumes/prices: only roll digits
        else if (!isTicker && char.match(/[0-9]/)) {
            const randomChars = generateRandomChars(char, 6, 'numbers');
            rollingHTML += `<span class="rolling-char railway-style" style="animation-delay: ${index * delay}s" data-final="${char}" data-chars="${randomChars.join('')}">${randomChars[0]}</span>`;
        }
        // Keep other characters static
        else {
            rollingHTML += char;
        }
    });

    rollingHTML += '</span>';

    return rollingHTML;
}

// Start character cycling animation for a specific row
function startCharacterCyclingForRow(row) {
    const rollingChars = row.querySelectorAll('.rolling-char.railway-style');

    rollingChars.forEach((charElement, index) => {
        const finalChar = charElement.getAttribute('data-final');
        const allChars = charElement.getAttribute('data-chars');
        const charArray = allChars.split('');

        // Cycle through characters with shorter duration
        let currentIndex = 0;
        const cycleInterval = setInterval(() => {
            charElement.textContent = charArray[currentIndex];
            currentIndex++;

            if (currentIndex >= charArray.length) {
                clearInterval(cycleInterval);
                charElement.textContent = finalChar; // Final character
            }
        }, 200); // Change character every 200ms for 1.2s total (6 chars * 200ms)
    });
}

// Start character cycling animation (legacy function for backward compatibility)
function startCharacterCycling() {
    const rollingChars = document.querySelectorAll('.rolling-char.railway-style');

    rollingChars.forEach((charElement, index) => {
        const finalChar = charElement.getAttribute('data-final');
        const allChars = charElement.getAttribute('data-chars');
        const charArray = allChars.split('');

        // Cycle through characters with shorter duration
        let currentIndex = 0;
        const cycleInterval = setInterval(() => {
            charElement.textContent = charArray[currentIndex];
            currentIndex++;

            if (currentIndex >= charArray.length) {
                clearInterval(cycleInterval);
                charElement.textContent = finalChar; // Final character
            }
        }, 200); // Change character every 200ms for 1.2s total (6 chars * 200ms)
    });
}

// Generate random characters for railway station effect
function generateRandomChars(finalChar, count, type = 'mixed') {
    let chars;
    if (type === 'letters') {
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    } else if (type === 'numbers') {
        chars = '0123456789';
    } else {
        chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    }

    const randomChars = [];

    for (let i = 0; i < count - 1; i++) {
        randomChars.push(chars[Math.floor(Math.random() * chars.length)]);
    }
    randomChars.push(finalChar); // Final character is the correct one

    return randomChars;
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

async function downloadWatchlist() {
    try {
        const response = await fetch('/api/watchlist');
        const result = await response.json();

        if (result.success) {
            const blob = new Blob([result.watchlist], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'tradingview_watchlist.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
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

    saveSortState();

    // Apply sorting and redisplay - use fresh copy of original data
    dataCache = applySorting([...originalDataCache]);
    displayDataProgressive(dataCache);
    updateSortIndicators();
}

// Apply sorting to data array
function applySorting(data) {
    if (!sortState.column || !sortState.direction) {
        // No sorting - return original order
        return data;
    }

    const sorted = [...data];

    sorted.sort((a, b) => {
        let aVal, bVal;

        switch (sortState.column) {
            case 'asset':
                aVal = a.asset;
                bVal = b.asset;
                break;
            case 'volume':
                aVal = a.volume;
                bVal = b.volume;
                break;
            case 'funding_rate':
                aVal = a.funding_rate !== null ? a.funding_rate : -Infinity;
                bVal = b.funding_rate !== null ? b.funding_rate : -Infinity;
                break;
            case 'price':
                aVal = a.price;
                bVal = b.price;
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
        return sortState.direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
}

// Update visual sort indicators
function updateSortIndicators() {

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
                        indicator.textContent = '▲';
                    } else {
                        activeHeader.classList.add('sort-desc');
                        indicator.textContent = '▼';
                    }
                }
            }
        }
    });
}

// Disable sort headers during animation
function disableSortHeaders() {
    const headers = document.querySelectorAll('th.sortable');
    headers.forEach(th => {
        th.classList.add('disabled');
        th.style.pointerEvents = 'none';
    });
}

// Enable sort headers after animation
function enableSortHeaders() {
    const headers = document.querySelectorAll('th.sortable');
    headers.forEach(th => {
        th.classList.remove('disabled');
        th.style.pointerEvents = 'auto';
    });
}

(function (global) {
    const SUFFIX_MULTIPLIERS = {
        K: 1e3,
        M: 1e6,
        B: 1e9,
        T: 1e12
    };

    const DEFAULT_SORT_STATE = { column: null, direction: null };

    const OVERFLOW_TOLERANCE_NARROW = 8;
    const OVERFLOW_TOLERANCE_WIDE = 32;
    const WIDE_VIEWPORT_BREAKPOINT = 1440;

    function parseNumeric(value) {
        if (value === null || value === undefined) {
            return NaN;
        }

        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : NaN;
        }

        if (typeof value !== 'string') {
            return NaN;
        }

        let cleaned = value.trim();
        if (!cleaned.length) {
            return NaN;
        }

        // Strip HTML tags
        cleaned = cleaned.replace(/<[^>]*>/g, '');

        let multiplier = 1;
        const suffix = cleaned.slice(-1).toUpperCase();
        if (SUFFIX_MULTIPLIERS[suffix]) {
            multiplier = SUFFIX_MULTIPLIERS[suffix];
            cleaned = cleaned.slice(0, -1);
        }

        cleaned = cleaned
            .replace(/[,\s]/g, '')
            .replace(/\$/g, '')
            .replace(/%$/, '')
            .replace(/--/g, '-')
            .replace(/\((.*)\)/, '-$1');

        if (!cleaned.length) {
            return NaN;
        }

        const numeric = Number.parseFloat(cleaned);
        return Number.isFinite(numeric) ? numeric * multiplier : NaN;
    }

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

    class MarketTableController {
        constructor(options = {}) {
            this.desktop = {
                container: null,
                table: null,
                body: null
            };
            this.mobile = {
                container: null,
                table: null,
                body: null
            };

            this.hasProMetrics = false;
            this.sortState = { ...DEFAULT_SORT_STATE };
            this.sourceRows = [];
            this.displayRows = [];

            this.selectors = options.selectors || {
                desktopContainer: '#tableContainer',
                desktopTable: '#dataTable',
                desktopBody: '#tableBody',
                mobileContainer: '#mobileTableContainer',
                mobileTable: '#mobileDataTable',
                mobileBody: '#mobileTableBody'
            };
        }

        attach() {
            const {
                desktopContainer,
                desktopTable,
                desktopBody,
                mobileContainer,
                mobileTable,
                mobileBody
            } = this.selectors;

            this.desktop.container = document.querySelector(desktopContainer);
            this.desktop.table = document.querySelector(desktopTable);
            this.desktop.body = document.querySelector(desktopBody);

            this.mobile.container = document.querySelector(mobileContainer);
            this.mobile.table = document.querySelector(mobileTable);
            this.mobile.body = document.querySelector(mobileBody);
        }

        setHasProMetrics(flag) {
            this.hasProMetrics = Boolean(flag);
            if (this.desktop.table) {
                this.desktop.table.classList.toggle('has-pro-columns', this.hasProMetrics);
            }
            if (this.mobile.table) {
                this.mobile.table.classList.toggle('has-pro-columns', this.hasProMetrics);
            }
        }

        getSortState() {
            return { ...this.sortState };
        }

        getDisplayRows() {
            return this.displayRows.map(row => ({ ...row.original }));
        }

        getSourceRows() {
            return this.sourceRows.map(row => ({ ...row.original }));
        }

        toggleSort(column) {
            if (!column) return;

            if (this.sortState.column === column) {
                if (this.sortState.direction === 'asc') {
                    this.sortState.direction = 'desc';
                } else if (this.sortState.direction === 'desc') {
                    this.sortState = { ...DEFAULT_SORT_STATE };
                } else {
                    this.sortState.direction = column === 'asset' ? 'asc' : 'desc';
                }
            } else {
                this.sortState.column = column;
                this.sortState.direction = column === 'asset' ? 'asc' : 'desc';
            }

            this.refreshDisplay();
        }

        setSortState(state) {
            if (!state) return;
            this.sortState = {
                column: state.column || null,
                direction: state.direction || null
            };
            this.refreshDisplay();
        }

        ingest(rows = [], { replaceSource = true } = {}) {
            const normalized = Array.isArray(rows) ? rows.map(row => this.normalizeRow(row)) : [];

            if (replaceSource) {
                this.sourceRows = normalized;
            } else {
                this.sourceRows = this.mergeRows(this.sourceRows, normalized);
            }

            this.refreshDisplay();
        }

        mergeRows(existing, incoming) {
            if (!Array.isArray(existing) || existing.length === 0) {
                return incoming;
            }

            const byAsset = new Map();
            existing.forEach(row => {
                byAsset.set(row.assetKey, row);
            });

            incoming.forEach(row => {
                byAsset.set(row.assetKey, row);
            });

            return Array.from(byAsset.values());
        }

        refreshDisplay() {
            const sorted = this.applySorting([...this.sourceRows]);
            this.displayRows = sorted;

            this.renderTable(this.desktop.body, sorted, { mode: 'desktop' });
            this.renderTable(this.mobile.body, sorted, { mode: 'mobile' });

            this.updateVisibility();
            this.updateIndicators();
            this.updateOverflow();

            global.dataCache = this.getDisplayRows();
            global.originalDataCache = this.getSourceRows();
            global.sortState = this.getSortState();
        }

        updateVisibility() {
            const show = (el) => el && el.style && (el.style.display = 'block');
            const hide = (el) => el && el.style && (el.style.display = 'none');

            if (this.desktop.container) {
                if (this.displayRows.length) {
                    show(this.desktop.container);
                } else {
                    hide(this.desktop.container);
                }
            }

            if (this.mobile.container) {
                if (this.displayRows.length) {
                    show(this.mobile.container);
                } else {
                    hide(this.mobile.container);
                }
            }
        }

        applySorting(rows) {
            const { column, direction } = this.sortState;
            if (!column || !direction) {
                return rows;
            }

            const dir = direction === 'asc' ? 1 : -1;

            const comparator = (a, b) => {
                if (column === 'asset') {
                    const aName = a.assetName;
                    const bName = b.assetName;
                    if (aName === bName) {
                        return 0;
                    }
                    return dir * aName.localeCompare(bName, undefined, { sensitivity: 'base' });
                }

                const aValue = a.metrics[column];
                const bValue = b.metrics[column];

                const aMissing = !Number.isFinite(aValue);
                const bMissing = !Number.isFinite(bValue);

                if (aMissing && bMissing) return 0;
                if (aMissing) return 1;
                if (bMissing) return -1;

                if (aValue === bValue) return 0;
                return dir * (aValue - bValue);
            };

            rows.sort(comparator);
            return rows;
        }

        renderTable(tbody, rows, { mode }) {
            if (!tbody) return;
            tbody.innerHTML = '';
            const fragment = document.createDocumentFragment();

            rows.forEach(row => {
                fragment.appendChild(this.buildRow(row, mode));
            });

            tbody.appendChild(fragment);
        }

        buildRow(row, mode) {
            const tr = document.createElement('tr');
            tr.dataset.asset = row.assetKey;

            const assetCell = document.createElement('td');
            assetCell.className = mode === 'desktop' ? 'px-4 py-2 font-medium' : 'px-3 py-2 font-medium';
            assetCell.textContent = row.assetName;
            tr.appendChild(assetCell);

            const volumeCell = document.createElement('td');
            volumeCell.className = mode === 'desktop' ? 'px-4 py-2' : 'px-3 py-2';
            volumeCell.textContent = row.display.volume;
            tr.appendChild(volumeCell);

            if (this.hasProMetrics) {
                const priceChangeCell = document.createElement('td');
                priceChangeCell.className = `${mode === 'desktop' ? 'px-4 py-2' : 'px-3 py-2'} pro-column`;
                priceChangeCell.textContent = row.display.price_change_pct;
                if (Number.isFinite(row.metrics.price_change_pct)) {
                    if (row.metrics.price_change_pct > 0) {
                        priceChangeCell.classList.add('price-change-positive');
                    } else if (row.metrics.price_change_pct < 0) {
                        priceChangeCell.classList.add('price-change-negative');
                    }
                }
                tr.appendChild(priceChangeCell);
            }

            const fundingCell = document.createElement('td');
            fundingCell.className = mode === 'desktop' ? 'px-4 py-2' : 'px-3 py-2';
            fundingCell.innerHTML = row.display.funding_rate;
            tr.appendChild(fundingCell);

            const priceCell = document.createElement('td');
            priceCell.className = mode === 'desktop' ? 'px-4 py-2' : 'px-3 py-2';
            priceCell.textContent = row.display.price;
            tr.appendChild(priceCell);

            if (this.hasProMetrics) {
                const oiCell = document.createElement('td');
                oiCell.className = `${mode === 'desktop' ? 'px-4 py-2' : 'px-3 py-2'} pro-column`;
                oiCell.textContent = row.display.open_interest;
                tr.appendChild(oiCell);

                const liqCell = document.createElement('td');
                liqCell.className = `${mode === 'desktop' ? 'px-4 py-2' : 'px-3 py-2'} pro-column`;
                this.applyLiquidationDisplay(liqCell, row.display.liquidation_risk);
                tr.appendChild(liqCell);
            }

            return tr;
        }

        applyLiquidationDisplay(cell, value) {
            if (!value || value === '-') {
                cell.textContent = '-';
                return;
            }

            const normalized = String(value).toLowerCase();
            cell.textContent = value;

            if (normalized === 'high') {
                cell.classList.add('liq-risk-high');
            } else if (normalized === 'medium') {
                cell.classList.add('liq-risk-medium');
            } else if (normalized === 'low') {
                cell.classList.add('liq-risk-low');
            }
        }

        updateIndicators() {
            const tables = [this.desktop.table, this.mobile.table];
            const state = this.sortState;

            tables.forEach(table => {
                if (!table) return;
                const headers = table.querySelectorAll('th.sortable');
                headers.forEach(header => {
                    header.classList.remove('sort-asc', 'sort-desc');
                    const indicator = header.querySelector('.sort-indicator');
                    if (indicator) {
                        indicator.textContent = '';
                    }
                });

                if (!state.column || !state.direction) return;

                const active = table.querySelector(`th[data-column="${state.column}"]`);
                if (!active) return;

                active.classList.add(state.direction === 'asc' ? 'sort-asc' : 'sort-desc');
                const indicator = active.querySelector('.sort-indicator');
                if (!indicator) return;

                const arrow = state.direction === 'asc' ? '▲' : '▼';

                indicator.textContent = arrow;
            });
        }

        updateOverflow() {
            [this.desktop, this.mobile].forEach(entry => {
                if (!entry.container || !entry.table) return;

                const tolerance = window.innerWidth >= WIDE_VIEWPORT_BREAKPOINT
                    ? OVERFLOW_TOLERANCE_WIDE
                    : OVERFLOW_TOLERANCE_NARROW;

                const containerWidth = entry.container.clientWidth;
                const contentWidth = entry.table.scrollWidth;
                const hasOverflow = contentWidth - containerWidth > tolerance;

                entry.container.classList.toggle('is-scrollable', hasOverflow);
                entry.container.style.overflowX = hasOverflow ? 'auto' : 'hidden';
            });
        }

        normalizeRow(raw = {}) {
            const asset = this.resolveAsset(raw);
            const safeAsset = asset || (typeof raw.symbol === 'string'
                ? raw.symbol.replace(/USDT$/i, '').toUpperCase()
                : '-');

            const volume = this.resolveNumber(raw, ['volume', 'volume_usd', 'vol24hQuote']);
            const price = this.resolveNumber(raw, ['price', 'lastPrice']);
            const funding = this.resolveNumber(raw, ['funding_rate', 'fundingRate']);
            const priceChange = this.resolveNumber(raw, ['price_change_pct', 'changePct']);
            const openInterest = this.resolveNumber(raw, ['open_interest_usd', 'open_interest', 'openInterest']);

            return {
                assetKey: safeAsset.toUpperCase(),
                assetName: safeAsset,
                original: { ...raw },
                metrics: {
                    asset: safeAsset,
                    volume,
                    price,
                    funding_rate: funding,
                    price_change_pct: priceChange,
                    open_interest: openInterest
                },
                display: {
                    volume: this.resolveDisplay(raw, ['volume_formatted'], formatCompactUsd(volume)),
                    funding_rate: this.resolveDisplay(raw, ['funding_formatted'], formatFundingRate(funding)),
                    price: this.resolveDisplay(raw, ['price_formatted'], formatPrice(price)),
                    price_change_pct: this.resolveDisplay(raw, ['price_change_formatted'], Number.isFinite(priceChange) ? `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%` : '-'),
                    open_interest: this.resolveDisplay(raw, ['open_interest_formatted'], Number.isFinite(openInterest) ? formatCompactUsd(openInterest) : '-'),
                    liquidation_risk: raw.liquidation_risk ?? raw.liquidationRisk ?? '-'
                }
            };
        }

        resolveAsset(raw) {
            const candidates = [raw.asset, raw.symbol, raw.pair, raw.symbol?.replace?.('USDT', '')];
            for (const candidate of candidates) {
                if (typeof candidate === 'string' && candidate.trim()) {
                    return candidate.replace(/USDT$/i, '').trim().toUpperCase();
                }
            }
            return '';
        }

        resolveNumber(raw, keys) {
            for (const key of keys) {
                if (key in raw) {
                    const value = raw[key];
                    const numeric = parseNumeric(value);
                    if (Number.isFinite(numeric)) {
                        return numeric;
                    }
                }
            }
            return NaN;
        }

        resolveDisplay(raw, keys, fallback = '-') {
            for (const key of keys) {
                if (raw[key]) {
                    return raw[key];
                }
            }
            return fallback;
        }
    }

    global.MarketTableController = MarketTableController;
})(typeof window !== 'undefined' ? window : this);

(function initializeSortingHelpers(global) {
    if (!global) return;

    const STRIP_HTML_REGEX = /<[^>]*>/g;
    const NON_NUMERIC_REGEX = /[^0-9eE+\-\.]/g;

    const stripHtmlTags = (value) => {
        if (typeof value !== 'string') return value;
        return value.replace(STRIP_HTML_REGEX, '');
    };

    const normalizeSuffix = (value = '') => {
        if (!value.length) return '';
        return value.slice(-1).toUpperCase();
    };

    const parseNumericString = (value, { treatPercentAs = 'raw' } = {}) => {
        if (value === null || value === undefined) {
            return Number.NaN;
        }

        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : Number.NaN;
        }

        if (typeof value !== 'string') {
            return Number.NaN;
        }

        let cleaned = stripHtmlTags(value).trim();
        if (!cleaned) {
            return Number.NaN;
        }

        let multiplier = 1;
        let percentDetected = false;

        if (cleaned.endsWith('%')) {
            percentDetected = true;
            cleaned = cleaned.slice(0, -1);
        }

        const suffix = normalizeSuffix(cleaned);
        if (['K', 'M', 'B', 'T'].includes(suffix)) {
            switch (suffix) {
                case 'K':
                    multiplier = 1e3;
                    break;
                case 'M':
                    multiplier = 1e6;
                    break;
                case 'B':
                    multiplier = 1e9;
                    break;
                case 'T':
                    multiplier = 1e12;
                    break;
                default:
                    multiplier = 1;
            }
            cleaned = cleaned.slice(0, -1);
        }

        cleaned = cleaned
            .replace(/[,\s]/g, '')
            .replace(/\$/g, '')
            .replace(/--/g, '-')
            .replace(/\((.*)\)/, '-$1');

        if (!cleaned) {
            return Number.NaN;
        }

        // Allow scientific notation and decimals only
        if (NON_NUMERIC_REGEX.test(cleaned.replace(/[eE][+\-]?\d+$/, ''))) {
            cleaned = cleaned.replace(NON_NUMERIC_REGEX, '');
        }

        const numeric = Number.parseFloat(cleaned);
        if (!Number.isFinite(numeric)) {
            return Number.NaN;
        }

        if (percentDetected) {
            if (treatPercentAs === 'decimal') {
                return numeric * multiplier * 0.01;
            }
            return numeric * multiplier;
        }

        return numeric * multiplier;
    };

    const resolveFromObject = (item, keys, { treatPercentAs } = {}) => {
        if (!item || !keys) return Number.NaN;
        const lookupKeys = Array.isArray(keys) ? keys : [keys];

        for (const key of lookupKeys) {
            if (key in item) {
                const rawValue = item[key];
                const numeric = parseNumericString(rawValue, { treatPercentAs });
                if (Number.isFinite(numeric)) {
                    return numeric;
                }
            }
        }

        return Number.NaN;
    };

    const normalizeAsset = (item) => {
        const candidates = [
            item?.asset,
            item?.symbol,
            item?.pair,
            item?.datasetAsset
        ];

        for (const candidate of candidates) {
            if (typeof candidate === 'string' && candidate.trim()) {
                return candidate.replace(/USDT$/i, '').trim().toUpperCase();
            }
        }

        return '';
    };

    const columnKeyMap = {
        volume: ['volume', 'volume_usd', 'volume_quote', 'vol24hQuote', 'notional'],
        price_change_pct: ['price_change_pct', 'change_pct', 'changePct', 'price_change_formatted'],
        funding_rate: ['funding_rate', 'fundingRate', 'funding_formatted'],
        price: ['price', 'lastPrice', 'price_formatted'],
        open_interest: ['open_interest_usd', 'open_interest', 'oiUsd', 'open_interest_formatted']
    };

    const buildSortMeta = (item, column) => {
        if (column === 'asset') {
            const value = normalizeAsset(item);
            return { type: 'string', value, missing: value.length === 0 };
        }

        const treatPercentAs = (column === 'price_change_pct' || column === 'funding_rate') ? 'raw' : 'decimal';
        const numeric = resolveFromObject(item, columnKeyMap[column] || column, { treatPercentAs });

        return {
            type: 'number',
            value: numeric,
            missing: !Number.isFinite(numeric)
        };
    };

    const compareByMeta = (left, right, column, direction) => {
        const aMeta = buildSortMeta(left.item, column);
        const bMeta = buildSortMeta(right.item, column);

        if (aMeta.missing && bMeta.missing) {
            return left.index - right.index;
        }
        if (aMeta.missing) {
            return 1;
        }
        if (bMeta.missing) {
            return -1;
        }

        if (aMeta.type === 'string' || bMeta.type === 'string') {
            const comparison = aMeta.value.localeCompare(bMeta.value, undefined, { sensitivity: 'base' });
            if (comparison !== 0) {
                return direction === 'asc' ? comparison : -comparison;
            }
            return left.index - right.index;
        }

        if (aMeta.value === bMeta.value) {
            return left.index - right.index;
        }

        const multiplier = direction === 'asc' ? 1 : -1;
        return (aMeta.value - bMeta.value) * multiplier;
    };

    const applySort = (data, state = {}) => {
        if (!Array.isArray(data)) {
            return [];
        }

        const column = state.column;
        const direction = state.direction === 'asc' ? 'asc' : state.direction === 'desc' ? 'desc' : null;

        if (!column || !direction) {
            return [...data];
        }

        const working = data.map((item, index) => ({ item, index }));
        working.sort((left, right) => compareByMeta(left, right, column, direction));
        return working.map(entry => entry.item);
    };

    const helpers = {
        stripHtmlTags,
        parseNumericString,
        applySort
    };

    global.sortingHelpers = helpers;
    if (!global.sortState) {
        global.sortState = { column: null, direction: null };
    }
})(typeof window !== 'undefined' ? window : this);

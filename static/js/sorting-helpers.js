(function initializeSortingHelpers(global) {
    if (!global) return;

    const stripHtmlTags = (value) => {
        if (typeof value !== 'string') return value;
        return value.replace(/<[^>]*>/g, '');
    };

    const parseNumericString = (value, options = {}) => {
        if (typeof value !== 'string') return Number.NaN;
        const { percentAsDecimal = false } = options;
        let cleaned = stripHtmlTags(value)
            .replace(/[$,]/g, '')
            .replace(/\s+/g, '')
            .trim();

        if (!cleaned) {
            return Number.NaN;
        }

        let multiplier = 1;
        let hasPercent = false;

        if (cleaned.endsWith('%')) {
            hasPercent = true;
            cleaned = cleaned.slice(0, -1);
        }

        const suffix = cleaned.slice(-1).toUpperCase();
        if (['K', 'M', 'B', 'T'].includes(suffix)) {
            switch (suffix) {
                case 'K':
                    multiplier *= 1e3;
                    break;
                case 'M':
                    multiplier *= 1e6;
                    break;
                case 'B':
                    multiplier *= 1e9;
                    break;
                case 'T':
                    multiplier *= 1e12;
                    break;
                default:
                    break;
            }
            cleaned = cleaned.slice(0, -1);
        }

        const numeric = parseFloat(cleaned);
        if (!Number.isFinite(numeric)) {
            return Number.NaN;
        }

        if (hasPercent && percentAsDecimal) {
            return numeric * multiplier * 0.01;
        }

        return numeric * multiplier;
    };

    const coerceNumeric = (primaryValue, fallbacks = [], options = {}) => {
        if (Number.isFinite(primaryValue)) {
            return primaryValue;
        }

        const sources = Array.isArray(fallbacks) ? fallbacks : [fallbacks];
        for (const candidate of sources) {
            const parsed = parseNumericString(candidate, options);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }

        return Number.NaN;
    };

    const normalizeAsset = (item) => {
        if (typeof item?.asset === 'string' && item.asset.trim().length) {
            return item.asset.trim().toUpperCase();
        }
        if (typeof item?.symbol === 'string' && item.symbol.trim().length) {
            return item.symbol.replace(/USDT$/i, '').trim().toUpperCase();
        }
        return '';
    };

    const buildSortMeta = (item, column) => {
        switch (column) {
            case 'asset': {
                const value = normalizeAsset(item);
                return { type: 'string', value, missing: value.length === 0 };
            }
            case 'volume': {
                const value = coerceNumeric(item?.volume, item?.volume_formatted);
                return { type: 'number', value, missing: !Number.isFinite(value) };
            }
            case 'price_change_pct': {
                const value = coerceNumeric(item?.price_change_pct, item?.price_change_formatted);
                return { type: 'number', value, missing: !Number.isFinite(value) };
            }
            case 'funding_rate': {
                const value = coerceNumeric(item?.funding_rate, item?.funding_formatted);
                return { type: 'number', value, missing: !Number.isFinite(value) };
            }
            case 'price': {
                const value = coerceNumeric(item?.price, item?.price_formatted);
                return { type: 'number', value, missing: !Number.isFinite(value) };
            }
            case 'open_interest': {
                const value = coerceNumeric(item?.open_interest_usd, item?.open_interest_formatted);
                return { type: 'number', value, missing: !Number.isFinite(value) };
            }
            default:
                return { type: 'number', value: Number.NaN, missing: true };
        }
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
            const comparison = aMeta.value.localeCompare(bMeta.value);
            if (comparison !== 0) {
                return direction === 'asc' ? comparison : -comparison;
            }
            return left.index - right.index;
        }

        const diff = aMeta.value - bMeta.value;
        if (Number.isFinite(diff) && diff !== 0) {
            return direction === 'asc' ? diff : -diff;
        }

        return left.index - right.index;
    };

    const applySort = (data, state = {}) => {
        if (!Array.isArray(data)) {
            return [];
        }
        if (!state.column || !state.direction) {
            return [...data];
        }

        const direction = state.direction === 'asc' ? 'asc' : 'desc';
        const working = data.map((item, index) => ({ item, index }));

        working.sort((a, b) => compareByMeta(a, b, state.column, direction));

        return working.map(entry => entry.item);
    };

    const helpers = {
        stripHtmlTags,
        parseNumericString,
        coerceNumeric,
        buildSortMeta,
        applySort
    };

    global.sortingHelpers = helpers;
    if (!global.sortState) {
        global.sortState = { column: null, direction: null };
    }
})(typeof window !== 'undefined' ? window : this);

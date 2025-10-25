import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCompactUsd(value: number): string {
    if (!Number.isFinite(value)) return '-';

    const abs = Math.abs(value);
    if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function formatPrice(value: number): string {
    if (!Number.isFinite(value)) return '-';

    if (value < 0.01) return `$${value.toFixed(6)}`;
    if (value < 1) return `$${value.toFixed(4)}`;
    if (value < 100) return `$${value.toFixed(3)}`;
    return `$${value.toFixed(2)}`;
}

export function formatPercentage(value: number): string {
    if (!Number.isFinite(value)) return 'N/A';
    return `${value.toFixed(2)}%`;
}

export function formatNumber(value: number, decimals: number = 2): string {
    if (!Number.isFinite(value)) return '-';
    return value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

export function formatTimestamp(timestamp: string | Date): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

export function formatDate(timestamp: string | Date): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

export function getTierName(tier: number): string {
    switch (tier) {
        case 0: return 'Free';
        case 1: return 'Pro';
        case 2: return 'Elite';
        default: return 'Unknown';
    }
}

export function getTierColor(tier: number): string {
    switch (tier) {
        case 0: return 'text-gray-500';
        case 1: return 'text-blue-500';
        case 2: return 'text-primary-500';
        default: return 'text-gray-500';
    }
}

export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;

    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function isValidWalletAddress(address: string): boolean {
    // Ethereum address validation
    const ethRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethRegex.test(address);
}

export function truncateAddress(address: string, start: number = 6, end: number = 4): string {
    if (address.length <= start + end) return address;
    return `${address.slice(0, start)}...${address.slice(-end)}`;
}

export function generateId(): string {
    return Math.random().toString(36).substr(2, 9);
}

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
): Promise<T> {
    return new Promise((resolve, reject) => {
        let attempts = 0;

        const attempt = async () => {
            try {
                const result = await fn();
                resolve(result);
            } catch (error) {
                attempts++;
                if (attempts >= maxAttempts) {
                    reject(error);
                } else {
                    setTimeout(attempt, delay * Math.pow(2, attempts - 1));
                }
            }
        };

        attempt();
    });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
    outputFileTracingRoot: __dirname,
    images: {
        domains: ['localhost'],
    },
    env: {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    },
    webpack: (config) => {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            '@react-native-async-storage/async-storage': false,
            'react-native': false,
        };
        return config;
    },
    async headers() {
        return [
            {
                // Scope narrowly to avoid breaking public/marketing pages
                source: '/(dashboard|admin)(?:/.*)?',
                headers: [
                    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
                    { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
                    { key: 'Origin-Agent-Cluster', value: '?1' },
                ],
            },
            {
                // Helpful for your own static assets when using COEP
                source: '/_next/(.*)',
                headers: [
                    { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
                ],
            },
        ];
    },
    async rewrites() {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        return [
            {
                source: '/api/((?!auth).*)/:path*',
                destination: `${apiUrl}/api/$1/:path*`,
            },
            // Common probe endpoints for Cross-Origin-Opener-Policy checks
            { source: '/coop', destination: '/api/security/coop' },
            { source: '/coep', destination: '/api/security/coop' },
            { source: '/.well-known/coop', destination: '/api/security/coop' },
            { source: '/.well-known/coep', destination: '/api/security/coop' },
            { source: '/__coop-check', destination: '/api/security/coop' },
        ];
    },
};

module.exports = nextConfig;

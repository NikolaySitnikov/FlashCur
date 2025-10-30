/** @type {import('next').NextConfig} */
const nextConfig = {
    outputFileTracingRoot: __dirname,
    images: {
        domains: ['localhost', 'lh3.googleusercontent.com', 'avatars.githubusercontent.com'],
    },
    env: {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
        NEXT_PUBLIC_SOCKET_IO_URL: process.env.NEXT_PUBLIC_SOCKET_IO_URL,
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
        const isDev = process.env.NODE_ENV === 'development'
        return [
            {
                // Scope narrowly to avoid breaking public/marketing pages
                source: '/(dashboard|admin)/:path*',
                headers: isDev
                    ? [
                        // Base Account SDK requires COOP not be 'same-origin'
                        { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
                        // Disable COEP in dev to avoid cross-origin restrictions
                        { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
                        { key: 'Origin-Agent-Cluster', value: '?1' },
                    ]
                    : [
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
        const isDev = process.env.NODE_ENV === 'development'
        const backendUrl = 'http://localhost:3001'
        if (isDev) {
            return [
                // Proxy ONLY the backend under /backend to avoid touching NextAuth's /api/auth/*
                { source: '/backend/:path*', destination: `${backendUrl}/api/:path*` },
            ]
        }
        return []
    },
};

module.exports = nextConfig;

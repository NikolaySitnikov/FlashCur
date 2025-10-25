/** @type {import('next').NextConfig} */
const nextConfig = {
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
    async rewrites() {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        return [
            {
                // ✅ FIXED: Exclude NextAuth routes from being proxied to backend
                // This regex pattern matches /api/* but excludes /api/auth/*
                source: '/api/((?!auth).*)/:path*',
                destination: `${apiUrl}/api/$1/:path*`,
            },
            // NextAuth routes will be handled by src/app/api/auth/[...nextauth]/route.ts
            // They run locally on port 3000 and are NOT proxied to the backend
        ];
    },
};

module.exports = nextConfig;

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'FlashCur - Binance Trading Dashboard',
    description: 'Real-time Binance perpetual futures trading dashboard with volume alerts and Web3 integration.',
    keywords: ['binance', 'trading', 'crypto', 'dashboard', 'perpetual futures', 'volume alerts'],
    authors: [{ name: 'FlashCur Team' }],
    viewport: 'width=device-width, initial-scale=1',
    themeColor: '#00ff88',
    openGraph: {
        title: 'FlashCur - Binance Trading Dashboard',
        description: 'Real-time Binance perpetual futures trading dashboard with volume alerts and Web3 integration.',
        type: 'website',
        locale: 'en_US',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'FlashCur - Binance Trading Dashboard',
        description: 'Real-time Binance perpetual futures trading dashboard with volume alerts and Web3 integration.',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className={inter.className}>
                <Providers>
                    {children}
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            duration: 4000,
                            style: {
                                background: '#1e293b',
                                color: '#f8fafc',
                                border: '1px solid #334155',
                            },
                            success: {
                                iconTheme: {
                                    primary: '#00ff88',
                                    secondary: '#1e293b',
                                },
                            },
                        }}
                    />
                </Providers>
            </body>
        </html>
    );
}

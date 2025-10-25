'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, bsc, avalanche, arbitrum, optimism } from 'wagmi/chains';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { useState } from 'react';

// Import wallet adapter CSS
import '@rainbow-me/rainbowkit/styles.css';
import '@solana/wallet-adapter-react-ui/styles.css';

// Get WalletConnect Project ID
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// Wagmi config
const config = getDefaultConfig({
    appName: 'FlashCur',
    projectId,
    chains: [mainnet, polygon, bsc, avalanche, arbitrum, optimism],
    ssr: false,
});

// Solana configuration
const network = 'mainnet-beta';
const endpoint = clusterApiUrl(network);
const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
];

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 1000 * 60 * 5, // 5 minutes
                gcTime: 1000 * 60 * 10, // 10 minutes
                retry: 3,
                refetchOnWindowFocus: false,
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            <WagmiProvider config={config}>
                <RainbowKitProvider>
                    <ConnectionProvider endpoint={endpoint}>
                        <WalletProvider wallets={wallets} autoConnect>
                            <WalletModalProvider>
                                {children}
                                <ReactQueryDevtools initialIsOpen={false} />
                            </WalletModalProvider>
                        </WalletProvider>
                    </ConnectionProvider>
                </RainbowKitProvider>
            </WagmiProvider>
        </QueryClientProvider>
    );
}

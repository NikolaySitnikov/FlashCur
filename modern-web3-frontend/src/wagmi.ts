import { createConfig, http } from 'wagmi';
import { mainnet, polygon, bsc, avalanche, arbitrum, optimism, sepolia } from 'wagmi/chains';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
    metaMaskWallet,
    phantomWallet,
    walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Get WalletConnect Project ID from https://cloud.walletconnect.com/
const projectId = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || '2c4b5a8e9f3d1a2b3c4d5e6f7a8b9c0d';

// Solana configuration
const network = WalletAdapterNetwork.Mainnet;
const endpoint = clusterApiUrl(network);
const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
];

const connectors = connectorsForWallets(
    [
        {
            groupName: 'Recommended',
            wallets: [
                metaMaskWallet,
                phantomWallet,
                walletConnectWallet,
            ],
        },
    ],
    {
        appName: 'Binance Dashboard',
        projectId,
    }
);

export const config = createConfig({
    chains: [mainnet, polygon, bsc, avalanche, arbitrum, optimism, sepolia],
    connectors,
    transports: {
        [mainnet.id]: http(),
        [polygon.id]: http(),
        [bsc.id]: http(),
        [avalanche.id]: http(),
        [arbitrum.id]: http(),
        [optimism.id]: http(),
        [sepolia.id]: http(),
    },
    ssr: false,
});

// Export Solana configuration
export { endpoint, wallets };

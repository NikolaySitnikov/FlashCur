import React from 'react';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mainnet } from 'wagmi/chains';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { config, endpoint, wallets } from './wagmi';
import FlashCurLogin from './components/FlashCurLogin';
import ErrorBoundary from './components/ErrorBoundary';
import MobileWalletDetection from './components/MobileWalletDetection';
import PhantomRedirect from './components/PhantomRedirect';
import '@rainbow-me/rainbowkit/styles.css';
import '@solana/wallet-adapter-react-ui/styles.css';

const queryClient = new QueryClient();

function App() {
  // Add global error handling for unhandled promise rejections
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault(); // Prevent the default browser error handling
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Handle Phantom callback route
  if (window.location.pathname === '/phantom-redirect') {
    return <PhantomRedirect />;
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
              <RainbowKitProvider
                theme={darkTheme({
                  accentColor: '#00ff88',
                  accentColorForeground: '#1a1a1a',
                  borderRadius: 'medium',
                })}
                appInfo={{
                  appName: 'Binance Dashboard',
                  learnMoreUrl: 'https://binance.com',
                }}
                initialChain={mainnet}
                showRecentTransactions={true}
                modalSize="compact"
                coolMode={true}
              >
                <div style={{
                  minHeight: '100vh',
                  background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                }}>
                  <div style={{
                    maxWidth: '400px',
                    width: '100%',
                    padding: '1rem'
                  }}>
                    <div style={{
                      textAlign: 'center',
                      marginBottom: '2rem'
                    }}>
                      <div style={{
                        width: '80px',
                        height: '80px',
                        background: 'linear-gradient(135deg, #00ff88, #00cc6a)',
                        borderRadius: '20px',
                        margin: '0 auto 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        color: '#1a1a1a'
                      }}>
                        N
                      </div>
                      <h1 style={{
                        color: '#00ff88',
                        fontSize: '2rem',
                        fontWeight: '700',
                        margin: '0 0 0.5rem 0'
                      }}>
                        Binance Dashboard
                      </h1>
                      <p style={{
                        color: '#b0b0b0',
                        fontSize: '1.1rem',
                        margin: '0'
                      }}>
                        Sign in to access your dashboard
                      </p>
                    </div>

                    <ErrorBoundary>
                      <MobileWalletDetection>
                        <FlashCurLogin />
                      </MobileWalletDetection>
                    </ErrorBoundary>
                  </div>
                </div>
              </RainbowKitProvider>
            </QueryClientProvider>
          </WagmiProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
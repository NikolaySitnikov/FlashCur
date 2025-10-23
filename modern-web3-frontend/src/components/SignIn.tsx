import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSignMessage } from 'wagmi';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import NetworkSwitcher from './NetworkSwitcher';
import { usePhantomMobile } from '../wallet/usePhantomMobile';
import ErrorBoundary from './ErrorBoundary';

export default function SignIn() {
    const { address, isConnected } = useAccount();
    const { signMessageAsync } = useSignMessage();
    const { publicKey, connected, signMessage } = useWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [walletType, setWalletType] = useState<'evm' | 'solana' | null>(null);

    // Use the expert's fixed Phantom mobile hook
    const phantom = usePhantomMobile('mainnet-beta');

    // Mobile detection
    useEffect(() => {
        const checkMobile = () => {
            const mobile = /Mobi|Android/i.test(navigator.userAgent);
            setIsMobile(mobile);
        };
        checkMobile();
    }, []);

    // Boot-time auth check (safety net) - only run on sign-in page
    useEffect(() => {
        // Don't run if already on dashboard to prevent redirect loop
        if (window.location.pathname === '/dashboard') return;

        let cancelled = false;
        const backendUrl = isMobile ? 'http://192.168.22.131:8081' : 'http://localhost:8081';
        (async () => {
            try {
                const r = await fetch(`${backendUrl}/api/me`, { credentials: 'include' });
                if (r.ok) {
                    const j = await r.json();
                    if (!cancelled && j?.authenticated) {
                        console.log('✅ Auto-detected authentication via cookies');
                        window.location.replace('/dashboard');
                    }
                }
            } catch { }
        })();
        return () => { cancelled = true; };
    }, [isMobile]);

    // Listen for redirect-page broadcast
    useEffect(() => {
        const backendUrl = isMobile ? 'http://192.168.22.131:8081' : 'http://localhost:8081';
        const bc = new BroadcastChannel('phantom');
        bc.onmessage = async (e) => {
            if (e.data?.type === 'phantom:connected') {
                console.log('📡 Received phantom:connected event from redirect page');
                try {
                    const r = await fetch(`${backendUrl}/api/me`, { credentials: 'include' });
                    if (r.ok) {
                        const j = await r.json();
                        console.log('✅ User authenticated via BroadcastChannel:', j);
                        window.location.replace('/dashboard');
                    }
                } catch { }
            }
        };
        return () => { bc.close(); };
    }, [isMobile]);

    // Show reset button if watchdog detected launch failure
    const showReset = useMemo(() => {
        try { return window.sessionStorage.getItem('phantom_launch_failed') === '1'; }
        catch { return false; }
    }, [phantom.state]);

    // Auto-detect wallet type
    useEffect(() => {
        if (isConnected && address) {
            setWalletType('evm');
        } else if (connected && publicKey) {
            setWalletType('solana');
        } else {
            setWalletType(null);
        }
    }, [isConnected, address, connected, publicKey]);

    // Handle sign-in for EVM wallets only (Phantom auth happens via cookies after redirect)
    const handleSignIn = useCallback(async () => {
        if (walletType !== 'evm' || !isConnected || !address) return;

        setIsLoading(true);
        try {
            const backendUrl = isMobile ? 'http://192.168.22.131:8081' : 'http://localhost:8081';

            // Step 1: Request nonce
            const nonceResponse = await fetch(`${backendUrl}/wallet/request-nonce`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    address: address,
                    wallet_type: 'evm'
                }),
            });

            if (!nonceResponse.ok) {
                throw new Error(`Failed to get nonce: ${nonceResponse.status}`);
            }

            const nonceData = await nonceResponse.json();
            const nonce = nonceData.nonce;

            // Step 2: Sign the message
            const signature = await signMessageAsync({
                message: `Sign this message to authenticate with Binance Dashboard.\n\nNonce: ${nonce}`
            });

            // Step 3: Verify signature
            const response = await fetch(`${backendUrl}/wallet/verify-signature`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    address: address,
                    signature: signature,
                    wallet_type: 'evm'
                }),
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    // Redirect to Flask dashboard
                    const dashboardUrl = isMobile ? 'http://192.168.22.131:8081/' : 'http://localhost:8081/';
                    window.location.href = dashboardUrl;
                } else {
                    throw new Error(result.error || 'Verification failed');
                }
            } else {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} ${errorText}`);
            }
        } catch (error: any) {
            console.error('Sign-in error:', error);
            alert(`Sign-in failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [walletType, isConnected, address, signMessageAsync, isMobile]);

    return (
        <ErrorBoundary>
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px',
                padding: '20px',
                maxWidth: '500px',
                margin: '0 auto'
            }}>
                <h2 style={{ color: '#00ff88', marginBottom: '20px' }}>Connect Your Wallet</h2>

                {/* EVM Wallets */}
                <div style={{ width: '100%' }}>
                    <h3 style={{ color: '#ffffff', marginBottom: '10px' }}>EVM Wallets</h3>
                    <ConnectButton />
                    {isConnected && <NetworkSwitcher />}
                </div>

                {/* Solana Wallets */}
                <div style={{ width: '100%' }}>
                    <h3 style={{ color: '#ffffff', marginBottom: '10px' }}>Solana Wallets</h3>
                    {isMobile ? (
                        <div>
                            <button
                                onClick={() => phantom.connect()}
                                disabled={!phantom.ready || phantom.state === 'redirecting'}
                                style={{
                                    backgroundColor: phantom.ready ? '#AB9FF2' : '#666',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '14px 24px',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    cursor: phantom.ready && phantom.state !== 'redirecting' ? 'pointer' : 'not-allowed',
                                    width: '100%',
                                    marginBottom: '12px',
                                    opacity: phantom.ready ? 1 : 0.6,
                                    transition: 'all 0.2s ease',
                                    boxShadow: phantom.ready ? '0 4px 12px rgba(171, 159, 242, 0.3)' : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                {phantom.state === 'redirecting' ? (
                                    <>
                                        <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
                                        <span>Opening Phantom…</span>
                                    </>
                                ) : phantom.state === 'preparing' ? (
                                    <>
                                        <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
                                        <span>Preparing…</span>
                                    </>
                                ) : phantom.state === 'error' ? (
                                    <>⚠️ Connection Error</>
                                ) : (
                                    <>👻 Connect Phantom</>
                                )}
                            </button>
                            {showReset && (
                                <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                                    <button
                                        onClick={() => {
                                            try {
                                                sessionStorage.removeItem('phantom_launch_failed');
                                                sessionStorage.removeItem('phantom_launch_confirmed');
                                                sessionStorage.removeItem('phantom_auto_attempted');
                                            } catch { }
                                            window.location.replace(window.location.href.split('#')[0]);
                                        }}
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: 10,
                                            border: '1px solid #ccc',
                                            background: 'white',
                                            cursor: 'pointer',
                                            color: '#000'
                                        }}
                                    >
                                        Reset & Try Again
                                    </button>
                                    <a
                                        href="https://phantom.app/"
                                        rel="noopener noreferrer"
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: 10,
                                            border: '1px solid #ccc',
                                            textAlign: 'center',
                                            textDecoration: 'none',
                                            color: '#000',
                                            background: 'white'
                                        }}
                                    >
                                        Open Phantom
                                    </a>
                                </div>
                            )}
                            {phantom.error && (
                                <p style={{ marginTop: 12, color: '#b00020' }}>{phantom.error}</p>
                            )}
                        </div>
                    ) : (
                        <WalletMultiButton />
                    )}
                </div>


                {/* Browser Context Handling & Fallbacks */}
                {isMobile && (
                    <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#1a1a1a', borderRadius: '8px' }}>
                        <h4 style={{ color: '#fff', margin: '0 0 8px 0', fontSize: '14px' }}>Mobile Instructions:</h4>
                        <ol style={{ color: '#ccc', fontSize: '12px', margin: '0', paddingLeft: '16px' }}>
                            <li>Click "Connect Phantom (Mobile)" to open Phantom app</li>
                            <li>Connect your wallet in Phantom</li>
                            <li>You'll be redirected back to complete sign-in</li>
                        </ol>

                        {/* Fallback Options */}
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexDirection: 'column' }}>
                            <a
                                href="https://phantom.app/"
                                rel="noopener noreferrer"
                                style={{
                                    backgroundColor: '#666',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    textDecoration: 'none'
                                }}
                            >
                                Open Phantom
                            </a>

                            <button
                                onClick={() => {
                                    const chromeUrl = window.location.href.replace(/^https:\/\//, 'googlechromes://').replace(/^http:\/\//, 'googlechrome://');
                                    window.location.href = chromeUrl;
                                }}
                                style={{
                                    backgroundColor: '#666',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                }}
                            >
                                Open in Chrome
                            </button>
                        </div>
                    </div>
                )}

                {/* Sign In Button - Only for EVM wallets */}
                {walletType === 'evm' && (
                    <button
                        onClick={handleSignIn}
                        disabled={isLoading}
                        style={{
                            backgroundColor: '#00ff88',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '12px 24px',
                            fontSize: '16px',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            width: '100%',
                            opacity: isLoading ? 0.6 : 1
                        }}
                    >
                        {isLoading ? 'Signing In...' : 'Sign In with EVM Wallet'}
                    </button>
                )}

                {/* Mobile Instructions */}
                {isMobile && (
                    <div style={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        padding: '15px',
                        fontSize: '14px',
                        color: '#cccccc',
                        textAlign: 'center'
                    }}>
                        <p><strong>Mobile Instructions:</strong></p>
                        <p>1. Click "Connect Phantom (Mobile)" to open Phantom app</p>
                        <p>2. Connect your wallet in Phantom</p>
                        <p>3. You'll be redirected back to complete sign-in</p>
                    </div>
                )}
            </div>
        </ErrorBoundary>
    );
}
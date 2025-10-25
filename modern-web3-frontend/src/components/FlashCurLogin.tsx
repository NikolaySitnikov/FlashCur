import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSignMessage } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { usePhantomMobile } from '../wallet/usePhantomMobile';

export default function FlashCurLogin() {
    const { address, isConnected } = useAccount();
    const { signMessageAsync } = useSignMessage();
    const { publicKey, connected } = useWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [walletType, setWalletType] = useState<'evm' | 'solana' | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [flashMessages, setFlashMessages] = useState<Array<{category: string, message: string}>>([]);

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

    // Handle email/password login
    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            const backendUrl = isMobile ? 'http://192.168.22.131:8081' : 'http://localhost:8081';
            const response = await fetch(`${backendUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    email,
                    password,
                    remember
                }),
            });

            if (response.ok) {
                window.location.href = '/dashboard';
            } else {
                const errorData = await response.json();
                setFlashMessages([{category: 'error', message: errorData.message || 'Login failed'}]);
            }
        } catch (error) {
            setFlashMessages([{category: 'error', message: 'Network error. Please try again.'}]);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle wallet sign-in for EVM wallets
    const handleWalletSignIn = async () => {
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
                message: `Sign this message to authenticate with VolSpike.\n\nNonce: ${nonce}`
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
                    window.location.href = '/dashboard';
                } else {
                    throw new Error(result.error || 'Verification failed');
                }
            } else {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} ${errorText}`);
            }
        } catch (error: any) {
            console.error('Sign-in error:', error);
            setFlashMessages([{category: 'error', message: `Sign-in failed: ${error.message}`}]);
        } finally {
            setIsLoading(false);
        }
    };

    const togglePassword = () => {
        setShowPassword(!showPassword);
    };

    return (
        <>
            <style>{`
                /* Import the exact same CSS as Flask templates */
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
                
                /* Authentication Pages Styling - Dark Theme Only - Modernized 2025 */
                .auth-container {
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem 1rem;
                    position: relative;
                    background: linear-gradient(135deg, #000000 0%, #0a0a0a 40%, #1a1a1a 100%);
                    background-attachment: fixed;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                }

                /* Animated Background Pattern */
                .auth-container::before {
                    content: '';
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-image:
                        radial-gradient(circle at 20% 50%, rgba(0, 255, 136, 0.03) 0%, transparent 50%),
                        radial-gradient(circle at 80% 80%, rgba(0, 255, 136, 0.02) 0%, transparent 50%);
                    animation: backgroundPulse 10s ease-in-out infinite alternate;
                    pointer-events: none;
                    z-index: 0;
                }

                @keyframes backgroundPulse {
                    from { opacity: 0.5; }
                    to { opacity: 1; }
                }

                .auth-card {
                    position: relative;
                    background: rgba(26, 26, 26, 0.8);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(0, 255, 136, 0.1);
                    border-radius: 24px;
                    padding: 3rem 2.5rem;
                    width: 100%;
                    max-width: 420px;
                    box-shadow: 
                        0 25px 50px rgba(0, 0, 0, 0.5),
                        0 0 0 1px rgba(0, 255, 136, 0.05),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    z-index: 1;
                }

                .auth-header {
                    text-align: center;
                    margin-bottom: 2.5rem;
                }

                .auth-logo {
                    width: 64px;
                    height: 64px;
                    margin: 0 auto 1.5rem;
                    display: block;
                }

                .auth-title {
                    font-size: 2.5rem;
                    font-weight: 800;
                    color: #00ff88;
                    margin: 0 0 0.5rem 0;
                    letter-spacing: -0.02em;
                }

                .auth-subtitle {
                    color: #b0b0b0;
                    font-size: 1.1rem;
                    font-weight: 400;
                    margin: 0;
                }

                .flash-messages {
                    margin-bottom: 1.5rem;
                }

                .flash-message {
                    padding: 0.875rem 1rem;
                    border-radius: 12px;
                    font-size: 0.9rem;
                    font-weight: 500;
                    margin-bottom: 0.75rem;
                }

                .flash-error {
                    background: rgba(255, 59, 48, 0.1);
                    border: 1px solid rgba(255, 59, 48, 0.2);
                    color: #ff3b30;
                }

                .flash-success {
                    background: rgba(0, 255, 136, 0.1);
                    border: 1px solid rgba(0, 255, 136, 0.2);
                    color: #00ff88;
                }

                .auth-form {
                    margin-bottom: 2rem;
                }

                .form-group {
                    margin-bottom: 1.5rem;
                }

                .form-label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #e0e0e0;
                    margin-bottom: 0.75rem;
                }

                .label-icon {
                    font-size: 1rem;
                }

                .form-input {
                    width: 100%;
                    padding: 1rem 1.25rem;
                    background: rgba(40, 40, 40, 0.8);
                    border: 1px solid rgba(0, 255, 136, 0.2);
                    border-radius: 12px;
                    color: #ffffff;
                    font-size: 1rem;
                    font-weight: 500;
                    transition: all 0.3s ease;
                    box-sizing: border-box;
                }

                .form-input:focus {
                    outline: none;
                    border-color: #00ff88;
                    box-shadow: 0 0 0 3px rgba(0, 255, 136, 0.1);
                    background: rgba(50, 50, 50, 0.9);
                }

                .form-input::placeholder {
                    color: #666;
                }

                .password-input-container {
                    position: relative;
                }

                .password-toggle {
                    position: absolute;
                    right: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: #999;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                }

                .password-toggle:hover {
                    color: #00ff88;
                    background: rgba(0, 255, 136, 0.1);
                }

                .password-toggle-icon {
                    width: 16px;
                    height: 16px;
                }

                .form-checkbox {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    cursor: pointer;
                    font-size: 0.9rem;
                    color: #b0b0b0;
                }

                .checkbox-label input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                    accent-color: #00ff88;
                }

                .btn-primary {
                    width: 100%;
                    padding: 1rem 1.5rem;
                    background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
                    border: none;
                    border-radius: 12px;
                    color: #1a1a1a;
                    font-size: 1rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                }

                .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(0, 255, 136, 0.3);
                }

                .btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }

                .btn-icon {
                    font-size: 1.1rem;
                }

                .auth-divider {
                    display: flex;
                    align-items: center;
                    margin: 2rem 0;
                    position: relative;
                }

                .auth-divider::before {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(0, 255, 136, 0.3), transparent);
                }

                .divider-text {
                    background: rgba(26, 26, 26, 0.8);
                    color: #666;
                    padding: 0 1rem;
                    font-size: 0.9rem;
                    font-weight: 500;
                    margin: 0 auto;
                }

                .btn-wallet {
                    width: 100%;
                    padding: 1rem 1.5rem;
                    background: rgba(40, 40, 40, 0.8);
                    border: 1px solid rgba(0, 255, 136, 0.3);
                    border-radius: 12px;
                    color: #00ff88;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                }

                .btn-wallet:hover {
                    background: rgba(0, 255, 136, 0.1);
                    border-color: #00ff88;
                    transform: translateY(-1px);
                }

                .wallet-status {
                    padding: 0.75rem 1rem;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    margin-bottom: 1rem;
                    text-align: center;
                }

                .auth-footer {
                    text-align: center;
                    margin-top: 2rem;
                }

                .footer-text {
                    color: #999;
                    font-size: 0.9rem;
                    margin: 0;
                }

                .footer-link {
                    color: #00ff88;
                    text-decoration: none;
                    font-weight: 600;
                    transition: color 0.2s ease;
                }

                .footer-link:hover {
                    color: #00cc6a;
                }

                .auth-bottom {
                    margin-top: 3rem;
                    text-align: center;
                }

                .bottom-text {
                    color: #666;
                    font-size: 0.9rem;
                    margin: 0;
                }

                .test-accounts-info {
                    margin-top: 2rem;
                    padding: 1rem;
                    background: rgba(0, 255, 136, 0.05);
                    border: 1px solid rgba(0, 255, 136, 0.1);
                    border-radius: 12px;
                }

                .test-summary {
                    color: #00ff88;
                    font-weight: 600;
                    cursor: pointer;
                    margin: 0 0 0.5rem 0;
                }

                .test-content {
                    color: #b0b0b0;
                    font-size: 0.85rem;
                    margin: 0;
                }

                .test-content p {
                    margin: 0.25rem 0;
                }

                /* Mobile Responsive */
                @media (max-width: 480px) {
                    .auth-container {
                        padding: 1rem;
                    }
                    
                    .auth-card {
                        padding: 2rem 1.5rem;
                    }
                    
                    .auth-title {
                        font-size: 2rem;
                    }
                }
            `}</style>
            
            <div className="auth-container">
                <div className="auth-card">
                    {/* Logo/Icon */}
                    <div className="auth-header">
                        <svg className="auth-logo" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 20H21" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" />
                            <path d="M6 16L9 12L13 17L17 8L20 12" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <h1 className="auth-title">VolSpike</h1>
                        <p className="auth-subtitle">Sign in to access your dashboard</p>
                    </div>

                    {/* Flash Messages */}
                    {flashMessages.length > 0 && (
                        <div className="flash-messages">
                            {flashMessages.map((msg, index) => (
                                <div key={index} className={`flash-message flash-${msg.category}`}>
                                    {msg.message}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleEmailLogin} className="auth-form">
                        <div className="form-group">
                            <label htmlFor="email" className="form-label">
                                <span className="label-icon">📧</span>
                                Email Address
                            </label>
                            <input 
                                type="email" 
                                id="email" 
                                className="form-input" 
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required 
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password" className="form-label">
                                <span className="label-icon">🔒</span>
                                Password
                            </label>
                            <div className="password-input-container">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    id="password" 
                                    className="form-input" 
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button 
                                    type="button" 
                                    className="password-toggle" 
                                    onClick={togglePassword}
                                >
                                    <svg className="password-toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        {showPassword ? (
                                            <>
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                                <line x1="1" y1="1" x2="23" y2="23"></line>
                                            </>
                                        ) : (
                                            <>
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                <circle cx="12" cy="12" r="3"></circle>
                                            </>
                                        )}
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="form-group form-checkbox">
                            <label className="checkbox-label">
                                <input 
                                    type="checkbox" 
                                    checked={remember}
                                    onChange={(e) => setRemember(e.target.checked)}
                                />
                                <span className="checkbox-text">Remember me for 30 days</span>
                            </label>
                        </div>

                        <button type="submit" className="btn-primary" disabled={isLoading}>
                            <span className="btn-icon">🚀</span>
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="auth-divider">
                        <span className="divider-text">or</span>
                    </div>

                    {/* Wallet Sign-In Button */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <ConnectButton />
                        {isConnected && (
                            <button 
                                type="button" 
                                className="btn-wallet" 
                                onClick={handleWalletSignIn}
                                disabled={isLoading}
                            >
                                <span className="btn-icon">🦊</span>
                                {isLoading ? 'Signing In...' : 'Sign in with Wallet'}
                            </button>
                        )}
                    </div>

                    {/* Solana Wallet */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <WalletMultiButton />
                    </div>

                    {/* Register Link */}
                    <div className="auth-footer">
                        <p className="footer-text">
                            Don't have an account?
                            <a href="/register" className="footer-link">Sign up for free</a>
                        </p>
                    </div>

                    {/* Test Accounts Info (for development) */}
                    {process.env.NODE_ENV === 'development' && (
                        <div className="test-accounts-info">
                            <details>
                                <summary className="test-summary">🔧 Test Accounts</summary>
                                <div className="test-content">
                                    <p><strong>Free:</strong> test-free@example.com</p>
                                    <p><strong>Pro:</strong> test-pro@example.com</p>
                                    <p><strong>Elite:</strong> test-elite@example.com</p>
                                    <p><em>Password for all: password123</em></p>
                                </div>
                            </details>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="auth-bottom">
                    <p className="bottom-text">
                        🚀 Start with <strong>Free tier</strong> • Upgrade anytime
                    </p>
                </div>
            </div>
        </>
    );
}

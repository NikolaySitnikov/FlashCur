import React from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { mainnet } from 'wagmi/chains';

const NetworkSwitcher: React.FC = () => {
    const { chain } = useAccount();
    const { switchChain } = useSwitchChain();

    // If user is not on Ethereum Mainnet, show a button to switch
    if (chain && chain.id !== mainnet.id) {
        return (
            <div style={{
                background: 'rgba(255, 193, 7, 0.1)',
                border: '1px solid rgba(255, 193, 7, 0.3)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem',
                textAlign: 'center'
            }}>
                <p style={{
                    color: '#ffc107',
                    margin: '0 0 0.5rem 0',
                    fontSize: '0.9rem'
                }}>
                    ⚠️ You're connected to {chain.name}
                </p>
                <button
                    onClick={() => switchChain({ chainId: mainnet.id })}
                    style={{
                        background: 'linear-gradient(135deg, #00ff88, #00cc6a)',
                        color: '#1a1a1a',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                    }}
                >
                    Switch to Ethereum Mainnet
                </button>
            </div>
        );
    }

    return null;
};

export default NetworkSwitcher;

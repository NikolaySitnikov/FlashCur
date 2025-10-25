'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount, useSignMessage } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import axios from 'axios';

interface User {
    id: number;
    email: string;
    tier: number;
    is_active: boolean;
    email_confirmed: boolean;
    wallet_address?: string;
    subscription_expires_at?: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, confirmPassword: string) => Promise<void>;
    logout: () => void;
    connectWallet: () => Promise<void>;
    disconnectWallet: () => void;
    isWalletConnected: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const queryClient = useQueryClient();

    const { address, isConnected } = useAccount();
    const { signMessageAsync } = useSignMessage();
    const { connect, disconnect, connected } = useWallet();

    // Check authentication status
    const { data: authData, isLoading: authLoading } = useQuery({
        queryKey: ['auth', 'me'],
        queryFn: async () => {
            const response = await axios.get('/api/auth/me', {
                withCredentials: true
            });
            return response.data;
        },
        retry: false,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    useEffect(() => {
        if (!authLoading) {
            if (authData) {
                setUser(authData);
            } else {
                setUser(null);
            }
            setIsLoading(false);
        }
    }, [authData, authLoading]);

    const login = useCallback(async (email: string, password: string) => {
        try {
            const response = await axios.post('/api/auth/login', {
                email,
                password
            });

            const { access_token, user: userData } = response.data;

            // Store token in httpOnly cookie (handled by backend)
            setUser(userData);

            // Invalidate and refetch user data
            await queryClient.invalidateQueries({ queryKey: ['auth'] });

        } catch (error: any) {
            throw new Error(error.response?.data?.detail || 'Login failed');
        }
    }, [queryClient]);

    const register = useCallback(async (email: string, password: string, confirmPassword: string) => {
        try {
            const response = await axios.post('/api/auth/register', {
                email,
                password,
                confirm_password: confirmPassword
            });

            const { access_token, user: userData } = response.data;

            setUser(userData);

            // Invalidate and refetch user data
            await queryClient.invalidateQueries({ queryKey: ['auth'] });

        } catch (error: any) {
            throw new Error(error.response?.data?.detail || 'Registration failed');
        }
    }, [queryClient]);

    const logout = useCallback(async () => {
        try {
            await axios.post('/api/auth/logout', {}, {
                withCredentials: true
            });
        } catch (error) {
            // Ignore logout errors
        } finally {
            setUser(null);
            await queryClient.clear();
        }
    }, [queryClient]);

    const connectWallet = useCallback(async () => {
        try {
            if (!isConnected || !address) {
                throw new Error('Please connect your wallet first');
            }

            // Request nonce from backend
            const nonceResponse = await axios.post('/api/auth/wallet/request-nonce', {
                address
            });

            const { nonce, message } = nonceResponse.data;

            // Sign the message
            const signature = await signMessageAsync({ message });

            // Verify signature with backend
            const verifyResponse = await axios.post('/api/auth/wallet/verify-signature', {
                address,
                signature,
                message
            });

            const { access_token, user: userData } = verifyResponse.data;

            setUser(userData);

            // Invalidate and refetch user data
            await queryClient.invalidateQueries({ queryKey: ['auth'] });

        } catch (error: any) {
            throw new Error(error.response?.data?.detail || 'Wallet connection failed');
        }
    }, [isConnected, address, signMessageAsync, queryClient]);

    const disconnectWallet = useCallback(async () => {
        try {
            await disconnect();
            await logout();
        } catch (error) {
            console.error('Wallet disconnect error:', error);
        }
    }, [disconnect, logout]);

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        connectWallet,
        disconnectWallet,
        isWalletConnected: isConnected || connected
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

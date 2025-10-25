'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';

interface WebSocketContextType {
    isConnected: boolean;
    connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
    sendMessage: (message: any) => void;
    subscribe: (subscription: string) => void;
    unsubscribe: (subscription: string) => void;
    lastMessage: any;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
    const [lastMessage, setLastMessage] = useState<any>(null);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const [subscriptions, setSubscriptions] = useState<Set<string>>(new Set());

    const { user, isAuthenticated } = useAuth();
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000;

    const connect = useCallback(() => {
        if (ws?.readyState === WebSocket.OPEN) return;

        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
        const url = user ? `${wsUrl}/ws/${user.id}` : `${wsUrl}/ws/market-data`;

        setConnectionStatus('connecting');
        const websocket = new WebSocket(url);

        websocket.onopen = () => {
            console.log('🔌 WebSocket connected');
            setIsConnected(true);
            setConnectionStatus('connected');
            setReconnectAttempts(0);

            // Re-subscribe to previous subscriptions
            subscriptions.forEach(subscription => {
                websocket.send(JSON.stringify({
                    type: 'subscribe',
                    subscription
                }));
            });
        };

        websocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setLastMessage(data);

                // Handle different message types
                if (data.type === 'market_data') {
                    // Update market data in global state
                    console.log('📊 Market data received:', data.data?.length, 'assets');
                } else if (data.type === 'alert') {
                    // Handle alert notifications
                    console.log('🚨 Alert received:', data.data);
                } else if (data.type === 'tier_upgrade') {
                    // Handle tier upgrade notifications
                    console.log('⬆️ Tier upgrade:', data.new_tier);
                }
            } catch (error) {
                console.error('❌ WebSocket message parsing error:', error);
            }
        };

        websocket.onclose = (event) => {
            console.log('🔌 WebSocket disconnected:', event.code, event.reason);
            setIsConnected(false);
            setConnectionStatus('disconnected');
            setWs(null);

            // Attempt to reconnect if not a clean close
            if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
                setTimeout(() => {
                    setReconnectAttempts(prev => prev + 1);
                    connect();
                }, reconnectDelay * Math.pow(2, reconnectAttempts));
            }
        };

        websocket.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            setConnectionStatus('error');
        };

        setWs(websocket);
    }, [user, subscriptions, reconnectAttempts]);

    const disconnect = useCallback(() => {
        if (ws) {
            ws.close(1000, 'User disconnected');
            setWs(null);
            setIsConnected(false);
            setConnectionStatus('disconnected');
        }
    }, [ws]);

    const sendMessage = useCallback((message: any) => {
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        } else {
            console.warn('⚠️ WebSocket not connected, cannot send message');
        }
    }, [ws]);

    const subscribe = useCallback((subscription: string) => {
        setSubscriptions(prev => new Set([...prev, subscription]));
        sendMessage({
            type: 'subscribe',
            subscription
        });
    }, [sendMessage]);

    const unsubscribe = useCallback((subscription: string) => {
        setSubscriptions(prev => {
            const newSet = new Set(prev);
            newSet.delete(subscription);
            return newSet;
        });
        sendMessage({
            type: 'unsubscribe',
            subscription
        });
    }, [sendMessage]);

    // Connect when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            connect();
        } else {
            disconnect();
        }

        return () => {
            disconnect();
        };
    }, [isAuthenticated, connect, disconnect]);

    // Heartbeat to keep connection alive
    useEffect(() => {
        if (!isConnected) return;

        const heartbeat = setInterval(() => {
            sendMessage({ type: 'ping' });
        }, 30000); // Send ping every 30 seconds

        return () => clearInterval(heartbeat);
    }, [isConnected, sendMessage]);

    const value: WebSocketContextType = {
        isConnected,
        connectionStatus,
        sendMessage,
        subscribe,
        unsubscribe,
        lastMessage
    };

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
}

export function useWebSocket() {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
}

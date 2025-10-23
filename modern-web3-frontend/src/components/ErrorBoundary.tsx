import React from 'react';

type P = { children: React.ReactNode };
type S = { hasError: boolean };

export default class ErrorBoundary extends React.Component<P, S> {
    state: S = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(err: any) {
        console.error('Wallet UI crashed:', err);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: 20,
                    color: 'red',
                    border: '1px solid red',
                    borderRadius: 8,
                    margin: 10,
                    backgroundColor: '#ffe6e6'
                }}>
                    Something went wrong with wallet connection. Please reload the page.
                </div>
            );
        }
        return this.props.children;
    }
}
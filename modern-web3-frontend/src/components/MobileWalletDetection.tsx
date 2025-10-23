import React, { useEffect } from 'react';

interface MobileWalletDetectionProps {
    children: React.ReactNode;
}

export default function MobileWalletDetection({ children }: MobileWalletDetectionProps) {
    // Remove unused isMobile state to fix linting warning

    useEffect(() => {
        try {
            // Add mobile-specific meta tags for better wallet detection
            if (typeof document !== 'undefined') {
                try {
                    const meta = document.createElement('meta');
                    meta.name = 'mobile-web-app-capable';
                    meta.content = 'yes';
                    document.head.appendChild(meta);
                } catch (error) {
                    console.warn('Error adding meta tag:', error);
                }
            }
        } catch (error) {
            console.error('Error in MobileWalletDetection:', error);
        }
    }, []);

    // Always render children - let RainbowKit handle wallet detection
    return <>{children}</>;
}


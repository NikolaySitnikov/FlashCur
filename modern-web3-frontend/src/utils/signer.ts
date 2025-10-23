// signer.ts - Solana signer with injected/UL fallback
export function getSolanaSigner() {
    // 1) Check for injected Phantom in this tab
    const injected = (window as any).solana;
    if (injected?.isPhantom) {
        return {
            type: 'injected' as const,
            async signMessage(msg: Uint8Array) {
                try {
                    const { signature } = await injected.signMessage(msg, 'utf8');
                    return signature as Uint8Array;
                } catch (error) {
                    console.error('Injected signer error:', error);
                    throw error;
                }
            }
        };
    }

    // 2) Fallback: UL signer via server (uses stored session + sharedSecret)
    return {
        type: 'ul' as const,
        async signMessage(msg: Uint8Array) {
            try {
                // Convert message to base64
                const base64 = btoa(String.fromCharCode.apply(null, Array.from(msg)));

                // Server constructs encrypted UL to /v1/signMessage and redirects to Phantom
                // Then Phantom redirects back to /phantom-redirect which will set cookies and resume
                window.location.href = `/api/phantom/ul/sign-message?msg_b64=${encodeURIComponent(base64)}`;

                // Return a promise that resolves when the user returns from Phantom
                return new Promise<Uint8Array>((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Sign message timeout'));
                    }, 30000); // 30 second timeout

                    // Listen for the sign completion
                    const bc = new BroadcastChannel('phantom');
                    const handler = (ev: MessageEvent) => {
                        if (ev.data?.type === 'phantom:signature') {
                            clearTimeout(timeout);
                            bc.removeEventListener('message', handler);
                            resolve(ev.data.signature);
                        } else if (ev.data?.type === 'phantom:error') {
                            clearTimeout(timeout);
                            bc.removeEventListener('message', handler);
                            reject(new Error(ev.data.errorMessage || 'Sign failed'));
                        }
                    };
                    bc.addEventListener('message', handler);
                });
            } catch (error) {
                console.error('UL signer error:', error);
                throw error;
            }
        }
    };
}

// Helper to detect if we're in Phantom's in-app browser
export function isInPhantomBrowser(): boolean {
    return navigator.userAgent.includes('Phantom') ||
        !!(window as any).solana?.isPhantom;
}

// Helper to open site inside Phantom for guaranteed injection
export function openInPhantom(url: string = window.location.href): void {
    const phantomUrl = `https://phantom.app/ul/browse?url=${encodeURIComponent(url)}`;
    window.location.href = phantomUrl;
}

// usePhantomMobile.ts
// Hook that prepares ephemeral keypair (sid + dappPub58) and launches the Phantom UL
// while preserving the user-gesture for navigation. The watchdog attaches AFTER the jump.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildPhantomConnectUrl, Cluster } from '../utils/phantomLink';

type LaunchState = 'preparing' | 'idle' | 'redirecting' | 'error';
export interface UsePhantomMobile {
    state: LaunchState;
    error?: string;
    connect: () => void;
    cluster: Cluster;
    setCluster: (c: Cluster) => void;
    ready: boolean;
}

type EKey = { sid: string; dapp_encryption_public_key: string };

export function usePhantomMobile(initialCluster: Cluster = 'mainnet-beta'): UsePhantomMobile {
    const [state, setState] = useState<LaunchState>('preparing');
    const [error, setError] = useState<string | undefined>();
    const [cluster, setCluster] = useState<Cluster>(initialCluster);
    const [ekey, setEkey] = useState<EKey | null>(null);

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const resumeAbsoluteUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : origin + '/';

    // Detect if mobile for backend URL
    const isMobile = typeof window !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);
    const backendUrl = isMobile ? 'http://192.168.22.131:8081' : 'http://localhost:8081';

    // Prefetch ephemeral keypair on mount
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                console.log(`🔑 Fetching ephemeral keypair from ${backendUrl}/api/phantom/ekey`);
                const r = await fetch(`${backendUrl}/api/phantom/ekey`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({}),
                });
                if (!r.ok) throw new Error(`/api/phantom/ekey -> ${r.status}`);
                const j = await r.json();
                if (!cancelled) {
                    console.log('✅ Ephemeral keypair fetched:', { sid: j.sid.substring(0, 8) + '...', dappPub: j.dapp_encryption_public_key.substring(0, 8) + '...' });
                    setEkey({ sid: j.sid, dapp_encryption_public_key: j.dapp_encryption_public_key });
                    setState('idle');
                }
            } catch (e: any) {
                console.error('❌ Failed to fetch ephemeral keypair:', e);
                if (!cancelled) {
                    setError(String(e?.message || e));
                    setState('error');
                }
            }
        })();
        return () => { cancelled = true; };
    }, [backendUrl]);

    const connect = useCallback(() => {
        if (!ekey) return;
        try {
            const ul = buildPhantomConnectUrl({
                origin,
                sid: ekey.sid,
                dappPub58: ekey.dapp_encryption_public_key,
                cluster,
                resumeAbsoluteUrl,
            });

            // very cheap state flip (must not throw)
            setState('redirecting');

            // Launch IMMEDIATELY on the gesture (no await, no pre-work)
            window.location.href = ul;

            // Attach non-blocking watchdog AFTER the jump
            queueMicrotask(() => {
                let fired = false;
                const cleanup = () => {
                    fired = true;
                    document.removeEventListener('visibilitychange', onVis);
                    window.removeEventListener('pagehide', onPageHide);
                    window.removeEventListener('blur', onBlur);
                    clearTimeout(watchdog);
                };
                const markLaunched = () => {
                    if (fired) return;
                    try { window.sessionStorage.setItem('phantom_launch_confirmed', '1'); } catch { }
                    cleanup();
                };
                const onVis = () => {
                    if (document.visibilityState === 'hidden') markLaunched();
                };
                const onPageHide = () => markLaunched();
                const onBlur = () => markLaunched();

                document.addEventListener('visibilitychange', onVis);
                window.addEventListener('pagehide', onPageHide);
                window.addEventListener('blur', onBlur);

                const watchdog = setTimeout(() => {
                    if (!fired && document.visibilityState === 'visible') {
                        try { window.sessionStorage.setItem('phantom_launch_failed', '1'); } catch { }
                        setState('error');
                    }
                    cleanup();
                }, 2000);
            });
        } catch (e: any) {
            setError(String(e?.message || e));
            setState('error');
        }
    }, [cluster, ekey, origin, resumeAbsoluteUrl]);

    return useMemo(() => ({
        state,
        error,
        connect,
        cluster,
        setCluster,
        ready: !!ekey && state !== 'preparing',
    }), [cluster, connect, ekey, error, state]);
}

// PhantomRedirect.tsx
// Handles the return from Phantom, posts session to backend, hydrates auth, and redirects.
// Tolerant resume parsing to avoid "string did not match expected pattern" in Brave/Chrome.

import React, { useEffect, useMemo, useState } from 'react';

const decodeMaybeTwice = (s: string) => {
    try {
        const once = decodeURIComponent(s);
        if (/%[0-9A-Fa-f]{2}/.test(once)) {
            try { return decodeURIComponent(once); } catch { /* noop */ }
        }
        return once;
    } catch { return s; }
};

const toSafeUrl = (u?: string | null) => {
    const safeDefault = window.location.origin + '/';
    if (!u) return safeDefault;
    const d = decodeMaybeTwice(u).trim();
    // accept ONLY clean http(s) absolute URLs; no spaces/quotes/controls
    if (/^https?:\/\/[^\s"'<>\u0000-\u001F]+$/.test(d)) return d;
    if (/^\/\/[^\s"'<>\u0000-\u001F]+$/.test(d)) return window.location.protocol + d;
    return safeDefault;
};

function useQuery() {
    return useMemo(() => new URLSearchParams(window.location.search), []);
}

export default function PhantomRedirect() {
    const params = useQuery();
    const [msg, setMsg] = useState<string>('Processing…');

    useEffect(() => {
        (async () => {
            // Detect mobile for backend URL
            const isMobile = /Mobi|Android/i.test(navigator.userAgent);
            const backendUrl = isMobile ? 'http://192.168.22.131:8081' : 'http://localhost:8081';

            const sid = params.get('sid') ?? '';
            const rawResume = params.get('resume');
            const resume = toSafeUrl(rawResume);

            const errorCode = params.get('errorCode');
            const errorMessage = params.get('errorMessage');

            const pk = params.get('phantom_encryption_public_key');
            const data = params.get('data');
            const nonce = params.get('nonce');

            // diagnostics
            console.log('[redirect] raw resume:', rawResume);
            console.log('[redirect] decoded resume:', decodeMaybeTwice(rawResume ?? ''));
            console.log('[redirect] params:', Object.fromEntries(params.entries()));
            console.log('[redirect] backendUrl:', backendUrl);

            const bc = new BroadcastChannel('phantom');

            try {
                if (errorCode || errorMessage) {
                    setMsg(`Phantom reported an error: ${errorCode ?? ''} ${errorMessage ?? ''}`.trim());
                    bc.postMessage({ type: 'phantom:error', errorCode, errorMessage });
                    // Show "Open in Chrome" CTA if desired; for now, fall back
                    setTimeout(() => { window.location.replace(resume); }, 800);
                    return;
                }

                if (!sid) {
                    setMsg('Missing sid. Returning…');
                    setTimeout(() => { window.location.replace(resume); }, 300);
                    return;
                }

                if (!pk || !data || !nonce) {
                    // Some Phantom versions return minimal params on reject.
                    // Fall back to home/resume so app UI can explain.
                    setMsg('Missing Phantom callback params. Returning…');
                    bc.postMessage({ type: 'phantom:error', reason: 'missing_params' });
                    setTimeout(() => { window.location.replace(resume); }, 300);
                    return;
                }

                setMsg('Creating session…');

                const r = await fetch(`${backendUrl}/api/phantom/session`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        sid,
                        phantom_encryption_public_key: pk,
                        data,
                        nonce,
                    }),
                });

                const jr = await r.json().catch(() => ({}));
                console.log('[redirect] /api/phantom/session ->', r.status, jr);

                if (!r.ok) {
                    setMsg(`Session creation failed (${r.status}).`);
                    bc.postMessage({ type: 'phantom:error', reason: 'session_failed', status: r.status });
                    setTimeout(() => { window.location.replace(resume); }, 600);
                    return;
                }

                setMsg('Verifying login…');

                const me = await fetch(`${backendUrl}/api/me`, { credentials: 'include' });
                const jm = await me.json().catch(() => ({}));
                console.log('[redirect] /api/me ->', me.status, jm);

                if (!me.ok) {
                    setMsg('Login verification failed; returning.');
                    bc.postMessage({ type: 'phantom:error', reason: 'me_failed', status: me.status });
                    setTimeout(() => { window.location.replace(resume); }, 600);
                    return;
                }

                try {
                    sessionStorage.removeItem('phantom_launch_failed');
                    sessionStorage.removeItem('phantom_launch_confirmed');
                    sessionStorage.removeItem('phantom_auto_attempted');
                } catch { }

                bc.postMessage({ type: 'phantom:connected', me: jm });

                setMsg('All set! Redirecting…');
                // Redirect to Flask backend dashboard
                const isMobile = /Mobi|Android/i.test(navigator.userAgent);
                const backendDashboard = isMobile ? 'http://192.168.22.131:8081/' : 'http://localhost:8081/';
                setTimeout(() => { window.location.replace(backendDashboard); }, 100);
            } catch (e: any) {
                console.error('[redirect] fatal:', e);
                setMsg('Unexpected error; returning…');
                setTimeout(() => { window.location.replace('/'); }, 800);
            }
        })();

        return () => { /* nothing */ };
    }, [params]);

    return (
        <div style={{
            display: 'grid',
            minHeight: '100dvh',
            placeItems: 'center',
            padding: '24px',
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
        }}>
            <div style={{ maxWidth: 520, textAlign: 'center' }}>
                <h1 style={{ fontSize: 24, marginBottom: 12 }}>Connecting Phantom…</h1>
                <p style={{ opacity: 0.8, marginBottom: 20 }}>{msg}</p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <a
                        href={window.location.href.replace(/^https:\/\//, 'googlechromes://').replace(/^http:\/\//, 'googlechrome://')}
                        rel="noopener noreferrer"
                        style={{ padding: '10px 14px', border: '1px solid #ccc', borderRadius: 10 }}
                    >
                        Open in Chrome
                    </a>
                    <a
                        href="https://phantom.app/"
                        rel="noopener noreferrer"
                        style={{ padding: '10px 14px', border: '1px solid #ccc', borderRadius: 10 }}
                    >
                        Open in Phantom
                    </a>
                </div>
            </div>
        </div>
    );
}

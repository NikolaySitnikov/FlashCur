// phantomLink.ts
// Utilities to build Phantom Universal Link without double-encoding.
// Requires no manual encodeURIComponent on inner params; lets URLSearchParams handle it once.

export type Cluster = 'mainnet-beta' | 'devnet' | 'testnet';

interface BuildULArgs {
    origin?: string;                 // e.g., window.location.origin
    sid: string;                     // server-issued session id for ephemeral keypair
    dappPub58: string;               // base58(x25519 public key, 32 bytes)
    cluster?: Cluster;
    resumeAbsoluteUrl?: string;      // absolute URL to return to (defaults to origin + '/')
}

export function buildPhantomConnectUrl(args: BuildULArgs): string {
    const origin = args.origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
    const cluster: Cluster = args.cluster ?? 'mainnet-beta';

    // Build redirect_link (absolute URL) with a raw, unencoded resume (URLSearchParams will encode it once)
    const redirect = new URL('/phantom-redirect', origin);
    redirect.searchParams.set('sid', args.sid);

    const resume = args.resumeAbsoluteUrl
        ?? (typeof window !== 'undefined'
            ? window.location.href.split('#')[0] // full page (no hash)
            : origin + '/');
    redirect.searchParams.set('resume', resume);

    const ul = new URL('https://phantom.app/ul/v1/connect');
    ul.searchParams.set('app_url', origin);
    ul.searchParams.set('dapp_encryption_public_key', args.dappPub58);
    ul.searchParams.set('redirect_link', redirect.toString());
    ul.searchParams.set('cluster', cluster);

    // helpful diagnostics
    // eslint-disable-next-line no-console
    console.log('[phantom] redirect_link:', redirect.toString());
    // eslint-disable-next-line no-console
    console.log('[phantom] UL:', ul.toString());

    return ul.toString();
}

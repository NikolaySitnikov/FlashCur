import nacl from 'tweetnacl';
import bs58 from 'bs58';

export const UL_BASE = 'https://phantom.app/ul/v1';

export const LOCAL = {
    DAPP_SECRET: 'phantom_dapp_secret_b58',
    DAPP_PUBKEY: 'phantom_dapp_pubkey_b58',
    SESSION: 'phantom_session_b58',
    PUBKEY: 'phantom_public_key_b58',
    RESUME_URL: 'phantom_resume_url',
    AUTO_ATTEMPTED: 'phantom_auto_attempted',
    ORIG_BROWSER: 'phantom_original_browser'
} as const;

export function safeStorage<T extends 'local' | 'session' = 'local'>(which: T) {
    const s = which === 'local' ? window.localStorage : window.sessionStorage;
    return {
        get: (k: string) => { try { return s.getItem(k) ?? null; } catch { return null; } },
        set: (k: string, v: string) => { try { s.setItem(k, v); } catch { } },
        rm: (k: string) => { try { s.removeItem(k); } catch { } },
    };
}

export function generateEphemeralKeypair() {
    const kp = nacl.box.keyPair();
    safeStorage('local').set(LOCAL.DAPP_SECRET, bs58.encode(kp.secretKey));
    safeStorage('local').set(LOCAL.DAPP_PUBKEY, bs58.encode(kp.publicKey));
    return kp;
}

export function getOrCreateEphemeralPubkey(): string {
    const ls = safeStorage('local');
    let pub = ls.get(LOCAL.DAPP_PUBKEY);
    if (!pub) pub = bs58.encode(generateEphemeralKeypair().publicKey);
    return pub;
}

export function buildUl(method: string, params: Record<string, string>) {
    const usp = new URLSearchParams(params);
    return `${UL_BASE}/${method}?${usp.toString()}`;
}

// shared secret and decrypt helpers
export function sharedSecret(phantomPub58: string) {
    const appSecret = bs58.decode(safeStorage('local').get(LOCAL.DAPP_SECRET)!);
    const phantomPub = bs58.decode(phantomPub58);
    return nacl.box.before(phantomPub, appSecret);
}

export function decryptData(data58: string, nonce58: string, shared: Uint8Array) {
    const nonce = bs58.decode(nonce58);
    const box = bs58.decode(data58);
    const plain = nacl.box.open.after(box, nonce, shared);
    if (!plain) throw new Error('Decryption failed');
    return JSON.parse(new TextDecoder().decode(plain));
}
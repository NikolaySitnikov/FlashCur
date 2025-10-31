"use client"

import nacl from 'tweetnacl'
import { base58 } from '@scure/base'

// sessionStorage keys
const SK_EPHEM = 'phantom_ephem_secret'
const SK_EPHEM_PUB = 'phantom_ephem_public'
const SK_SESSION = 'phantom_session'
const SK_PHANTOM_PUB = 'phantom_pubkey'
const SK_INTENT = 'phantom_intent' // 'connect' | 'sign'
const SK_MESSAGE = 'phantom_message'
const SK_ADDRESS = 'solana_address'

export type PhantomIntent = 'connect' | 'sign'

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export function getPublicOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin
  return process.env.NEXT_PUBLIC_PUBLIC_URL || 'https://volspike.com'
}

export function generateEphemeralKeys(): { publicKey58: string; secretKey58: string } {
  const { publicKey, secretKey } = nacl.box.keyPair()
  const publicKey58 = base58.encode(publicKey)
  const secretKey58 = base58.encode(secretKey)
  sessionStorage.setItem(SK_EPHEM, secretKey58)
  sessionStorage.setItem(SK_EPHEM_PUB, publicKey58)
  return { publicKey58, secretKey58 }
}

export function getEphemeralSecret(): Uint8Array | null {
  const secretKey58 = sessionStorage.getItem(SK_EPHEM)
  if (!secretKey58) return null
  return base58.decode(secretKey58)
}

export function storeSession(session: string, phantomPubKey58: string) {
  sessionStorage.setItem(SK_SESSION, session)
  sessionStorage.setItem(SK_PHANTOM_PUB, phantomPubKey58)
}

export function getSession(): { session: string | null; phantomPubKey: Uint8Array | null } {
  const s = sessionStorage.getItem(SK_SESSION)
  const pk58 = sessionStorage.getItem(SK_PHANTOM_PUB)
  return { session: s, phantomPubKey: pk58 ? base58.decode(pk58) : null }
}

export function setIntent(i: PhantomIntent) {
  sessionStorage.setItem(SK_INTENT, i)
}

export function getIntent(): PhantomIntent | null {
  const i = sessionStorage.getItem(SK_INTENT)
  return (i === 'connect' || i === 'sign') ? i : null
}

export function clearIntent() {
  sessionStorage.removeItem(SK_INTENT)
}

export function saveMessageToSign(message: string) {
  sessionStorage.setItem(SK_MESSAGE, message)
}

export function getMessageToSign(): string | null {
  return sessionStorage.getItem(SK_MESSAGE)
}

function computeSharedSecret(phantomPubKey: Uint8Array, dappSecretKey: Uint8Array): Uint8Array {
  return nacl.box.before(phantomPubKey, dappSecretKey)
}

export function encryptPayload(sharedSecret: Uint8Array, obj: unknown): { payload58: string; nonce58: string } {
  const nonce = nacl.randomBytes(24)
  const data = new TextEncoder().encode(JSON.stringify(obj))
  const box = nacl.box.after(data, nonce, sharedSecret)
  return { payload58: base58.encode(box), nonce58: base58.encode(nonce) }
}

export function decryptPayload(sharedSecret: Uint8Array, payload58: string, nonce58: string): any | null {
  try {
    const payload = base58.decode(payload58)
    const nonce = base58.decode(nonce58)
    const opened = nacl.box.open.after(payload, nonce, sharedSecret)
    if (!opened) return null
    const text = new TextDecoder().decode(opened)
    return JSON.parse(text)
  } catch {
    return null
  }
}

// Build deep links
export function buildConnectUrl({ appUrl, dappPubKey58, redirect }: { appUrl: string; dappPubKey58: string; redirect: string }): string {
  const params = new URLSearchParams({
    app_url: appUrl,
    dapp_encryption_public_key: dappPubKey58,
    redirect_link: redirect,
    cluster: process.env.NEXT_PUBLIC_SOLANA_CLUSTER === 'devnet' ? 'devnet' : 'mainnet-beta'
  })
  return `https://phantom.app/ul/v1/connect?${params.toString()}`
}

export function buildSignUrl({ appUrl, dappPubKey58, redirect, phantomPubKey, session, message }: { appUrl: string; dappPubKey58: string; redirect: string; phantomPubKey: Uint8Array; session: string; message: string }): { url: string } {
  const dappSecret = getEphemeralSecret()
  if (!dappSecret) throw new Error('Missing ephemeral secret')
  const shared = computeSharedSecret(phantomPubKey, dappSecret)
  const messageBytes58 = base58.encode(new TextEncoder().encode(message))
  const { payload58, nonce58 } = encryptPayload(shared, { session, message: messageBytes58 })
  const params = new URLSearchParams({
    app_url: appUrl,
    dapp_encryption_public_key: dappPubKey58,
    redirect_link: redirect,
    nonce: nonce58,
    payload: payload58,
    cluster: process.env.NEXT_PUBLIC_SOLANA_CLUSTER === 'devnet' ? 'devnet' : 'mainnet-beta'
  })
  return { url: `https://phantom.app/ul/v1/signMessage?${params.toString()}` }
}

export function startIOSConnectDeepLink(): void {
  const origin = getPublicOrigin()
  const appUrl = origin
  const redirect = `${origin}/auth/phantom-callback`
  const { publicKey58 } = generateEphemeralKeys()
  setIntent('connect')
  const url = buildConnectUrl({ appUrl, dappPubKey58: publicKey58, redirect })
  window.location.href = url
}

export function continueIOSSignDeepLink(message: string): void {
  const origin = getPublicOrigin()
  const appUrl = origin
  const redirect = `${origin}/auth/phantom-callback`
  const dappPubKey58 = sessionStorage.getItem(SK_EPHEM_PUB)
  const phantomPub58 = sessionStorage.getItem(SK_PHANTOM_PUB)
  const session = sessionStorage.getItem(SK_SESSION)
  if (!dappPubKey58 || !phantomPub58 || !session) throw new Error('Missing Phantom session')
  const { url } = buildSignUrl({ appUrl, dappPubKey58, redirect, phantomPubKey: base58.decode(phantomPub58), session, message })
  setIntent('sign')
  saveMessageToSign(message)
  window.location.href = url
}

export function tryHandleCallback(params: URLSearchParams): { stage: 'connect' | 'sign'; result?: any } | null {
  const intent = getIntent()
  const phantomPubKey58 = params.get('phantom_encryption_public_key') || ''
  const payload58 = params.get('payload') || params.get('data') || ''
  const nonce58 = params.get('nonce') || ''
  if (!phantomPubKey58 || !payload58 || !nonce58) return null

  const dappSecret = getEphemeralSecret()
  if (!dappSecret) throw new Error('Missing ephemeral secret key')
  const shared = computeSharedSecret(base58.decode(phantomPubKey58), dappSecret)
  const data = decryptPayload(shared, payload58, nonce58)
  if (!data) throw new Error('Failed to decrypt Phantom payload')

  if (intent === 'connect' && data.session && data.public_key) {
    storeSession(data.session, phantomPubKey58)
    sessionStorage.setItem(SK_ADDRESS, data.public_key)
    return { stage: 'connect', result: { address: data.public_key } }
  }
  if (intent === 'sign' && data.signature) {
    return { stage: 'sign', result: { signature58: data.signature } }
  }
  return null
}

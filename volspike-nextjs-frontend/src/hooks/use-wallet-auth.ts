'use client'

import { useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { signIn } from 'next-auth/react'
import { SiweMessage } from 'siwe'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// Helper to strip control/zero-width characters
const stripControl = (s: string): string =>
  s.replace(/[\u0000-\u001F\u007F\u0085\u200B-\u200D\u2060\uFEFF\u2028\u2029]/g, '')

// Assert SIWE field types and content
function assertSiweField(name: string, val: unknown, kind: 'string' | 'number' = 'string'): void {
  if (kind === 'number') {
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      throw new Error(`${name} must be a finite number`)
    }
    return
  }
  if (typeof val !== 'string') {
    throw new Error(`${name} must be string`)
  }
  if (/[\r\n]/.test(val)) {
    throw new Error(`${name} must not contain CR/LF`)
  }
}

// Debug helper
function dump(name: string, v: unknown): void {
  if (typeof v === 'string') {
    console.log(`[SIWE Debug] ${name} len=${v.length} codes=[${[...v].map(c => c.charCodeAt(0)).join(',')}]`)
  } else {
    console.log(`[SIWE Debug] ${name} type=${typeof v} value=${v}`)
  }
}

interface UseWalletAuthResult {
  isConnecting: boolean
  isSigning: boolean
  isAuthenticating: boolean
  error: string | null
  signInWithWallet: () => Promise<void>
}

export function useWalletAuth(): UseWalletAuthResult {
  const { address, chainId, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSigning, setIsSigning] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signInWithWallet = async () => {
    try {
      setError(null)

      // Step 1: Check wallet connected
      if (!isConnected || !address || !chainId) {
        throw new Error('Please connect your wallet first')
      }

      console.log('[useWalletAuth] Starting sign-in, address:', address, 'chainId:', chainId)

      setIsConnecting(true)

      // Step 2: Get nonce from backend
      const nonceRes = await fetch(`${API_URL}/api/auth/siwe/nonce`, {
        headers: { 'X-Wallet-Address': address },
        credentials: 'include',
      })
      
      if (!nonceRes.ok) {
        const errorText = await nonceRes.text()
        console.error('[useWalletAuth] Nonce request failed:', errorText)
        throw new Error('Failed to get authentication nonce')
      }
      
      const { nonce } = await nonceRes.json()
      console.log('[useWalletAuth] Got nonce:', nonce)

      setIsConnecting(false)
      setIsSigning(true)

      // Step 3: Generate SIWE message using siwe v3 with proper sanitization
      
      // Sanitize all string inputs
      const safeDomain = stripControl(String(window.location.hostname))
      const safeUri = stripControl(String(window.location.origin))
      const safeAddress = stripControl(String(address ?? ''))
      const safeStatement = 'Sign in with Ethereum to VolSpike.' // keep single-line
      const safeNonce = stripControl(String(nonce ?? '')).replace(/[^A-Za-z0-9._~-]/g, '') // base64url-ish
      const safeChainId = Number(chainId)
      
      // Validate types & content explicitly
      assertSiweField('domain', safeDomain)
      assertSiweField('uri', safeUri)
      assertSiweField('address', safeAddress)
      assertSiweField('statement', safeStatement)
      assertSiweField('nonce', safeNonce)
      assertSiweField('chainId', safeChainId, 'number')
      
      // Debug: dump all sanitized values
      dump('domain', safeDomain)
      dump('uri', safeUri)
      dump('address', safeAddress)
      dump('statement', safeStatement)
      dump('nonce', safeNonce)
      console.log('[SIWE Debug] chainId number?', Number.isFinite(safeChainId), safeChainId)
      
      // Build a *plain* object (no prototypes/getters) using JSON round-trip
      const fields = JSON.parse(JSON.stringify({
        domain: safeDomain,
        address: safeAddress,
        statement: safeStatement,
        uri: safeUri,
        version: '1',
        chainId: safeChainId,
        nonce: safeNonce,
      })) as Record<string, unknown>
      
      // Guard against accidental string / reserved key
      if (typeof (fields as any) === 'string' || fields instanceof String) {
        throw new Error('SIWE fields unexpectedly became a string')
      }
      if ('message' in fields) {
        throw new Error('Do not pass a top-level "message" property to SiweMessage')
      }
      
      // FINAL: This should *not* parse; it should accept fields as-is
      const msg = new SiweMessage(fields as any)
      const messageToSign = msg.prepareMessage() // v3
      
      console.log('[useWalletAuth] Generated SIWE message successfully')
      
      // Debug: confirm line count
      console.debug('[SIWE fields]', {
        domain: msg.domain,
        address: msg.address,
        uri: msg.uri,
        version: msg.version,
        chainId: msg.chainId,
        nonce: msg.nonce,
        statement: msg.statement,
      })
      
      console.debug('[SIWE string lines]',
        messageToSign.split('\n').map((l, i) => `${i + 1}: ${l}`)
      )

      // Step 4: Sign message with wallet
      console.log('[useWalletAuth] Requesting signature from wallet...')
      const signature = await signMessageAsync({
        message: messageToSign,
      })
      console.log('[useWalletAuth] Got signature:', signature)

      setIsSigning(false)
      setIsAuthenticating(true)

      // Step 5: Verify signature and get token
      const verifyRes = await fetch(`${API_URL}/api/auth/siwe/verify`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Wallet-Nonce': nonce,
        },
        credentials: 'include',
        body: JSON.stringify({ message: messageToSign, signature }),
      })

      if (!verifyRes.ok) {
        const errorData = await verifyRes.json()
        throw new Error(errorData.error || 'Authentication failed')
      }

      const { token, user } = await verifyRes.json()

      // Step 6: Create NextAuth session
      await signIn('siwe', {
        redirect: false,
        token,
        walletAddress: user.walletAddress,
      })

      // Step 7: Redirect to dashboard
      window.location.href = '/dashboard'
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to authenticate with wallet'
      setError(errorMessage)
      console.error('[useWalletAuth] Error:', err)
    } finally {
      setIsConnecting(false)
      setIsSigning(false)
      setIsAuthenticating(false)
    }
  }

  return {
    isConnecting,
    isSigning,
    isAuthenticating,
    error,
    signInWithWallet,
  }
}


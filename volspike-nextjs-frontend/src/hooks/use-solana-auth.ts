'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletReadyState } from '@solana/wallet-adapter-base'
import { PhantomWalletName } from '@solana/wallet-adapter-phantom'
import { WalletConnectWalletName } from '@solana/wallet-adapter-walletconnect'
import { SolanaMobileWalletAdapterWalletName } from '@solana-mobile/wallet-adapter-mobile'
import { base58 } from '@scure/base'

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/backend'

interface UseSolanaAuthResult {
  isConnecting: boolean
  isSigning: boolean
  isAuthenticating: boolean
  error: string | null
  signInWithSolana: () => Promise<void>
}

export function useSolanaAuth(): UseSolanaAuthResult {
  const router = useRouter()
  const { publicKey, signMessage, connected, connect, wallet, select } = useWallet()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSigning, setIsSigning] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Detect if we're in Phantom in-app browser (shouldn't happen, but handle gracefully)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isPhantomBrowser = /Phantom/i.test(navigator.userAgent)
      if (isPhantomBrowser && window.location.pathname === '/auth') {
        console.warn('[SolanaAuth] Detected Phantom in-app browser. User should use regular browser.')
      }
    }
  }, [])

  const signInWithSolana = async () => {
    try {
      setError(null)
      const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      const isDesktop = !isMobile
      
      console.log('[SolanaAuth] Starting sign-in flow', { isMobile, connected, hasPublicKey: !!publicKey, walletName: wallet?.adapter?.name })

      if (!connected || !publicKey) {
        setIsConnecting(true)
        try {
          // Adapter reference used across connect/retry paths
          let adapter: any = wallet?.adapter
          // Select adapter: Mobile = Solana Mobile Wallet Adapter; Desktop = Phantom
          if (!wallet || (isMobile && wallet.adapter.name !== SolanaMobileWalletAdapterWalletName) || (isDesktop && wallet.adapter.name !== PhantomWalletName)) {
            const targetName = isMobile ? SolanaMobileWalletAdapterWalletName : (PhantomWalletName as any)
            console.log('[SolanaAuth] Selecting adapter:', targetName)
            select?.(targetName as any)
            // Wait for selection to apply (avoid racing connect before adapter is set)
            const selStart = Date.now()
            while (Date.now() - selStart < 800) {
              if (wallet?.adapter?.name === targetName) break
              await new Promise(r => setTimeout(r, 50))
            }
          }

          console.log('[SolanaAuth] Attempting to connect with Phantom adapter...')
          // Desktop: require installed extension; avoid calling connect() on a non-ready adapter
          let readyState: WalletReadyState | undefined = wallet?.readyState || adapter?.readyState
          if (isDesktop && readyState && readyState !== WalletReadyState.Installed) {
            throw new Error('Phantom extension not detected')
          }

          await connect?.()

          // Wait for adapter publicKey to populate to avoid double-click issue on desktop
          const start = Date.now()
          // Re-read adapter reference after connect
          adapter = wallet?.adapter
          while (!adapter?.publicKey && Date.now() - start < (isMobile ? 5000 : 1500)) {
            await new Promise(r => setTimeout(r, 100))
            adapter = wallet?.adapter
          }

          console.log('[SolanaAuth] Connect completed', {
            connected,
            hasPublicKey: !!(wallet?.adapter?.publicKey || publicKey),
            walletName: wallet?.adapter?.name
          })
        } catch (connectError: any) {
          console.error('[SolanaAuth] Phantom adapter connect error:', connectError)
          // Mobile: allow one more retry to let user switch apps
          if (isMobile) {
            console.log('[SolanaAuth] Retrying mobile connect once...')
            try {
              await new Promise(r => setTimeout(r, 1200))
              await connect?.()
              const start2 = Date.now()
              adapter = wallet?.adapter
              while (!adapter?.publicKey && Date.now() - start2 < 4000) {
                await new Promise(r => setTimeout(r, 100))
                adapter = wallet?.adapter
              }
            } catch (_) {}
          }

          // If still not connected, fallback to WalletConnect (desktop only)
          if (isDesktop && !wallet?.adapter?.publicKey && !publicKey) {
            console.log('[SolanaAuth] Trying WalletConnect as fallback...')
            try {
              select?.(WalletConnectWalletName as any)
              await new Promise(resolve => setTimeout(resolve, 200))
              await connect?.()
              await new Promise(resolve => setTimeout(resolve, 300))
            } catch (fallbackError: any) {
              console.error('[SolanaAuth] WalletConnect fallback also failed:', fallbackError)
              throw new Error('Failed to connect wallet. Please ensure Phantom app is installed or try again.')
            }
          }
        } finally {
          setIsConnecting(false)
        }
      }

      const effectivePublicKey = wallet?.adapter?.publicKey || publicKey
      if (!effectivePublicKey) {
        console.error('[SolanaAuth] No public key after connection attempt')
        throw new Error('Please connect Phantom first')
      }
      // Use the bound signMessage from useWallet (avoid unbound adapter method)
      if (!signMessage) {
        console.error('[SolanaAuth] Wallet does not support message signing')
        throw new Error('Wallet does not support message signing')
      }

      const address = effectivePublicKey.toBase58()
      console.log('[SolanaAuth] Wallet connected, address:', address)

      // 1) Nonce
      console.log('[SolanaAuth] Fetching nonce...')
      const nonceRes = await fetch(`${API_URL}/auth/solana/nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      })
      if (!nonceRes.ok) {
        const errorText = await nonceRes.text().catch(() => 'Unknown error')
        console.error('[SolanaAuth] Nonce fetch failed:', nonceRes.status, errorText)
        throw new Error(`Failed to get nonce: ${errorText}`)
      }
      const { nonce } = await nonceRes.json()
      console.log('[SolanaAuth] Nonce received:', nonce)

      // 2) Prepare message
      const chainId = process.env.NEXT_PUBLIC_SOLANA_CLUSTER === 'devnet' ? '103' : '101'
      console.log('[SolanaAuth] Preparing message...', { address, chainId, nonce })
      const prepRes = await fetch(`${API_URL}/auth/solana/prepare?address=${address}&chainId=${chainId}&nonce=${nonce}`)
      if (!prepRes.ok) {
        const errorText = await prepRes.text().catch(() => 'Unknown error')
        console.error('[SolanaAuth] Prepare message failed:', prepRes.status, errorText)
        throw new Error(`Failed to prepare message: ${errorText}`)
      }
      const { message } = await prepRes.json()
      console.log('[SolanaAuth] Message prepared:', message.substring(0, 50) + '...')

      // 3) Sign
      console.log('[SolanaAuth] Requesting signature...')
      setIsSigning(true)
      let signature: Uint8Array
      try {
        signature = await signMessage!(new TextEncoder().encode(message))
        console.log('[SolanaAuth] Signature received:', base58.encode(signature).substring(0, 20) + '...')
      } catch (signError: any) {
        console.error('[SolanaAuth] Sign error:', signError)
        throw new Error(signError?.message || 'Failed to sign message. Please approve in Phantom.')
      } finally {
        setIsSigning(false)
      }

      // 4) Verify
      console.log('[SolanaAuth] Verifying signature...')
      setIsAuthenticating(true)
      const verifyRes = await fetch(`${API_URL}/auth/solana/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature: base58.encode(signature), address, chainId })
      })
      setIsAuthenticating(false)

      if (!verifyRes.ok) {
        const e = await verifyRes.json().catch(() => ({ error: `HTTP ${verifyRes.status}` }))
        console.error('[SolanaAuth] Verify failed:', verifyRes.status, e)
        throw new Error(e?.error || `Authentication failed: ${verifyRes.status}`)
      }

      const { token, user } = await verifyRes.json()
      console.log('[SolanaAuth] Verification successful, signing in with NextAuth...', { hasToken: !!token, walletAddress: user?.walletAddress })
      
      const signInResult = await signIn('siwe', { redirect: false, token, walletAddress: user.walletAddress })
      console.log('[SolanaAuth] NextAuth result:', signInResult)

      if ((signInResult as any)?.ok) {
        console.log('[SolanaAuth] Sign-in successful, redirecting to dashboard')
        router.push('/dashboard')
      } else {
        const errorMsg = (signInResult as any)?.error || 'NextAuth sign-in failed'
        console.error('[SolanaAuth] NextAuth sign-in failed:', errorMsg)
        throw new Error(errorMsg)
      }
    } catch (e: any) {
      const errorMessage = e?.message || 'Failed to authenticate with Phantom'
      console.error('[SolanaAuth] Error in sign-in flow:', errorMessage, e)
      setError(errorMessage)
      setIsConnecting(false)
      setIsSigning(false)
      setIsAuthenticating(false)
    }
  }

  return { isConnecting, isSigning, isAuthenticating, error, signInWithSolana }
}

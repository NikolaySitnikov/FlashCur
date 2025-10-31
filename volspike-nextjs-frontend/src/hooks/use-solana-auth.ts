'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PhantomWalletName } from '@solana/wallet-adapter-phantom'
import { WalletConnectWalletName } from '@solana/wallet-adapter-walletconnect'
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

  const signInWithSolana = async () => {
    try {
      setError(null)
      if (typeof window !== 'undefined') {
        // Debug: surface environment
        console.log('[SolanaAuth] UA:', navigator.userAgent)
      }
      if (!connected || !publicKey) {
        setIsConnecting(true)
        // If no wallet is selected yet, prefer WalletConnect on mobile, Phantom on desktop
        if (!wallet) {
          const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
          try {
            select?.(isMobile ? (WalletConnectWalletName as any) : (PhantomWalletName as any))
          } catch {}
        }
        await connect?.()
        setIsConnecting(false)
      }
      if (!publicKey) throw new Error('Please connect Phantom first')
      if (!signMessage) throw new Error('Wallet does not support message signing')

      const address = publicKey.toBase58()

      // 1) Nonce
      const nonceRes = await fetch(`${API_URL}/auth/solana/nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      })
      if (!nonceRes.ok) throw new Error('Failed to get nonce')
      const { nonce } = await nonceRes.json()

      // 2) Prepare message
      const chainId = process.env.NEXT_PUBLIC_SOLANA_CLUSTER === 'devnet' ? '103' : '101'
      const prepRes = await fetch(`${API_URL}/auth/solana/prepare?address=${address}&chainId=${chainId}&nonce=${nonce}`)
      if (!prepRes.ok) throw new Error('Failed to prepare message')
      const { message } = await prepRes.json()

      // 3) Sign
      setIsSigning(true)
      const signature = await signMessage!(new TextEncoder().encode(message))
      setIsSigning(false)

      // 4) Verify
      setIsAuthenticating(true)
      const verifyRes = await fetch(`${API_URL}/auth/solana/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature: base58.encode(signature), address, chainId })
      })
      setIsAuthenticating(false)

      if (!verifyRes.ok) {
        const e = await verifyRes.json().catch(() => ({}))
        throw new Error(e?.error || 'Authentication failed')
      }

      const { token, user } = await verifyRes.json()
      const signInResult = await signIn('siwe', { redirect: false, token, walletAddress: user.walletAddress })

      if ((signInResult as any)?.ok) {
        router.push('/dashboard')
      } else {
        throw new Error((signInResult as any)?.error || 'NextAuth sign-in failed')
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to authenticate with Phantom')
      setIsConnecting(false)
      setIsSigning(false)
      setIsAuthenticating(false)
    }
  }

  return { isConnecting, isSigning, isAuthenticating, error, signInWithSolana }
}



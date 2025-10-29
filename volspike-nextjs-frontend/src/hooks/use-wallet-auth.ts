'use client'

import { useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { signIn } from 'next-auth/react'
import { SiweMessage } from 'siwe'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

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

      setIsConnecting(true)

      // Step 2: Get nonce from backend
      const nonceRes = await fetch(`${API_URL}/api/auth/siwe/nonce`, {
        headers: { 'X-Wallet-Address': address },
      })
      
      if (!nonceRes.ok) {
        throw new Error('Failed to get authentication nonce')
      }
      
      const { nonce } = await nonceRes.json()

      setIsConnecting(false)
      setIsSigning(true)

      // Step 3: Generate SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to VolSpike',
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce,
        issuedAt: new Date().toISOString(),
      })

      const messageString = message.prepareMessage()

      // Step 4: Sign message with wallet
      const signature = await signMessageAsync({
        message: messageString,
      })

      setIsSigning(false)
      setIsAuthenticating(true)

      // Step 5: Verify signature and get token
      const verifyRes = await fetch(`${API_URL}/api/auth/siwe/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageString, signature }),
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


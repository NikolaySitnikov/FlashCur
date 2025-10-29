'use client'

import { useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { signIn } from 'next-auth/react'

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

      console.log('[useWalletAuth] Starting sign-in, address:', address, 'chainId:', chainId)

      setIsConnecting(true)

      // Step 2: Get nonce from backend
      const nonceRes = await fetch(`${API_URL}/api/auth/siwe/nonce`, {
        headers: { 'X-Wallet-Address': address },
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

      // Step 3: Generate SIWE message
      // Build the SIWE message string manually for siwe v2
      const messageString = `${window.location.host} wants you to sign in with your Ethereum account:
${address}

Sign in to VolSpike

URI: ${window.location.origin}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`

      console.log('[useWalletAuth] Generated SIWE message:', messageString)

      // Step 4: Sign message with wallet
      console.log('[useWalletAuth] Requesting signature from wallet...')
      const signature = await signMessageAsync({
        message: messageString,
      })
      console.log('[useWalletAuth] Got signature:', signature)

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


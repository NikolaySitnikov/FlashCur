'use client'

import { useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export function useWalletAuthFixed() {
  const { address, chainId, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const signInWithWallet = async () => {
    try {
      setError(null)
      if (!isConnected || !address || !chainId) throw new Error('Please connect your wallet first')

      // 1) Nonce
      const nonceRes = await fetch(`${API_URL}/api/auth/siwe/nonce`, { credentials: 'include' })
      const { nonce } = await nonceRes.json()

      // 2) Prepare (reusing nonce)
      const prep = await fetch(`${API_URL}/api/auth/siwe/prepare?address=${address}&chainId=${chainId}&nonce=${nonce}`, { credentials: 'include' })
      const { message } = await prep.json()

      // 3) Sign
      const signature = await signMessageAsync({ message })

      // 4) Verify
      const verifyRes = await fetch(`${API_URL}/api/auth/siwe/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      })
      const { ok, token, user } = await verifyRes.json()
      console.log('[useWalletAuthFixed] Verify response:', { ok, hasToken: !!token, user })
      if (!ok || !token) throw new Error('Verification failed')

      // 5) NextAuth session
      const result = await signIn('siwe', { redirect: false, token, walletAddress: user?.walletAddress })
      console.log('[useWalletAuthFixed] signIn result:', result)

      await new Promise(r => setTimeout(r, 200))
      const sessionRes = await fetch('/api/auth/session', { credentials: 'include' })
      console.log('[useWalletAuthFixed] Session after signIn:', await sessionRes.json())

      if ((result as any)?.ok) router.push('/dashboard')
      else throw new Error((result as any)?.error || 'signIn failed')
    } catch (e: any) {
      console.error('[useWalletAuthFixed] Error:', e)
      setError(e?.message || 'Failed to authenticate with wallet')
    }
  }

  return { error, signInWithWallet }
}

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

      // Step 3: Generate SIWE message using siwe v3
      const msg = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in with Ethereum to VolSpike.',
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce,
      })

      // v3 uses prepareMessage()
      const messageToSign = (msg as any).prepareMessage()
      console.log('[useWalletAuth] Generated SIWE message:', messageToSign)

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

      const verifyData = await verifyRes.json()
      console.log('[useWalletAuth] Verify response:', { 
        ok: verifyRes.ok, 
        hasToken: !!verifyData.token, 
        user: verifyData.user 
      })

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Authentication failed')
      }

      const { token, user } = verifyData

      if (!token || !user) {
        console.error('[useWalletAuth] Missing token or user in response')
        throw new Error('Invalid authentication response')
      }

      // Step 6: Create NextAuth session with SIWE provider
      console.log('[useWalletAuth] Creating NextAuth session with token:', token.substring(0, 20) + '...')
      
      const signInResult = await signIn('siwe', {
        token,
        walletAddress: user.walletAddress || address,
        redirect: false, // IMPORTANT: Don't auto-redirect
      })

      console.log('[useWalletAuth] signIn result:', signInResult)
      console.log('[useWalletAuth] document.cookie snapshot:', document.cookie)

      // Check if signIn was successful
      if (!signInResult) {
        throw new Error('Failed to create session - no result from signIn')
      }

      if (signInResult.error) {
        console.error('[useWalletAuth] SignIn error:', signInResult.error)
        throw new Error(signInResult.error === 'CredentialsSignin' 
          ? 'Failed to authenticate with wallet. Please try again.' 
          : signInResult.error)
      }

      if (!signInResult.ok) {
        throw new Error('Failed to create session - signIn not ok')
      }

      // Step 7: Verify session was created before redirecting
      console.log('[useWalletAuth] Checking session creation...')
      
      // Give NextAuth a moment to set cookies
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Check if session exists
      const sessionRes = await fetch('/api/auth/session')
      const sessionData = await sessionRes.json()
      console.log('[useWalletAuth] Session after signIn:', sessionData)

      if (!sessionData || !sessionData.user) {
        console.error('[useWalletAuth] Session not created properly:', sessionData)
        throw new Error('Session creation failed. Please try again.')
      }

      // Step 8: Redirect to dashboard only if session exists
      console.log('[useWalletAuth] Session confirmed, redirecting to dashboard...')
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

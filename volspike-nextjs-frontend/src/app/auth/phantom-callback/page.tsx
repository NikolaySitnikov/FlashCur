"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { base58 } from '@scure/base'
import { signIn } from 'next-auth/react'
import {
  tryHandleCallback,
  getMessageToSign,
  continueIOSSignDeepLink,
  clearIntent,
} from '@/lib/phantom-deeplink'

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/backend'

export default function PhantomCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string>('')

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const handled = tryHandleCallback(params)
        if (!handled) {
          setError('Invalid Phantom callback payload')
          return
        }

        if (handled.stage === 'connect') {
          // After connect, start sign flow automatically using your backend prepare message
          const address = handled.result?.address as string
          if (!address) throw new Error('Missing wallet address')
          // 1) nonce
          const nonceRes = await fetch(`${API_URL}/auth/solana/nonce`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address })
          })
          if (!nonceRes.ok) throw new Error('Failed to get nonce')
          const { nonce } = await nonceRes.json()
          // 2) prepare
          const chainId = process.env.NEXT_PUBLIC_SOLANA_CLUSTER === 'devnet' ? '103' : '101'
          const prepRes = await fetch(`${API_URL}/auth/solana/prepare?address=${address}&chainId=${chainId}&nonce=${nonce}`)
          if (!prepRes.ok) throw new Error('Failed to prepare message')
          const { message } = await prepRes.json()
          // 3) deep-link to sign
          continueIOSSignDeepLink(message)
          return
        }

        if (handled.stage === 'sign') {
          const message = getMessageToSign()
          const address = (typeof localStorage !== 'undefined' ? localStorage.getItem('solana_address') : null) || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('solana_address') : null) || ''
          if (!message) throw new Error('Missing signed message')
          if (!address) throw new Error('Missing wallet address')
          const chainId = process.env.NEXT_PUBLIC_SOLANA_CLUSTER === 'devnet' ? '103' : '101'
          // Verify
          const verifyRes = await fetch(`${API_URL}/auth/solana/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, signature: handled.result?.signature58, address, chainId })
          })
          if (!verifyRes.ok) {
            setError('Authentication failed')
            clearIntent()
            return
          }
          const { token, user } = await verifyRes.json()
          await signIn('siwe', { redirect: false, token, walletAddress: user?.walletAddress || address })
          clearIntent()
          router.replace('/dashboard')
          return
        }
      } catch (e: any) {
        setError(e?.message || 'Phantom callback error')
      }
    })()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-200">
      {error ? <p>{error}</p> : <p>Continuing with Phantom…</p>}
    </div>
  )
}

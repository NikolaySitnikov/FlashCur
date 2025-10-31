"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import {
  tryHandleCallbackOnServer,
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
        // Merge query and hash params (Phantom may return via URL fragment)
        const searchParams = new URLSearchParams(window.location.search)
        const hash = (window.location.hash || '').replace(/^#/, '')
        const hashParams = new URLSearchParams(hash)
        const merged = new URLSearchParams()
        searchParams.forEach((v, k) => merged.set(k, v))
        hashParams.forEach((v, k) => merged.set(k, v))
        const handled = await tryHandleCallbackOnServer(merged)
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
          // 3) deep-link to sign (return URL and navigate, with fallback button)
          const { url } = await continueIOSSignDeepLink(message)
          // Prefer custom scheme in non-Safari browsers to avoid universal link fallback to website
          const ua = navigator.userAgent || ''
          const isSafari = /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
          const schemeUrl = url.replace(/^https:\/\/phantom\.app/, 'phantom://')
          const targetUrl = isSafari ? url : schemeUrl
          // Try to navigate immediately
          window.location.href = targetUrl
          // Fallback: if we haven't left the page in 1200ms, show a manual button
          setTimeout(() => {
            if (document.visibilityState === 'visible') {
              setError(`Tap to continue in Phantom`)
              const a = document.createElement('a')
              a.href = targetUrl
              a.textContent = 'Open Phantom to sign'
              a.className = 'text-green-400 underline'
              const container = document.getElementById('phantom-cta')
              if (container) {
                container.innerHTML = ''
                container.appendChild(a)
              }
            }
          }, 1200)
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
    <div className="min-h-screen flex flex-col items-center justify-center text-gray-200 gap-2">
      {error ? <p>{error}</p> : <p>Continuing with Phantom…</p>}
      <div id="phantom-cta" />
    </div>
  )
}

"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import {
  tryHandleCallbackOnServer,
  getMessageToSign,
  continueIOSSignDeepLink,
  clearIntent,
  isSafari,
  pickBestPhantomUrl,
  isThirdPartyIOSBrowser,
} from '@/lib/phantom-deeplink'

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/backend'

type DebugInfo = {
  search?: Record<string, string>
  hash?: Record<string, string>
  merged?: Record<string, string>
  url?: string
  hasStateInUrl?: boolean
  stateFromStorage?: string | null
  missingParams?: string[]
  error?: string
}

export default function PhantomCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string>('')
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [isProcessing, setIsProcessing] = useState(true)

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
        
        // Debug: log what parameters we received
        const debugData = {
          search: Object.fromEntries(searchParams),
          hash: Object.fromEntries(hashParams),
          merged: Object.fromEntries(merged),
          url: window.location.href,
          hasStateInUrl: !!merged.get('state'),
          stateFromStorage: typeof localStorage !== 'undefined' ? localStorage.getItem('phantom_state') : null
        }
        console.log('[PhantomCallback] Received params:', debugData)
        setDebugInfo(debugData)
        
        const handled = await tryHandleCallbackOnServer(merged)
        if (!handled) {
          // Provide more detailed error message
          const missing: string[] = []
          // phantom_encryption_public_key is optional for sign stage (backend uses stored one)
          // So we don't check for it here
          if (!merged.get('payload') && !merged.get('data')) missing.push('payload/data')
          if (!merged.get('nonce')) missing.push('nonce')
          const state = merged.get('state') || (typeof localStorage !== 'undefined' ? localStorage.getItem('phantom_state') : null) || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('phantom_state') : null)
          if (!state) missing.push('state')
          const errorMsg = `Invalid Phantom callback payload. Missing: ${missing.join(', ')}`
          setError(errorMsg)
          console.error('[PhantomCallback] Missing params:', missing, 'All params:', Object.fromEntries(merged))
          // Update debug info with missing params
          setDebugInfo(prev => ({ ...prev, missingParams: missing, error: errorMsg }))
          return
        }

        if (handled.stage === 'connect') {
          // After connect, start sign flow automatically using your backend prepare message
          setError('') // Clear any errors
          setIsProcessing(true)
          const address = handled.result?.address as string
          if (!address) throw new Error('Missing wallet address')
          
          // Store address for later use
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('solana_address', address)
          }
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('solana_address', address)
          }
          
          // 1) nonce
          const nonceRes = await fetch(`${API_URL}/auth/solana/nonce`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address })
          })
          if (!nonceRes.ok) {
            const errorData = await nonceRes.json().catch(() => ({}))
            throw new Error(errorData.error || 'Failed to get nonce')
          }
          const { nonce } = await nonceRes.json()
          
          // 2) prepare
          const chainId = process.env.NEXT_PUBLIC_SOLANA_CLUSTER === 'devnet' ? '103' : '101'
          const prepRes = await fetch(`${API_URL}/auth/solana/prepare?address=${address}&chainId=${chainId}&nonce=${nonce}`)
          if (!prepRes.ok) {
            const errorData = await prepRes.json().catch(() => ({}))
            throw new Error(errorData.error || 'Failed to prepare message')
          }
          const { message } = await prepRes.json()
          
          // 3) deep-link to sign (return URL and navigate, with fallback button)
          const { url } = await continueIOSSignDeepLink(message)
          // For signMessage requests, always use universal links (not deep links)
          // Deep links work for connect but can break sign flow redirect handling
          const targetUrl = url // Use universal link directly for sign requests
          
          // On iOS third-party browsers, user interaction is required to open Phantom
          // Show a prominent button that the user must click
          const container = document.getElementById('phantom-cta')
          if (container) {
            container.innerHTML = ''
            const button = document.createElement('button')
            button.type = 'button'
            button.onclick = () => {
              window.location.href = targetUrl
            }
            button.textContent = 'Tap to sign in Phantom'
            button.className = 'text-green-400 bg-transparent border-2 border-green-400/60 rounded-lg px-6 py-3 text-lg font-medium hover:bg-green-500/10 transition-colors cursor-pointer'
            button.style.display = 'block'
            button.style.marginTop = '1rem'
            container.appendChild(button)
          } else {
            // Fallback: direct navigation (may not work on iOS third-party browsers)
            window.location.href = targetUrl
          }
          setIsProcessing(false) // User needs to interact, so not processing
          return
        }

        if (handled.stage === 'sign') {
          const message = getMessageToSign()
          const address = (typeof localStorage !== 'undefined' ? localStorage.getItem('solana_address') : null) || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('solana_address') : null) || ''
          if (!message) throw new Error('Missing signed message')
          if (!address) throw new Error('Missing wallet address')
          const chainId = process.env.NEXT_PUBLIC_SOLANA_CLUSTER === 'devnet' ? '103' : '101'
          // Verify - clear any previous errors during verification
          setError('')
          setIsProcessing(true)
          
          // Small delay to prevent error flash if there's a race condition
          await new Promise(resolve => setTimeout(resolve, 50))
          
          const verifyRes = await fetch(`${API_URL}/auth/solana/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, signature: handled.result?.signature58, address, chainId })
          })
          
          if (!verifyRes.ok) {
            const errorData = await verifyRes.json().catch(() => ({ error: 'Authentication failed' }))
            const errorMsg = errorData.error || `Authentication failed (${verifyRes.status})`
            // Only set error if we're still processing (not redirected yet)
            if (document.visibilityState === 'visible') {
              setError(errorMsg)
              setIsProcessing(false)
              clearIntent()
            }
            return
          }
          const { token, user } = await verifyRes.json()
          // Success - proceed with sign-in without showing error
          setError('')
          setIsProcessing(true) // Keep processing state while signing in
          await signIn('siwe', { redirect: false, token, walletAddress: user?.walletAddress || address })
          clearIntent()
          router.replace('/dashboard')
          return
        }
      } catch (e: any) {
        setError(e?.message || 'Phantom callback error')
        setIsProcessing(false)
      } finally {
        setIsProcessing(false)
      }
    })()
  }, [router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-gray-200 gap-4 p-4">
      {error && !isProcessing ? (
        <div className="text-red-400 text-center">
          <p className="font-semibold text-lg mb-2">{error}</p>
          {debugInfo && (
            <details className="mt-4 text-left bg-gray-900/50 p-4 rounded-lg max-w-md overflow-auto">
              <summary className="cursor-pointer text-yellow-400 mb-2">Debug Info (Tap to expand)</summary>
              <pre className="text-xs mt-2 whitespace-pre-wrap break-all">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          )}
        </div>
      ) : isProcessing ? (
        <p>Authenticating…</p>
      ) : (
        <p>Continuing with Phantom…</p>
      )}
      <div id="phantom-cta" />
      {debugInfo && !error && (
        <details className="mt-4 text-left bg-gray-900/30 p-3 rounded-lg max-w-md overflow-auto text-sm">
          <summary className="cursor-pointer text-blue-400">Debug Info</summary>
          <pre className="text-xs mt-2 whitespace-pre-wrap break-all">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}

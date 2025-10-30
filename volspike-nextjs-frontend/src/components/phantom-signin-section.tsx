'use client'

import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useSolanaAuth } from '@/hooks/use-solana-auth'
import { useEffect, useState } from 'react'

export function PhantomSignInSection() {
  const { isConnecting, isSigning, isAuthenticating, error, signInWithSolana } = useSolanaAuth()
  const [hasPhantom, setHasPhantom] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const w = window as any
      setHasPhantom(!!(w?.phantom?.solana || w?.solana?.isPhantom))
    }
  }, [])

  return (
    <div className="space-y-2 mt-2">
      {!hasPhantom ? (
        <a
          href="https://phantom.app/download"
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-full items-center justify-center rounded-md border border-purple-400/60 bg-transparent px-3 py-2 text-sm font-medium text-purple-300 hover:bg-purple-500/15"
        >
          Install Phantom
        </a>
      ) : (
        <Button
        onClick={signInWithSolana}
        disabled={isConnecting || isSigning || isAuthenticating}
        className="w-full border border-purple-400/60 bg-transparent text-purple-300 hover:bg-purple-500/15"
        variant="outline"
        >
        {isAuthenticating || isSigning || isConnecting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isConnecting ? 'Connecting Phantom...' : isSigning ? 'Sign message in Phantom...' : 'Authenticating...'}
          </>
        ) : (
          'Sign In with Phantom'
        )}
        </Button>
      )}
      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}
    </div>
  )
}



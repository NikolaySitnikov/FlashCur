'use client'

import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Loader2, Wallet } from 'lucide-react'

// Lazy-load RainbowKit so SSR doesn't try to render it
const RainbowConnect = dynamic(async () => {
  const mod = await import('@rainbow-me/rainbowkit')
  return { default: mod.ConnectButton.Custom }
}, {
  ssr: false,
  loading: () => (
    <Button
      disabled
      className="w-full border border-green-400/60 bg-transparent text-green-300"
    >
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Loading wallet...
    </Button>
  )
})

export function WalletConnectButton() {
  return (
    <RainbowConnect>
      {({ openConnectModal, account, chain, mounted, authenticationStatus, openChainModal, openAccountModal }) => {
        const ready = mounted && authenticationStatus !== 'loading'
        const connected = ready && account && chain

        if (!connected) {
          return (
            <Button
              type="button"
              onClick={openConnectModal}
              className="w-full border border-green-400/60 bg-transparent text-green-300 hover:bg-green-500/15"
              variant="outline"
            >
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet
            </Button>
          )
        }

        // When connected, show a compact chip with address and network
        return (
          <div className="flex w-full items-center gap-2">
            <Button
              type="button"
              onClick={openAccountModal}
              className="flex-1 bg-gray-700/60 text-white hover:bg-gray-700"
            >
              {account.displayName}
            </Button>
            <Button
              type="button"
              onClick={openChainModal}
              className="bg-gray-700/60 text-white hover:bg-gray-700"
            >
              {chain?.name}
            </Button>
          </div>
        )
      }}
    </RainbowConnect>
  )
}



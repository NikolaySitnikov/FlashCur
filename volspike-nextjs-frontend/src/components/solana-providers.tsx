'use client'

import { FC, PropsWithChildren, useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'

const DEFAULT_CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'mainnet-beta'
const ENDPOINT = DEFAULT_CLUSTER === 'devnet'
  ? 'https://api.devnet.solana.com'
  : 'https://api.mainnet-beta.solana.com'

export const SolanaProvider: FC<PropsWithChildren> = ({ children }) => {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], [])

  return (
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  )
}



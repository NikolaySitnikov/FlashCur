'use client'

import { FC, PropsWithChildren, useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import { WalletConnectWalletAdapter } from '@solana/wallet-adapter-walletconnect'

const DEFAULT_CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'mainnet-beta'
const ENDPOINT = DEFAULT_CLUSTER === 'devnet'
  ? 'https://api.devnet.solana.com'
  : 'https://api.mainnet-beta.solana.com'

export const SolanaProvider: FC<PropsWithChildren> = ({ children }) => {
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
  const wallets = useMemo(() => {
    const list: any[] = [new PhantomWalletAdapter()]
    if (projectId) {
      list.push(new WalletConnectWalletAdapter({
        network: DEFAULT_CLUSTER as any,
        options: {
          projectId,
          metadata: {
            name: 'VolSpike',
            description: 'VolSpike Auth',
            url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
            icons: ['https://volspike.com/favicon.ico']
          }
        }
      }) as any)
    }
    return list
  }, [projectId])

  return (
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  )
}



import type { AppProps } from 'next/app'
import { useMemo, useEffect } from 'react'
import { useRouter } from 'next/router'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import '@solana/wallet-adapter-react-ui/styles.css'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  const network = WalletAdapterNetwork.Mainnet
  const endpoint = useMemo(() => clusterApiUrl(network), [network])
  
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  )

  // Handle URL-based cleanup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('clearStorage') === 'true') {
        // Clear all campaign-related storage
        localStorage.removeItem('user_campaigns')
        // Platform wallet system removed - no longer needed
        console.log('✅ Storage cleared via URL parameter')
        
        // Remove the parameter and reload
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
        window.location.reload()
      }
    }
  }, [])


  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider 
        wallets={wallets} 
        autoConnect={false}
        localStorageKey="solana-wallet"
        onError={(error: Error) => {
          console.error('Wallet error:', error)
          // Handle _bn and other wallet errors gracefully
          if (error.message?.includes('_bn') || error.message?.includes('Cannot read properties of undefined')) {
            console.warn('⚠️ Wallet adapter error detected, attempting recovery...')
            // Let the app continue in demo mode
          }
        }}
      >
        <WalletModalProvider>
          <Component {...pageProps} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
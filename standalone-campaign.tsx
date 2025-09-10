import { useState, useEffect } from 'react'
import { ConnectionProvider, WalletProvider, useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import { useMemo } from 'react'
import '@solana/wallet-adapter-react-ui/styles.css'

// Standalone Campaign Data - Replace with your campaign details
const STANDALONE_CAMPAIGN = {
  id: 'standalone-campaign',
  name: 'Standalone Campaign Demo',
  description: 'This is a standalone campaign page that works independently of the main platform.',
  targetAmount: 1000,
  raisedAmount: 250,
  creator: 'Your Wallet Address',
  depositWallet: 'Recipient Wallet Address',
  coverPhoto: 'https://via.placeholder.com/800x400?text=Campaign+Cover',
  enableAccessKeys: true,
  accessKeyConfig: {
    name: 'Demo Access Key',
    pricePerKey: 1.00,
    artwork: 'https://via.placeholder.com/400x400?text=Access+Key',
    tasks: [
      { id: '1', type: 'twitter_follow', description: 'Follow our Twitter account', reward: 'Access Key' },
      { id: '2', type: 'discord_join', description: 'Join our Discord server', reward: 'Access Key' }
    ]
  }
}

// Access Key Minting Component (simplified)
function AccessKeyMinting({ campaign }: { campaign: any }) {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const [processing, setProcessing] = useState(false)

  const handleMintAccessKey = async () => {
    if (!publicKey) {
      alert('Please connect your wallet first')
      return
    }

    setProcessing(true)
    try {
      // Call your NFT minting API
      const response = await fetch('/api/nft/create-simple-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          name: campaign.accessKeyConfig.name,
          symbol: 'ACCESS',
          description: `Access key for ${campaign.name} campaign`
        })
      })

      const result = await response.json()
      
      if (result.success) {
        alert(`Access Key minted successfully! Token: ${result.mint}`)
      } else {
        throw new Error(result.error || 'Minting failed')
      }
    } catch (error) {
      console.error('Minting error:', error)
      alert('Minting failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="bg-white/5 rounded-xl p-6 border border-purple-300/20">
      <h3 className="text-xl font-bold text-white mb-4">🔑 Access Keys</h3>
      
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-300/20 rounded-lg p-4">
          <h4 className="font-semibold text-white">{campaign.accessKeyConfig.name}</h4>
          <p className="text-2xl font-bold text-green-400">${campaign.accessKeyConfig.pricePerKey}</p>
          <p className="text-sm text-gray-300 mt-2">
            Get exclusive access by minting an NFT access key directly to your wallet!
          </p>
        </div>

        <button
          onClick={handleMintAccessKey}
          disabled={processing || !publicKey}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
        >
          {processing ? 'Minting...' : publicKey ? 'Mint Access Key' : 'Connect Wallet'}
        </button>
      </div>
    </div>
  )
}

// Main Campaign Component
function StandaloneCampaignContent() {
  const { publicKey } = useWallet()
  const [campaign] = useState(STANDALONE_CAMPAIGN)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <nav className="bg-black/20 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {campaign.name}
            </h1>
            <WalletMultiButton />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Campaign Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cover Photo */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-purple-500/30">
              <img
                src={campaign.coverPhoto}
                alt={campaign.name}
                className="w-full h-64 object-cover"
              />
              <div className="p-6">
                <h2 className="text-3xl font-bold text-white mb-4">{campaign.name}</h2>
                <p className="text-gray-300 text-lg leading-relaxed">{campaign.description}</p>
              </div>
            </div>

            {/* Progress */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-300/20">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Funding Progress</h3>
                <span className="text-2xl font-bold text-green-400">
                  ${campaign.raisedAmount} / ${campaign.targetAmount}
                </span>
              </div>
              
              <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(campaign.raisedAmount / campaign.targetAmount) * 100}%` }}
                />
              </div>
              
              <div className="flex justify-between text-sm text-gray-400">
                <span>{Math.round((campaign.raisedAmount / campaign.targetAmount) * 100)}% funded</span>
                <span>{campaign.targetAmount - campaign.raisedAmount} remaining</span>
              </div>
            </div>
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-6">
            {/* Access Key Minting */}
            {campaign.enableAccessKeys && (
              <AccessKeyMinting campaign={campaign} />
            )}

            {/* Support Options */}
            <div className="bg-white/5 rounded-xl p-6 border border-purple-300/20">
              <h3 className="text-xl font-bold text-white mb-4">💝 Support This Project</h3>
              
              <div className="space-y-3">
                <button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all">
                  Donate SOL
                </button>
                
                <button className="w-full bg-white/10 border border-white/20 text-white py-3 rounded-lg font-semibold hover:bg-white/20 transition-all">
                  Share Campaign
                </button>
              </div>
            </div>

            {/* Creator Info */}
            <div className="bg-white/5 rounded-xl p-6 border border-purple-300/20">
              <h3 className="text-xl font-bold text-white mb-4">👤 Creator</h3>
              <div className="text-sm text-gray-300">
                <p className="font-mono break-all">{campaign.creator}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// App Wrapper with Wallet Providers
export default function StandaloneCampaignApp() {
  const network = WalletAdapterNetwork.Devnet
  const endpoint = useMemo(() => clusterApiUrl(network), [network])
  
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  )

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          <StandaloneCampaignContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
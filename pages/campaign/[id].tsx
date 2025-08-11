import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import TradingPanel from '../../components/TradingPanel'
import PriceChart from '../../components/PriceChart'

export default function CampaignDetail() {
  const router = useRouter()
  const { id } = router.query
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  
  const [campaign, setCampaign] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      // Mock data - will be replaced with actual program query
      const mockCampaign = {
        publicKey: id,
        name: 'DeFi Protocol Development',
        description: 'Building the next generation DeFi protocol on Solana with advanced AMM features, cross-chain bridges, and innovative yield strategies.',
        creator: 'Bw4...xY2',
        targetAmount: 100,
        raisedAmount: 67.5,
        tokenPrice: 0.0001,
        tokenSymbol: 'DEFI',
        marketCap: 67500,
        volume24h: 12500,
        holders: 234,
        endTimestamp: Date.now() + 30 * 24 * 60 * 60 * 1000,
        virtualSolReserves: 30,
        virtualTokenReserves: 1073000000,
        realSolReserves: 67.5,
        realTokenReserves: 800000000,
        totalSupply: 1000000000,
      }
      setCampaign(mockCampaign)
      setLoading(false)
    }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <p className="text-white">Campaign not found</p>
      </div>
    )
  }

  const progress = (campaign.raisedAmount / campaign.targetAmount) * 100
  const daysLeft = Math.ceil((campaign.endTimestamp - Date.now()) / (24 * 60 * 60 * 1000))

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <nav className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/')}
                className="text-white hover:text-purple-400 mr-4"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                launch.fund
              </h1>
            </div>
            <WalletMultiButton />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h1 className="text-3xl font-bold text-white mb-2">{campaign.name}</h1>
              <p className="text-gray-300 mb-4">{campaign.description}</p>
              
              <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
                <span>Creator: {campaign.creator}</span>
                <span>•</span>
                <span>{daysLeft} days left</span>
                <span>•</span>
                <span>{campaign.holders} holders</span>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Funding Progress</span>
                  <span className="text-white font-semibold">
                    {campaign.raisedAmount} / {campaign.targetAmount} SOL ({progress.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">Price Chart</h2>
              <PriceChart campaign={campaign} />
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">Token Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Market Cap</p>
                  <p className="text-lg font-semibold text-white">${campaign.marketCap.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">24h Volume</p>
                  <p className="text-lg font-semibold text-white">${campaign.volume24h.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Token Price</p>
                  <p className="text-lg font-semibold text-green-400">${campaign.tokenPrice}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Supply</p>
                  <p className="text-lg font-semibold text-white">1B {campaign.tokenSymbol}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <TradingPanel campaign={campaign} />
          </div>
        </div>
      </main>
    </div>
  )
}
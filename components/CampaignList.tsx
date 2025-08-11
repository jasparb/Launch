import { useState, useEffect } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import CampaignCard from './CampaignCard'

export default function CampaignList() {
  const { connection } = useConnection()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Mock data for now - will be replaced with actual program queries
  useEffect(() => {
    const mockCampaigns = [
      {
        publicKey: '1',
        name: 'DeFi Protocol Development',
        description: 'Building the next generation DeFi protocol on Solana',
        creator: 'Bw4...xY2',
        targetAmount: 100,
        raisedAmount: 67.5,
        tokenPrice: 0.0001,
        marketCap: 67500,
        volume24h: 12500,
        holders: 234,
        endTimestamp: Date.now() + 30 * 24 * 60 * 60 * 1000,
      },
      {
        publicKey: '2',
        name: 'NFT Marketplace',
        description: 'Decentralized NFT marketplace with AI-powered curation',
        creator: 'Hj9...mK3',
        targetAmount: 50,
        raisedAmount: 23.8,
        tokenPrice: 0.00008,
        marketCap: 23800,
        volume24h: 5600,
        holders: 156,
        endTimestamp: Date.now() + 45 * 24 * 60 * 60 * 1000,
      },
      {
        publicKey: '3',
        name: 'GameFi Platform',
        description: 'Play-to-earn gaming ecosystem with cross-chain support',
        creator: 'Lp2...vN8',
        targetAmount: 200,
        raisedAmount: 145.2,
        tokenPrice: 0.00015,
        marketCap: 145200,
        volume24h: 28900,
        holders: 512,
        endTimestamp: Date.now() + 15 * 24 * 60 * 60 * 1000,
      },
    ]
    setCampaigns(mockCampaigns)
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-2xl font-bold text-white mb-6">Active Campaigns</h3>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((campaign) => (
          <CampaignCard key={campaign.publicKey} campaign={campaign} />
        ))}
      </div>
    </div>
  )
}
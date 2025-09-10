import { useState, useEffect } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import CampaignCard from './CampaignCard'
import { campaignManager, Campaign } from '../lib/campaignStorage'
import { useSmartContractIntegration } from '../lib/smartContractIntegration'

export default function CampaignList() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const smartContract = useSmartContractIntegration()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  // Load campaigns (real blockchain campaigns + user-created local campaigns)
  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        // Load real campaigns from blockchain
        let realCampaigns: Campaign[] = []
        try {
          const blockchainCampaigns = await smartContract.getAllCampaigns()
          
          // Convert blockchain campaigns to local format
          realCampaigns = blockchainCampaigns.map(campaign => ({
            id: campaign.id,
            publicKey: campaign.id,
            name: campaign.name,
            description: campaign.description,
            coverPhoto: `https://images.unsplash.com/photo-${Math.random() > 0.5 ? '1639762681485-074b7f938ba0' : '1620321023374-d1a68fbc720d'}?w=400&h=300&fit=crop`,
            creator: `${campaign.creator.slice(0, 4)}...${campaign.creator.slice(-4)}`,
            targetAmount: campaign.targetAmount,
            raisedAmount: campaign.raisedAmount,
            tokenPrice: campaign.currentPrice || 0.0001,
            marketCap: (campaign.totalSupply * (campaign.currentPrice || 0.0001)),
            volume24h: 0, // No volume data available
            holders: 0, // No holder data available
            endTimestamp: campaign.endTimestamp,
            duration: '30',
            fundingRatio: '50',
            conversionStrategy: 'hybrid',
            enableAirdrop: false,
            enableRoadmap: false,
            createdAt: campaign.createdAt,
            tokenSymbol: campaign.tokenSymbol,
            tokenName: campaign.tokenName,
            tokenMint: campaign.tokenMint, // Include token mint address
            realTokenReserves: campaign.distributedTokens,
            tokenTotalSupply: campaign.totalSupply,
          }))
        } catch (error) {
          console.log('No real campaigns found or error loading:', error)
        }

        
        // Get user-created campaigns
        const userCampaigns = campaignManager.getAllCampaigns()
        
        // Combine real blockchain campaigns and user-created campaigns
        const allCampaigns = [
          ...realCampaigns,
          ...userCampaigns
        ].sort((a, b) => b.createdAt - a.createdAt)
        
        setCampaigns(allCampaigns)
        setLoading(false)
      } catch (error) {
        console.error('Error loading campaigns:', error)
        
        // Fallback to local campaigns only
        const userCampaigns = campaignManager.getAllCampaigns()
        setCampaigns(userCampaigns)
        setLoading(false)
      }
    }

    loadCampaigns()
    
    // Set up interval to refresh campaigns periodically (reduced to prevent rate limiting)
    const interval = setInterval(loadCampaigns, 120000) // Refresh every 2 minutes
    return () => clearInterval(interval)
  }, [smartContract])

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
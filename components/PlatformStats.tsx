import { useState, useEffect } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { useSmartContractIntegration } from '../lib/smartContractIntegration'
import { getTransactionMonitor } from '../lib/transactionMonitor'
import { formatNumber, formatCurrency, formatAddress } from '../lib/utils'

interface PlatformStatsProps {
  showLeaderboards?: boolean
}

interface LeaderboardEntry {
  address: string
  totalContributed: number
  campaignCount: number
  rank: number
}

interface TopCampaign {
  id: string
  name: string
  volume24h: number
  marketCap: number
  priceChange24h: number
}

export default function PlatformStats({ showLeaderboards = true }: PlatformStatsProps) {
  const { connection } = useConnection()
  const smartContract = useSmartContractIntegration()
  const [stats, setStats] = useState({
    totalValueLocked: 0,
    totalTransactions: 0,
    totalCampaigns: 0,
    totalUsers: 0,
    averageRaise: 0,
    successRate: 0
  })
  const [topContributors, setTopContributors] = useState<LeaderboardEntry[]>([])
  const [topCampaigns, setTopCampaigns] = useState<TopCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'stats' | 'contributors' | 'campaigns'>('stats')

  useEffect(() => {
    const loadPlatformStats = async () => {
      try {
        // Get all campaigns
        const campaigns = await smartContract.getAllCampaigns()
        const monitor = getTransactionMonitor(connection)
        
        // Calculate platform statistics
        let totalValueLocked = 0
        let totalTransactions = 0
        let totalUsers = 0
        const userContributions = new Map<string, number>()
        const campaignVolumes = new Map<string, { volume: number; transactions: number; campaign: any }>()
        
        const now = Date.now()
        const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000)

        for (const campaign of campaigns) {
          totalValueLocked += campaign.raisedAmount
          
          // Get transaction data
          const transactions = monitor.getTransactions(campaign.id)
          const recentTransactions = transactions.filter(tx => tx.blockTime >= twentyFourHoursAgo)
          
          totalTransactions += transactions.length
          
          // Calculate user contributions
          const contributions = transactions.filter(tx => tx.type === 'contribution')
          for (const tx of contributions) {
            const current = userContributions.get(tx.user) || 0
            userContributions.set(tx.user, current + tx.amount)
          }
          
          // Calculate campaign volumes
          const volume24h = recentTransactions
            .filter(tx => tx.type === 'contribution')
            .reduce((sum, tx) => sum + tx.amount, 0)
          
          campaignVolumes.set(campaign.id, {
            volume: volume24h,
            transactions: recentTransactions.length,
            campaign
          })
        }

        totalUsers = userContributions.size
        const averageRaise = campaigns.length > 0 ? totalValueLocked / campaigns.length : 0
        const successfulCampaigns = campaigns.filter(c => c.raisedAmount >= c.targetAmount * 0.5).length
        const successRate = campaigns.length > 0 ? (successfulCampaigns / campaigns.length) * 100 : 0

        setStats({
          totalValueLocked,
          totalTransactions,
          totalCampaigns: campaigns.length,
          totalUsers,
          averageRaise,
          successRate
        })

        // Create leaderboards
        if (showLeaderboards) {
          // Top contributors
          const contributors = Array.from(userContributions.entries())
            .map(([address, amount]) => ({
              address,
              totalContributed: amount,
              campaignCount: 1, // Simplified - would need more complex calculation
              rank: 0
            }))
            .sort((a, b) => b.totalContributed - a.totalContributed)
            .slice(0, 10)
            .map((entry, index) => ({ ...entry, rank: index + 1 }))

          setTopContributors(contributors)

          // Top campaigns by volume
          const topCampaignsList = Array.from(campaignVolumes.entries())
            .map(([id, data]) => ({
              id,
              name: data.campaign.name,
              volume24h: data.volume,
              marketCap: data.campaign.marketCap,
              priceChange24h: Math.random() * 20 - 10 // Simplified - would calculate real price change
            }))
            .sort((a, b) => b.volume24h - a.volume24h)
            .slice(0, 10)

          setTopCampaigns(topCampaignsList)
        }

        setLoading(false)
      } catch (error) {
        console.error('Error loading platform stats:', error)
        setLoading(false)
      }
    }

    if (connection) {
      loadPlatformStats()
      
      // Refresh every 60 seconds
      const interval = setInterval(loadPlatformStats, 60000)
      return () => clearInterval(interval)
    }
  }, [connection, smartContract, showLeaderboards])

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <h3 className="text-xl font-bold text-white mb-6">Platform Analytics</h3>

      {showLeaderboards && (
        <div className="flex mb-6 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'stats'
                ? 'bg-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Stats
          </button>
          <button
            onClick={() => setActiveTab('contributors')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'contributors'
                ? 'bg-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Top Contributors
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'campaigns'
                ? 'bg-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Top Campaigns
          </button>
        </div>
      )}

      {(!showLeaderboards || activeTab === 'stats') && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Total Value Locked</div>
            <div className="text-lg font-bold text-white">
              {formatNumber(stats.totalValueLocked)} SOL
            </div>
            <div className="text-xs text-green-400">
              ${(stats.totalValueLocked * 150).toLocaleString()} USD
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Total Transactions</div>
            <div className="text-lg font-bold text-white">
              {stats.totalTransactions.toLocaleString()}
            </div>
            <div className="text-xs text-blue-400">
              Across all campaigns
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Active Campaigns</div>
            <div className="text-lg font-bold text-white">
              {stats.totalCampaigns}
            </div>
            <div className="text-xs text-purple-400">
              {Math.round(stats.successRate)}% success rate
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Unique Users</div>
            <div className="text-lg font-bold text-white">
              {stats.totalUsers.toLocaleString()}
            </div>
            <div className="text-xs text-yellow-400">
              Avg: {formatNumber(stats.averageRaise)} SOL
            </div>
          </div>
        </div>
      )}

      {showLeaderboards && activeTab === 'contributors' && (
        <div className="space-y-3">
          {topContributors.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🏆</div>
              <p className="text-gray-400 text-sm">No contributors yet</p>
            </div>
          ) : (
            topContributors.map((contributor) => (
              <div
                key={contributor.address}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
              >
                <div className={`text-lg font-bold ${
                  contributor.rank === 1 ? 'text-yellow-400' :
                  contributor.rank === 2 ? 'text-gray-300' :
                  contributor.rank === 3 ? 'text-orange-400' : 'text-gray-400'
                }`}>
                  #{contributor.rank}
                </div>

                <div className="flex-grow">
                  <div className="text-sm font-medium text-white">
                    {formatAddress(contributor.address)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {contributor.campaignCount} campaign{contributor.campaignCount !== 1 ? 's' : ''}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-green-400">
                    {formatNumber(contributor.totalContributed)} SOL
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showLeaderboards && activeTab === 'campaigns' && (
        <div className="space-y-3">
          {topCampaigns.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🚀</div>
              <p className="text-gray-400 text-sm">No campaigns yet</p>
            </div>
          ) : (
            topCampaigns.map((campaign, index) => (
              <div
                key={campaign.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => window.open(`/campaign/${campaign.id}`, '_blank')}
              >
                <div className={`text-lg font-bold ${
                  index === 0 ? 'text-yellow-400' :
                  index === 1 ? 'text-gray-300' :
                  index === 2 ? 'text-orange-400' : 'text-gray-400'
                }`}>
                  #{index + 1}
                </div>

                <div className="flex-grow">
                  <div className="text-sm font-medium text-white">
                    {campaign.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    Market Cap: ${formatNumber(campaign.marketCap)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-blue-400">
                    {formatNumber(campaign.volume24h)} SOL
                  </div>
                  <div className={`text-xs ${
                    campaign.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {campaign.priceChange24h >= 0 ? '+' : ''}{campaign.priceChange24h.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
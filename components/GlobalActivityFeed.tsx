import { useState, useEffect } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { useSmartContractIntegration } from '../lib/smartContractIntegration'
import { getTransactionMonitor, TransactionEvent } from '../lib/transactionMonitor'
import { formatNumber, formatAddress, formatTime } from '../lib/utils'

interface GlobalActivityFeedProps {
  maxItems?: number
}

export default function GlobalActivityFeed({ maxItems = 15 }: GlobalActivityFeedProps) {
  const { connection } = useConnection()
  const smartContract = useSmartContractIntegration()
  const [activities, setActivities] = useState<TransactionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalVolume24h: 0,
    totalTransactions24h: 0,
    activeCampaigns: 0
  })

  useEffect(() => {
    const loadGlobalActivity = async () => {
      try {
        // Get all campaigns
        const campaigns = await smartContract.getAllCampaigns()
        const monitor = getTransactionMonitor(connection)
        
        // Collect recent transactions from all campaigns
        const allTransactions: TransactionEvent[] = []
        let totalVolume = 0
        let totalTxCount = 0
        const now = Date.now()
        const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000)

        for (const campaign of campaigns) {
          const transactions = monitor.getTransactions(campaign.id)
          
          // Filter for last 24 hours
          const recentTransactions = transactions.filter(tx => 
            tx.blockTime >= twentyFourHoursAgo
          )
          
          allTransactions.push(...recentTransactions)
          
          // Calculate stats
          const volume = recentTransactions
            .filter(tx => tx.type === 'contribution')
            .reduce((sum, tx) => sum + tx.amount, 0)
          
          totalVolume += volume
          totalTxCount += recentTransactions.length
        }

        // Sort by timestamp (newest first) and limit
        allTransactions.sort((a, b) => b.blockTime - a.blockTime)
        setActivities(allTransactions.slice(0, maxItems))

        setStats({
          totalVolume24h: totalVolume,
          totalTransactions24h: totalTxCount,
          activeCampaigns: campaigns.length
        })

        setLoading(false)
      } catch (error) {
        console.error('Error loading global activity:', error)
        setLoading(false)
      }
    }

    if (connection) {
      loadGlobalActivity()
      
      // Refresh every 30 seconds
      const interval = setInterval(loadGlobalActivity, 30000)
      return () => clearInterval(interval)
    }
  }, [connection, smartContract, maxItems])

  const getActivityIcon = (type: TransactionEvent['type']) => {
    switch (type) {
      case 'contribution':
        return '💰'
      case 'withdrawal':
        return '📤'
      case 'campaign_created':
        return '🚀'
      default:
        return '📊'
    }
  }

  const getActivityDescription = (tx: TransactionEvent) => {
    switch (tx.type) {
      case 'contribution':
        return `bought tokens for ${formatNumber(tx.amount)} SOL`
      case 'withdrawal':
        return `withdrew ${formatNumber(tx.amount)} SOL`
      case 'campaign_created':
        return 'launched a campaign'
      default:
        return 'made a transaction'
    }
  }

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-4">Platform Activity</h3>
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">Platform Activity</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-green-400">LIVE</span>
        </div>
      </div>

      {/* 24h Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-400 mb-1">24h Volume</div>
          <div className="text-lg font-bold text-white">
            {formatNumber(stats.totalVolume24h)} SOL
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-400 mb-1">24h Transactions</div>
          <div className="text-lg font-bold text-white">
            {stats.totalTransactions24h}
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-400 mb-1">Active Campaigns</div>
          <div className="text-lg font-bold text-white">
            {stats.activeCampaigns}
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="space-y-3">
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🌟</div>
            <h4 className="text-lg font-semibold text-white mb-2">Platform is Starting Up</h4>
            <p className="text-gray-400 text-sm">
              Be the first to create a campaign and start trading!
            </p>
          </div>
        ) : (
          activities.map((activity, index) => (
            <div
              key={`${activity.signature}-${index}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="text-xl flex-shrink-0">
                {getActivityIcon(activity.type)}
              </div>

              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-white">
                    {formatAddress(activity.user)}
                  </span>
                  <span className="text-xs text-gray-300">
                    {getActivityDescription(activity)}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{formatTime(activity.blockTime)}</span>
                  <span>Campaign: {formatAddress(activity.campaignAddress)}</span>
                  {activity.price && (
                    <span>@ ${activity.price.toFixed(8)}</span>
                  )}
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="text-sm font-semibold text-green-400">
                  {formatNumber(activity.amount)} SOL
                </div>
                {activity.tokenAmount && (
                  <div className="text-xs text-gray-400">
                    {formatNumber(activity.tokenAmount)} tokens
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {activities.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="text-xs text-gray-400 text-center">
            Showing last {activities.length} transactions across all campaigns
          </div>
        </div>
      )}

      {/* Call to action for empty state */}
      {activities.length === 0 && (
        <div className="mt-6 text-center">
          <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all">
            Create First Campaign
          </button>
        </div>
      )}
    </div>
  )
}
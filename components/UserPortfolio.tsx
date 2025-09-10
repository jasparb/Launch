import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useSmartContractIntegration } from '../lib/smartContractIntegration'
import { formatNumber } from '../lib/utils'

interface PortfolioToken {
  campaign: any
  balance: number
  balanceUSD: number
}

export default function UserPortfolio() {
  const { publicKey } = useWallet()
  const smartContract = useSmartContractIntegration()
  const [tokens, setTokens] = useState<PortfolioToken[]>([])
  const [loading, setLoading] = useState(false)
  const [totalValue, setTotalValue] = useState(0)

  useEffect(() => {
    if (!publicKey) {
      setTokens([])
      setTotalValue(0)
      return
    }

    loadPortfolio()
  }, [publicKey])

  const loadPortfolio = async () => {
    if (!publicKey) return
    
    setLoading(true)
    try {
      const userTokens = await smartContract.getUserCampaignTokens(publicKey)
      const tokensWithCampaign = userTokens.map(token => ({
        ...token,
        campaign: null // Add campaign property to match interface
      }))
      setTokens(tokensWithCampaign)
      
      const total = userTokens.reduce((sum, token) => sum + token.balanceUSD, 0)
      setTotalValue(total)
    } catch (error) {
      console.error('Error loading portfolio:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!publicKey) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-4">Your Portfolio</h3>
        <p className="text-gray-400">Connect your wallet to view your token portfolio</p>
      </div>
    )
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">Your Portfolio</h3>
        <button
          onClick={loadPortfolio}
          disabled={loading}
          className="px-3 py-1 bg-purple-500/20 border border-purple-400/30 text-purple-300 rounded-lg text-sm hover:bg-purple-500/30 transition-colors disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="mb-6">
        <div className="text-sm text-gray-400 mb-1">Total Portfolio Value</div>
        <div className="text-2xl font-bold text-white">
          ${totalValue.toFixed(2)}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
        </div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🪙</div>
          <h4 className="text-lg font-semibold text-white mb-2">No Tokens Yet</h4>
          <p className="text-gray-400 text-sm">
            Contribute to campaigns to start building your portfolio
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tokens.map((token, index) => (
            <div
              key={`${token.campaign.publicKey}-${index}`}
              className="bg-white/5 rounded-lg p-4 border border-white/10"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold text-white">{token.campaign.tokenSymbol}</h4>
                  <p className="text-sm text-gray-400">{token.campaign.name}</p>
                </div>
                <div className="text-right">
                  <div className="text-white font-semibold">
                    {formatNumber(token.balance)} {token.campaign.tokenSymbol}
                  </div>
                  <div className="text-sm text-gray-400">
                    ${token.balanceUSD.toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Current Price: ${token.campaign.currentPrice.toFixed(6)}</span>
                <span>
                  {((token.balanceUSD / totalValue) * 100).toFixed(1)}% of portfolio
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tokens.length > 0 && (
        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="text-xs text-gray-500">
            Portfolio updates automatically when you make transactions
          </div>
        </div>
      )}
    </div>
  )
}
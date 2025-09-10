// Creator Funding Pool Dashboard - Manage withdrawals and view pool status
// Integrates with DEX graduation system

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useCreatorFundingPools, FundingPool, FundingWithdrawal } from '../lib/creatorFundingPools'
import { useRealDEXIntegration } from '../lib/realDexIntegration'
import { realGraduationService } from '../lib/realGraduationService'
import { formatNumber } from '../lib/utils'
import { BanknotesIcon, ArrowDownTrayIcon, ChartBarIcon, ClockIcon, UsersIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface CreatorFundingDashboardProps {
  campaignId?: string
}

export default function CreatorFundingDashboard({ campaignId }: CreatorFundingDashboardProps) {
  const { publicKey, connected } = useWallet()
  const fundingPoolManager = useCreatorFundingPools()
  const realDex = useRealDEXIntegration()
  
  const [pools, setPools] = useState<FundingPool[]>([])
  const [selectedPool, setSelectedPool] = useState<FundingPool | null>(null)
  const [withdrawalAmount, setWithdrawalAmount] = useState('')
  const [withdrawalReason, setWithdrawalReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'withdraw' | 'history' | 'graduation'>('overview')

  // Load creator's funding pools
  useEffect(() => {
    if (!connected || !publicKey) {
      setPools([])
      return
    }

    const loadPools = () => {
      let creatorPools: FundingPool[]
      
      if (campaignId) {
        creatorPools = fundingPoolManager.getPoolsForCampaign(campaignId)
      } else {
        creatorPools = fundingPoolManager.getPoolsForCreator(publicKey.toString())
      }

      setPools(creatorPools)
      if (creatorPools.length > 0 && !selectedPool) {
        setSelectedPool(creatorPools[0])
      }
    }

    loadPools()
    
    // Refresh every 10 seconds
    const interval = setInterval(loadPools, 10000)
    return () => clearInterval(interval)
  }, [connected, publicKey, campaignId, fundingPoolManager])

  // Request withdrawal
  const handleWithdrawRequest = async () => {
    if (!selectedPool || !withdrawalAmount || loading) return

    setLoading(true)
    try {
      const amount = parseFloat(withdrawalAmount)
      
      const result = await fundingPoolManager.requestWithdrawal(
        selectedPool.id,
        amount,
        undefined, // milestoneId - would be set for milestone-based withdrawals
        withdrawalReason
      )

      if (result.success) {
        alert(`Withdrawal request submitted successfully!\nRequest ID: ${result.withdrawalId}`)
        setWithdrawalAmount('')
        setWithdrawalReason('')
        
        // Refresh pools
        const updatedPools = fundingPoolManager.getPoolsForCreator(publicKey!.toString())
        setPools(updatedPools)
        const updatedPool = updatedPools.find(p => p.id === selectedPool.id)
        if (updatedPool) setSelectedPool(updatedPool)
      } else {
        alert(`Withdrawal request failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Withdrawal request error:', error)
      alert(`Withdrawal request failed: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  // Check graduation status
  const checkGraduationStatus = async (pool: FundingPool) => {
    try {
      const eligibility = await realDex.checkGraduationEligibility(pool.tokenMint, { 
        raisedAmount: pool.reservedForLiquidity,
        currentPrice: 0.0001,
        totalSupply: 1000000000
      })
      
      return eligibility
    } catch (error) {
      console.error('Error checking graduation status:', error)
      return null
    }
  }

  // Prepare for graduation
  const handlePrepareGraduation = async (pool: FundingPool) => {
    setLoading(true)
    try {
      const result = await fundingPoolManager.prepareForGraduation(pool.id)
      
      if (result.success) {
        alert(`Pool prepared for graduation!\nLiquidity ready: ${result.liquidityAmount} SOL`)
        
        // Trigger graduation process
        const graduationResult = await realGraduationService.executeRealGraduation(
          pool.tokenMint,
          pool.campaignId
        )
        
        if (graduationResult.success) {
          alert('🎉 Token graduated to Raydium successfully!')
          fundingPoolManager.markAsGraduated(pool.id, graduationResult.event!.postGraduation.poolId)
        }
      } else {
        alert(`Graduation preparation failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Graduation error:', error)
      alert(`Graduation failed: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  if (!connected) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center">
        <BanknotesIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-300">Connect your wallet to view funding pools</p>
      </div>
    )
  }

  if (pools.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center">
        <BanknotesIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-300">No funding pools found</p>
        <p className="text-gray-400 text-sm mt-2">Create a campaign with funding pools enabled</p>
      </div>
    )
  }

  const pool = selectedPool!

  return (
    <div className="space-y-6">
      {/* Pool Selector */}
      {pools.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Select Funding Pool</label>
          <select
            value={selectedPool?.id || ''}
            onChange={(e) => {
              const pool = pools.find(p => p.id === e.target.value)
              setSelectedPool(pool || null)
            }}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
          >
            {pools.map(pool => (
              <option key={pool.id} value={pool.id}>
                {pool.campaignId} - {pool.config.currency}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Pool Overview */}
      <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-xl p-6 border border-green-500/30">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Funding Pool Overview</h2>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
            pool.status === 'Active' ? 'bg-green-500/20 text-green-400' :
            pool.status === 'Graduated' ? 'bg-blue-500/20 text-blue-400' :
            'bg-gray-500/20 text-gray-400'
          }`}>
            {pool.status}
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Total Collected</div>
            <div className="text-white text-lg font-bold">
              {formatNumber(pool.totalCollected)} {pool.config.currency}
            </div>
          </div>
          
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Available to Withdraw</div>
            <div className="text-green-400 text-lg font-bold">
              {formatNumber(pool.availableForWithdrawal)} {pool.config.currency}
            </div>
          </div>
          
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-gray-400 text-sm">DEX Liquidity Reserved</div>
            <div className="text-blue-400 text-lg font-bold">
              {formatNumber(pool.reservedForLiquidity)} {pool.config.currency}
            </div>
          </div>
          
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Contributors</div>
            <div className="text-white text-lg font-bold">
              {pool.contributors.length}
            </div>
          </div>
        </div>

        {/* Pool Configuration Summary */}
        <div className="bg-black/30 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-2">Pool Configuration</div>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Funding: </span>
              <span className="text-white">{pool.config.poolPercentage}%</span>
            </div>
            <div>
              <span className="text-gray-400">DEX Liquidity: </span>
              <span className="text-white">{pool.config.liquidityPercentage}%</span>
            </div>
            <div>
              <span className="text-gray-400">Withdrawal: </span>
              <span className="text-white">{pool.config.withdrawalSchedule.type}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-4 border-b border-white/20">
        {[
          { id: 'overview', name: 'Overview', icon: ChartBarIcon },
          { id: 'withdraw', name: 'Withdraw', icon: ArrowDownTrayIcon },
          { id: 'history', name: 'History', icon: ClockIcon },
          { id: 'graduation', name: 'DEX Graduation', icon: CheckCircleIcon }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="bg-white/10 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Recent Contributors</h3>
            {pool.contributors.slice(0, 5).map((contributor, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-white/10 last:border-b-0">
                <div className="text-white font-mono text-sm">
                  {contributor.walletAddress.slice(0, 8)}...{contributor.walletAddress.slice(-8)}
                </div>
                <div className="text-right">
                  <div className="text-white text-sm">{formatNumber(contributor.totalContributed)} {pool.config.currency}</div>
                  <div className="text-gray-400 text-xs">{formatNumber(contributor.tokenBalance)} tokens</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'withdraw' && (
        <div className="bg-white/10 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Request Withdrawal</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Amount ({pool.config.currency})</label>
              <input
                type="number"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                max={pool.availableForWithdrawal}
                step="0.01"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                placeholder={`Max: ${formatNumber(pool.availableForWithdrawal)}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Reason (Optional)</label>
              <textarea
                value={withdrawalReason}
                onChange={(e) => setWithdrawalReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                placeholder="Describe what these funds will be used for..."
              />
            </div>

            {pool.config.requiresVoting && (
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-yellow-300 text-sm">
                  This withdrawal requires {pool.config.minimumVotes}% community approval.
                  Token holders will vote on your request.
                </p>
              </div>
            )}

            <button
              onClick={handleWithdrawRequest}
              disabled={loading || !withdrawalAmount || parseFloat(withdrawalAmount) > pool.availableForWithdrawal}
              className={`w-full py-3 rounded-lg font-semibold transition-all ${
                loading || !withdrawalAmount || parseFloat(withdrawalAmount) > pool.availableForWithdrawal
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600'
              }`}
            >
              {loading ? 'Processing...' : 'Request Withdrawal'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white/10 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Withdrawal History</h3>
          
          {pool.withdrawals.length === 0 ? (
            <p className="text-gray-400">No withdrawals yet</p>
          ) : (
            <div className="space-y-3">
              {pool.withdrawals.map(withdrawal => (
                <div key={withdrawal.id} className="bg-black/30 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-white font-semibold">
                      {formatNumber(withdrawal.amount)} {withdrawal.currency}
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-semibold ${
                      withdrawal.status === 'Executed' ? 'bg-green-500/20 text-green-400' :
                      withdrawal.status === 'Approved' ? 'bg-blue-500/20 text-blue-400' :
                      withdrawal.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {withdrawal.status}
                    </div>
                  </div>
                  <div className="text-gray-400 text-sm">
                    Requested: {new Date(withdrawal.requestedAt).toLocaleDateString()}
                  </div>
                  {withdrawal.transactionSignature && (
                    <div className="text-gray-400 text-xs mt-1">
                      TX: {withdrawal.transactionSignature.slice(0, 16)}...
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'graduation' && (
        <div className="bg-white/10 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">DEX Graduation Status</h3>
          
          {pool.graduationStatus === 'Graduated' ? (
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircleIcon className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-semibold">Token Graduated!</span>
              </div>
              <p className="text-gray-300 mb-3">Your token is now trading on Raydium DEX</p>
              <a
                href={`https://raydium.io/swap/?inputCurrency=sol&outputCurrency=${pool.tokenMint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
              >
                Trade on Raydium →
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                <div className="text-blue-400 font-semibold mb-2">Graduation Requirements</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Market Cap: </span>
                    <span className="text-white">$69,000 required</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Liquidity: </span>
                    <span className="text-white">8 SOL minimum</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-black/30 rounded-lg p-4">
                <div className="text-white font-semibold mb-2">Current Status</div>
                <div className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">Reserved Liquidity:</span>
                    <span className="text-white">{formatNumber(pool.reservedForLiquidity)} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Graduation Status:</span>
                    <span className={pool.graduationStatus === 'Eligible' ? 'text-green-400' : 'text-yellow-400'}>
                      {pool.graduationStatus}
                    </span>
                  </div>
                </div>
              </div>

              {pool.graduationStatus === 'Eligible' && (
                <button
                  onClick={() => handlePrepareGraduation(pool)}
                  disabled={loading}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    loading
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600'
                  }`}
                >
                  {loading ? 'Processing...' : '🚀 Graduate to Raydium DEX'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
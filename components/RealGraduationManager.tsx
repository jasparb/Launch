// Real Graduation Manager - Replaces fake graduation system
// Shows actual graduation progress and enables real DEX pool creation

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useRealDEXIntegration } from '../lib/realDexIntegration'
import { useSmartContractIntegration } from '../lib/smartContractIntegration'
import { realGraduationService, GraduationProgress, RealGraduationEvent } from '../lib/realGraduationService'

interface RealGraduationManagerProps {
  tokenMint: string
  campaignId: string
  campaignData: any
}

export default function RealGraduationManager({ 
  tokenMint, 
  campaignId, 
  campaignData 
}: RealGraduationManagerProps) {
  const { publicKey, connected } = useWallet()
  const realDex = useRealDEXIntegration()
  const smartContract = useSmartContractIntegration()
  
  const [progress, setProgress] = useState<GraduationProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [graduating, setGraduating] = useState(false)
  const [graduationEvent, setGraduationEvent] = useState<RealGraduationEvent | null>(null)
  const [costs, setCosts] = useState<any>(null)

  // Initialize graduation service
  useEffect(() => {
    realGraduationService.initialize(realDex, smartContract)
  }, [realDex, smartContract])

  // Load graduation progress
  useEffect(() => {
    const loadProgress = async () => {
      try {
        setLoading(true)

        // Check if already graduated
        const existingEvent = realGraduationService.getGraduationEvent(tokenMint)
        if (existingEvent) {
          setGraduationEvent(existingEvent)
          setLoading(false)
          return
        }

        // Check graduation eligibility
        const progressData = await realGraduationService.checkRealGraduationEligibility(
          tokenMint,
          campaignId
        )
        setProgress(progressData)

        // Get cost estimates
        const costEstimates = await realDex.estimatePoolCreationCost()
        setCosts(costEstimates)

        // Add to monitoring if close to graduation
        if (progressData.progressPercent > 50) {
          realGraduationService.addToGraduationWatch(tokenMint, campaignId)
        }

      } catch (error) {
        console.error('Error loading graduation progress:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProgress()
  }, [tokenMint, campaignId, realDex])

  // Listen for graduation events
  useEffect(() => {
    const handleGraduation = (event: CustomEvent) => {
      const graduationEvent = event.detail as RealGraduationEvent
      if (graduationEvent.tokenMint === tokenMint) {
        setGraduationEvent(graduationEvent)
        setGraduating(false)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('tokenGraduation', handleGraduation as EventListener)
      return () => window.removeEventListener('tokenGraduation', handleGraduation as EventListener)
    }
  }, [tokenMint])

  // Execute real graduation
  const handleGraduation = async () => {
    if (!connected || !publicKey || graduating) return

    try {
      setGraduating(true)
      console.log('🚀 Starting real token graduation...', { tokenMint, campaignId })

      const result = await realGraduationService.executeRealGraduation(tokenMint, campaignId)
      
      if (result.success && result.event) {
        setGraduationEvent(result.event)
        
        // Show success message
        alert(`🎉 Token graduated successfully! Pool created on Raydium.\nTransaction: ${result.event.postGraduation.transactionSignature}`)
      } else {
        alert(`❌ Graduation failed: ${result.error}`)
      }

    } catch (error) {
      console.error('Graduation error:', error)
      alert(`❌ Graduation error: ${error}`)
    } finally {
      setGraduating(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          <span className="ml-3 text-white">Loading graduation status...</span>
        </div>
      </div>
    )
  }

  // Show graduated status
  if (graduationEvent) {
    return (
      <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-xl p-6 border border-green-500/30">
        <div className="flex items-center mb-4">
          <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
          <h3 className="text-xl font-bold text-green-400">🎉 Token Graduated!</h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-gray-400 text-sm">Raydium Pool ID</p>
            <p className="text-white font-mono text-sm break-all">
              {graduationEvent.postGraduation.poolId}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Transaction</p>
            <a 
              href={`https://explorer.solana.com/tx/${graduationEvent.postGraduation.transactionSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-mono text-sm break-all"
            >
              {graduationEvent.postGraduation.transactionSignature.slice(0, 8)}...
            </a>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Initial Liquidity</p>
            <p className="text-green-400 font-semibold">
              ${graduationEvent.postGraduation.initialLiquidityUSD.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Graduated On</p>
            <p className="text-white">
              {new Date(graduationEvent.graduatedAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Platform</p>
            <p className="text-purple-400 font-semibold uppercase">
              {graduationEvent.postGraduation.dexPlatform}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">Token is now tradeable on Raydium DEX</span>
            <a 
              href={`https://raydium.io/swap/?inputCurrency=sol&outputCurrency=${tokenMint}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 text-sm font-semibold"
            >
              Trade on Raydium →
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Show graduation progress
  if (!progress) return null

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">🎓 Real DEX Graduation</h3>
        <div className="text-right">
          <div className="text-sm text-gray-400">Progress to DEX</div>
          <div className={`text-lg font-bold ${progress.isEligible ? 'text-green-400' : 'text-yellow-400'}`}>
            {progress.progressPercent.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${
              progress.isEligible 
                ? 'bg-gradient-to-r from-green-400 to-blue-500' 
                : 'bg-gradient-to-r from-yellow-400 to-orange-500'
            }`}
            style={{ width: `${Math.min(progress.progressPercent, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Start</span>
          <span>Ready for Raydium</span>
        </div>
      </div>

      {/* Current Metrics */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Current Metrics</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Market Cap:</span>
              <span className="text-white">${progress.currentMetrics.marketCapUSD.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Liquidity:</span>
              <span className="text-white">{progress.currentMetrics.liquiditySOL.toFixed(2)} SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Holders:</span>
              <span className="text-white">{progress.currentMetrics.holdersCount}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Requirements</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Min Market Cap:</span>
              <span className="text-white">${progress.requirements.minimumMarketCapUSD.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Min Liquidity:</span>
              <span className="text-white">{progress.requirements.minimumLiquiditySOL} SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Platform Fee:</span>
              <span className="text-white">{progress.requirements.graduationFeePercent}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Next Milestone */}
      <div className="mb-4 p-3 bg-purple-500/20 rounded-lg border border-purple-500/30">
        <div className="text-sm text-gray-400">Next Milestone</div>
        <div className="text-purple-400 font-semibold">{progress.nextMilestone}</div>
      </div>

      {/* Graduation Costs */}
      {costs && (
        <div className="mb-4 p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
          <div className="text-sm font-semibold text-gray-300 mb-2">Graduation Costs</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Pool Creation:</span>
              <span className="text-white">{costs.poolCreation} SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Platform Fee:</span>
              <span className="text-white">{costs.platformFee} SOL</span>
            </div>
          </div>
          <div className="flex justify-between text-sm font-semibold mt-2 pt-2 border-t border-white/10">
            <span className="text-gray-300">Total Cost:</span>
            <span className="text-blue-400">{costs.totalSOL} SOL</span>
          </div>
        </div>
      )}

      {/* Graduation Button */}
      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-400">
          {progress.isEligible ? 'Ready for graduation to Raydium!' : 'Not yet eligible for graduation'}
        </div>
        
        {progress.isEligible && connected && (
          <button
            onClick={handleGraduation}
            disabled={graduating}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              graduating
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600'
            }`}
          >
            {graduating ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Graduating...
              </div>
            ) : (
              '🚀 Graduate to Raydium'
            )}
          </button>
        )}
      </div>

      {progress.estimatedGraduationTime && (
        <div className="mt-3 text-xs text-gray-400">
          Estimated graduation: {new Date(progress.estimatedGraduationTime).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}
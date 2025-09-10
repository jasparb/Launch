import { useState, useEffect } from 'react'
import { liquidityGraduationManager, GraduationStatus } from '../lib/liquidityPoolGraduation'

interface GraduationProgressProps {
  tokenAddress: string
  campaignId: string
  className?: string
}

export default function GraduationProgress({ 
  tokenAddress, 
  campaignId, 
  className = '' 
}: GraduationProgressProps) {
  const [graduationStatus, setGraduationStatus] = useState<GraduationStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGraduating, setIsGraduating] = useState(false)
  const [graduationEvent, setGraduationEvent] = useState<any>(null)

  useEffect(() => {
    loadGraduationStatus()
    
    // Check if already graduated
    const existingEvent = liquidityGraduationManager.getGraduationEvent(tokenAddress)
    if (existingEvent) {
      setGraduationEvent(existingEvent)
    }
  }, [tokenAddress, campaignId])

  const loadGraduationStatus = async () => {
    setIsLoading(true)
    try {
      const status = await liquidityGraduationManager.checkGraduationEligibility(
        tokenAddress, 
        campaignId
      )
      setGraduationStatus(status)
    } catch (error) {
      console.error('Error loading graduation status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGraduate = async () => {
    if (!graduationStatus?.isEligible) return
    
    setIsGraduating(true)
    try {
      const result = await liquidityGraduationManager.executeGraduation(
        tokenAddress,
        campaignId
      )
      
      if (result) {
        setGraduationEvent(result)
        alert('🎉 Token successfully graduated to DEX!')
      } else {
        alert('Graduation failed. Please try again.')
      }
    } catch (error) {
      console.error('Graduation error:', error)
      alert('Graduation failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsGraduating(false)
    }
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`
    } else {
      return `$${amount.toFixed(0)}`
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffHours = (timestamp - now.getTime()) / (1000 * 60 * 60)
    
    if (diffHours < 24) {
      return `${Math.ceil(diffHours)} hours`
    } else {
      return `${Math.ceil(diffHours / 24)} days`
    }
  }

  if (isLoading) {
    return (
      <div className={`bg-black/20 rounded-lg border border-white/10 p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-white/10 rounded w-48 mb-2"></div>
          <div className="h-8 bg-white/10 rounded w-full"></div>
        </div>
      </div>
    )
  }

  if (graduationEvent) {
    return (
      <div className={`bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg border border-green-400/30 p-4 ${className}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            🎉
          </div>
          <div>
            <h3 className="text-lg font-bold text-green-400">Graduated to DEX!</h3>
            <p className="text-sm text-gray-300">
              Successfully migrated to {graduationEvent.postGraduation.dexPlatform}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Pool Address:</p>
            <p className="text-white font-mono text-xs">
              {graduationEvent.postGraduation.poolAddress}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Initial Liquidity:</p>
            <p className="text-white font-semibold">
              {formatCurrency(graduationEvent.postGraduation.initialLiquidityUSD)}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Opening Price:</p>
            <p className="text-white font-semibold">
              ${graduationEvent.postGraduation.openingPriceUSD.toFixed(6)}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Graduated:</p>
            <p className="text-white">
              {new Date(graduationEvent.graduatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!graduationStatus) {
    return null
  }

  return (
    <div className={`bg-black/20 rounded-lg border border-white/10 p-4 ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">DEX Graduation Progress</h3>
          <p className="text-sm text-gray-400">
            Progress towards liquidity pool graduation
          </p>
        </div>
        
        {graduationStatus.isEligible && (
          <button
            onClick={handleGraduate}
            disabled={isGraduating}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white rounded-lg font-medium transition-all"
          >
            {isGraduating ? 'Graduating...' : '🚀 Graduate Now'}
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Overall Progress</span>
          <span className="text-white font-semibold">
            {graduationStatus.progressPercent.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${
              graduationStatus.progressPercent >= 100 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                : 'bg-gradient-to-r from-purple-500 to-pink-500'
            }`}
            style={{ width: `${Math.min(graduationStatus.progressPercent, 100)}%` }}
          />
        </div>
        {graduationStatus.estimatedGraduationTime && (
          <p className="text-xs text-gray-500 mt-1">
            Estimated graduation: {formatTime(graduationStatus.estimatedGraduationTime)}
          </p>
        )}
      </div>

      {/* Graduation Criteria */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        {/* Market Cap */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Market Cap</span>
          <div className="flex items-center gap-2">
            <span className="text-white">
              {formatCurrency(graduationStatus.currentMarketCapUSD)} / $69K
            </span>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
              graduationStatus.meetsMarketCap ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-300'
            }`}>
              {graduationStatus.meetsMarketCap ? '✓' : '○'}
            </span>
          </div>
        </div>

        {/* Liquidity */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Liquidity</span>
          <div className="flex items-center gap-2">
            <span className="text-white">
              {formatCurrency(graduationStatus.currentLiquidityUSD)} / $8K
            </span>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
              graduationStatus.meetsLiquidity ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-300'
            }`}>
              {graduationStatus.meetsLiquidity ? '✓' : '○'}
            </span>
          </div>
        </div>

        {/* Holders */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Holders</span>
          <div className="flex items-center gap-2">
            <span className="text-white">
              {graduationStatus.currentHolders} / 20
            </span>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
              graduationStatus.meetsHolders ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-300'
            }`}>
              {graduationStatus.meetsHolders ? '✓' : '○'}
            </span>
          </div>
        </div>

        {/* Volume */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400">24h Volume</span>
          <div className="flex items-center gap-2">
            <span className="text-white">
              {formatCurrency(graduationStatus.current24hVolumeUSD)} / $1K
            </span>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
              graduationStatus.meetsVolume ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-300'
            }`}>
              {graduationStatus.meetsVolume ? '✓' : '○'}
            </span>
          </div>
        </div>
      </div>

      {/* Status Message */}
      <div className="mt-4 p-3 rounded-lg bg-white/5">
        {graduationStatus.isEligible ? (
          <div className="flex items-center gap-2 text-green-400">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="font-medium">Ready for graduation!</span>
          </div>
        ) : graduationStatus.progressPercent > 80 ? (
          <div className="flex items-center gap-2 text-yellow-400">
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
            <span className="font-medium">Almost ready for graduation</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-400">
            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
            <span>Continue building momentum</span>
          </div>
        )}
      </div>
    </div>
  )
}
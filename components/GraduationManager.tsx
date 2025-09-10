import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useSmartContractIntegration } from '../lib/smartContractIntegration'
import { useDEXIntegration, PoolInfo, GraduationResult } from '../lib/dexIntegration'
import { getGraduationService, GraduationAlert, GraduationEvent } from '../lib/graduationService'
import { useConnection } from '@solana/wallet-adapter-react'
import { formatNumber, formatCurrency } from '../lib/utils'

interface GraduationManagerProps {
  campaign: any
  onGraduationComplete?: (result: GraduationResult) => void
}

export default function GraduationManager({ campaign, onGraduationComplete }: GraduationManagerProps) {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const smartContract = useSmartContractIntegration()
  const dexIntegration = useDEXIntegration()
  
  const [isReady, setIsReady] = useState(false)
  const [isGraduating, setIsGraduating] = useState(false)
  const [existingPools, setExistingPools] = useState<PoolInfo[]>([])
  const [selectedDEX, setSelectedDEX] = useState<'raydium' | 'orca'>('raydium')
  const [graduationCosts, setGraduationCosts] = useState({
    poolCreation: 0,
    initialLiquidity: 0,
    totalSOL: 0
  })
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [graduationResult, setGraduationResult] = useState<GraduationResult | null>(null)
  const [graduationAlerts, setGraduationAlerts] = useState<GraduationAlert[]>([])
  const [autoGraduationEnabled, setAutoGraduationEnabled] = useState(true)

  // Check graduation eligibility and set up monitoring
  useEffect(() => {
    const checkGraduationStatus = async () => {
      if (!campaign?.publicKey || !campaign?.tokenMint) return

      try {
        // Check if market cap threshold is met
        const isEligible = await dexIntegration.isReadyForGraduation(
          campaign.tokenMint, 
          campaign.marketCap || 0
        )
        setIsReady(isEligible)

        // Get existing pools
        const pools = await dexIntegration.findTokenPools(campaign.tokenMint)
        setExistingPools(pools)

        // Get recommended DEX
        const bestDEX = await dexIntegration.getBestDEXForGraduation(campaign.tokenMint)
        setSelectedDEX(bestDEX)

        // Get graduation costs
        const costs = await dexIntegration.estimateGraduationCosts()
        setGraduationCosts(costs)

        // Set up graduation service monitoring
        if (connection && publicKey) {
          const graduationService = getGraduationService(connection, { publicKey })
          
          // Start monitoring this campaign
          graduationService.startMonitoring(
            campaign.publicKey, 
            campaign.tokenMint, 
            campaign.tokenSymbol || campaign.name
          )

          // Subscribe to graduation events
          const unsubscribeGraduation = graduationService.onGraduation(campaign.publicKey, (event) => {
            setGraduationResult({
              success: true,
              poolAddress: event.poolAddress,
              lpTokens: event.lpTokens,
              initialTVL: event.initialTVL,
              signature: event.graduationTx
            })
            onGraduationComplete?.({
              success: true,
              poolAddress: event.poolAddress,
              lpTokens: event.lpTokens,
              initialTVL: event.initialTVL,
              signature: event.graduationTx
            })
          })

          // Subscribe to graduation alerts
          const unsubscribeAlerts = graduationService.onAlert(campaign.publicKey, (alert) => {
            setGraduationAlerts(prev => {
              const newAlerts = [alert, ...prev.slice(0, 4)] // Keep last 5 alerts
              return newAlerts
            })
          })

          return () => {
            unsubscribeGraduation()
            unsubscribeAlerts()
          }
        }
      } catch (error) {
        console.error('Error checking graduation status:', error)
      }
    }

    checkGraduationStatus()
  }, [campaign, dexIntegration, connection, publicKey, onGraduationComplete])

  const handleGraduation = async () => {
    if (!publicKey || !campaign?.tokenMint) return

    setIsGraduating(true)
    try {
      // Calculate liquidity amounts
      const solLiquidity = campaign.raisedAmount * 0.8 // 80% of raised SOL
      const tokenLiquidity = 200_000_000 // 200M tokens for liquidity

      console.log(`Graduating to ${selectedDEX}...`)
      console.log(`SOL Liquidity: ${solLiquidity}`)
      console.log(`Token Liquidity: ${tokenLiquidity}`)

      const result = await dexIntegration.graduateToPool(
        campaign.tokenMint,
        tokenLiquidity,
        solLiquidity,
        selectedDEX
      )

      setGraduationResult(result)
      
      if (result.success) {
        // Notify parent component
        onGraduationComplete?.(result)
        
        // Show success message
        alert(`🎉 Successfully graduated to ${selectedDEX.toUpperCase()}!\n\nPool Address: ${result.poolAddress}\nLP Tokens: ${formatNumber(result.lpTokens || 0)}\nInitial TVL: $${formatNumber(result.initialTVL || 0)}\n\nTransaction: ${result.signature}`)
      } else {
        alert(`❌ Graduation failed: ${result.error}`)
      }
    } catch (error: any) {
      console.error('Graduation error:', error)
      alert(`❌ Graduation failed: ${error.message}`)
    } finally {
      setIsGraduating(false)
      setShowConfirmation(false)
    }
  }

  const getGraduationProgress = () => {
    const threshold = 69000 // $69k
    const current = campaign.marketCap || 0
    return Math.min((current / threshold) * 100, 100)
  }

  const getRemainingAmount = () => {
    const threshold = 69000
    const current = campaign.marketCap || 0
    return Math.max(threshold - current, 0)
  }

  if (!campaign) return null

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white">DEX Graduation</h3>
        <div className="flex items-center gap-3">
          {autoGraduationEnabled && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-blue-400">AUTO</span>
            </div>
          )}
          {isReady && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-400">READY</span>
            </div>
          )}
        </div>
      </div>

      {/* Graduation Alerts */}
      {graduationAlerts.length > 0 && (
        <div className="mb-4 space-y-2">
          {graduationAlerts.slice(0, 2).map((alert, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border text-sm ${
                alert.type === 'completed' ? 'bg-green-900/20 border-green-500/30 text-green-300' :
                alert.type === 'ready' ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300' :
                'bg-blue-900/20 border-blue-500/30 text-blue-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{alert.message}</span>
                {alert.type !== 'completed' && (
                  <span className="text-xs opacity-75">
                    ({alert.progressPercent.toFixed(1)}%)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Graduation Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Progress to DEX</span>
          <span className={`${isReady ? 'text-green-400' : 'text-yellow-400'}`}>
            {getGraduationProgress().toFixed(1)}%
          </span>
        </div>
        
        <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${
              isReady 
                ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                : 'bg-gradient-to-r from-yellow-400 to-orange-500'
            }`}
            style={{ width: `${Math.min(getGraduationProgress(), 100)}%` }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-400">
          <span>${formatNumber(campaign.marketCap || 0)}</span>
          <span>${formatNumber(69000)}</span>
        </div>
        
        {!isReady && (
          <div className="text-center mt-2">
            <span className="text-sm text-yellow-400">
              ${formatNumber(getRemainingAmount())} remaining for graduation
            </span>
          </div>
        )}
      </div>

      {/* Existing Pools */}
      {existingPools.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-white mb-3">Existing Pools</h4>
          <div className="space-y-2">
            {existingPools.map((pool, index) => (
              <div key={index} className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {pool.dex.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-400">
                        {campaign.tokenSymbol}/SOL
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      TVL: ${formatNumber(pool.tvl)} • Vol: ${formatNumber(pool.volume24h)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-green-400">{pool.apr.toFixed(1)}% APR</div>
                    <a
                      href={`https://dexscreener.com/solana/${pool.poolAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      View Pool ↗
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Graduation Options */}
      {isReady && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Choose DEX for Graduation</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedDEX('raydium')}
                className={`p-4 rounded-lg border transition-all ${
                  selectedDEX === 'raydium'
                    ? 'bg-blue-500/20 border-blue-400/50 text-blue-300'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                }`}
              >
                <div className="text-center">
                  <div className="text-lg mb-1">🌊</div>
                  <div className="font-semibold">Raydium</div>
                  <div className="text-xs mt-1">Higher TVL</div>
                  <div className="text-xs">Better for large tokens</div>
                </div>
              </button>

              <button
                onClick={() => setSelectedDEX('orca')}
                className={`p-4 rounded-lg border transition-all ${
                  selectedDEX === 'orca'
                    ? 'bg-purple-500/20 border-purple-400/50 text-purple-300'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                }`}
              >
                <div className="text-center">
                  <div className="text-lg mb-1">🐋</div>
                  <div className="font-semibold">Orca</div>
                  <div className="text-xs mt-1">Lower fees</div>
                  <div className="text-xs">Better UI/UX</div>
                </div>
              </button>
            </div>
          </div>

          {/* Graduation Details */}
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-3">Graduation Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Initial SOL Liquidity:</span>
                <span className="text-white">{formatNumber((campaign.raisedAmount || 0) * 0.8)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Initial Token Liquidity:</span>
                <span className="text-white">200M {campaign.tokenSymbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Est. Initial Price:</span>
                <span className="text-white">${((campaign.raisedAmount || 0) * 0.8 * 150 / 200_000_000).toFixed(8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Pool Creation Cost:</span>
                <span className="text-white">{graduationCosts.totalSOL.toFixed(3)} SOL</span>
              </div>
            </div>
          </div>

          {/* Graduation Button */}
          <button
            onClick={() => setShowConfirmation(true)}
            disabled={isGraduating || !publicKey}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGraduating ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Graduating to {selectedDEX.toUpperCase()}...
              </div>
            ) : (
              `🎓 Graduate to ${selectedDEX.toUpperCase()}`
            )}
          </button>

          {!publicKey && (
            <div className="text-center text-sm text-gray-400">
              Connect wallet to graduate token
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Graduation</h3>
            
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-gray-400">DEX:</span>
                <span className="text-white font-semibold">{selectedDEX.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">SOL Liquidity:</span>
                <span className="text-white">{formatNumber((campaign.raisedAmount || 0) * 0.8)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Token Liquidity:</span>
                <span className="text-white">200M {campaign.tokenSymbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Cost:</span>
                <span className="text-white">{graduationCosts.totalSOL.toFixed(3)} SOL</span>
              </div>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 mb-6">
              <div className="text-yellow-400 text-sm">
                ⚠️ <strong>Important:</strong> Graduation is irreversible. The bonding curve will be disabled and all trading will move to the DEX pool.
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGraduation}
                disabled={isGraduating}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isGraduating ? 'Graduating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Result */}
      {graduationResult?.success && (
        <div className="mt-4 bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <div className="text-green-400 text-sm">
            🎉 <strong>Graduation Successful!</strong>
            <div className="mt-2 space-y-1">
              <div>Pool: <span className="font-mono">{graduationResult.poolAddress}</span></div>
              <div>LP Tokens: {formatNumber(graduationResult.lpTokens || 0)}</div>
              <div>Initial TVL: ${formatNumber(graduationResult.initialTVL || 0)}</div>
            </div>
          </div>
        </div>
      )}

      {!isReady && existingPools.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🎯</div>
          <h4 className="text-lg font-semibold text-white mb-2">Not Ready for Graduation</h4>
          <p className="text-gray-400 text-sm mb-4">
            Reach $69,000 market cap to graduate to DEX pools
          </p>
          <div className="text-sm text-gray-500">
            Current progress: {getGraduationProgress().toFixed(1)}%
          </div>
        </div>
      )}
    </div>
  )
}
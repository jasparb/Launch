import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useDEXIntegration, PoolInfo, SwapQuote, LiquidityPosition } from '../lib/dexIntegration'
import { formatNumber, formatCurrency, formatAddress } from '../lib/utils'

interface DEXPoolViewerProps {
  tokenMint?: string
  showUserPositions?: boolean
}

export default function DEXPoolViewer({ tokenMint, showUserPositions = true }: DEXPoolViewerProps) {
  const { publicKey } = useWallet()
  const dexIntegration = useDEXIntegration()
  
  const [pools, setPools] = useState<PoolInfo[]>([])
  const [userPositions, setUserPositions] = useState<LiquidityPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pools' | 'positions' | 'swap'>('pools')
  const [swapQuotes, setSwapQuotes] = useState<SwapQuote[]>([])
  const [swapAmount, setSwapAmount] = useState('')
  const [selectedPool, setSelectedPool] = useState<PoolInfo | null>(null)

  useEffect(() => {
    const loadPoolData = async () => {
      setLoading(true)
      try {
        // Load pools for specific token or popular pools
        if (tokenMint) {
          const tokenPools = await dexIntegration.findTokenPools(tokenMint)
          setPools(tokenPools)
        } else {
          // Load popular/trending pools (mock data)
          setPools([])
        }

        // Load user positions if wallet connected
        if (publicKey && showUserPositions) {
          const positions = await dexIntegration.getUserLiquidityPositions()
          setUserPositions(positions)
        }
      } catch (error) {
        console.error('Error loading pool data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPoolData()
  }, [tokenMint, publicKey, dexIntegration, showUserPositions])

  const handleSwapQuote = async () => {
    if (!swapAmount || !selectedPool) return

    try {
      const amount = parseFloat(swapAmount)
      const quotes = await dexIntegration.getSwapQuote(
        selectedPool.tokenA,
        selectedPool.tokenB,
        amount
      )
      setSwapQuotes(quotes)
    } catch (error) {
      console.error('Error getting swap quotes:', error)
    }
  }

  const executeSwap = async (quote: SwapQuote) => {
    try {
      const result = await dexIntegration.executeSwap(quote)
      if (result.success) {
        alert(`✅ Swap successful!\nTransaction: ${result.signature}`)
        setSwapAmount('')
        setSwapQuotes([])
      } else {
        alert(`❌ Swap failed: ${result.error}`)
      }
    } catch (error: any) {
      alert(`❌ Swap error: ${error.message}`)
    }
  }

  const getDEXIcon = (dex: string) => {
    switch (dex) {
      case 'raydium': return '🌊'
      case 'orca': return '🐋'
      default: return '💱'
    }
  }

  const getAPRColor = (apr: number) => {
    if (apr >= 100) return 'text-green-400'
    if (apr >= 50) return 'text-yellow-400'
    if (apr >= 20) return 'text-blue-400'
    return 'text-gray-400'
  }

  const getTVLTier = (tvl: number) => {
    if (tvl >= 1000000) return { label: 'Tier 1', color: 'text-green-400' }
    if (tvl >= 100000) return { label: 'Tier 2', color: 'text-yellow-400' }
    if (tvl >= 10000) return { label: 'Tier 3', color: 'text-blue-400' }
    return { label: 'Emerging', color: 'text-gray-400' }
  }

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">
          {tokenMint ? 'Token Pools' : 'DEX Pools'}
        </h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-blue-400">LIVE</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex mb-6 bg-white/5 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('pools')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            activeTab === 'pools'
              ? 'bg-purple-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          💱 Pools ({pools.length})
        </button>
        {showUserPositions && (
          <button
            onClick={() => setActiveTab('positions')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'positions'
                ? 'bg-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            💼 My Positions ({userPositions.length})
          </button>
        )}
        <button
          onClick={() => setActiveTab('swap')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            activeTab === 'swap'
              ? 'bg-purple-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🔄 Swap
        </button>
      </div>

      {/* Pools Tab */}
      {activeTab === 'pools' && (
        <div className="space-y-4">
          {pools.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🏊‍♂️</div>
              <h4 className="text-lg font-semibold text-white mb-2">No Pools Found</h4>
              <p className="text-gray-400 text-sm">
                {tokenMint 
                  ? 'This token has not graduated to DEX pools yet'
                  : 'Connect a wallet to view available pools'
                }
              </p>
            </div>
          ) : (
            pools.map((pool, index) => (
              <div
                key={index}
                className={`bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-all cursor-pointer ${
                  selectedPool?.poolAddress === pool.poolAddress ? 'ring-2 ring-purple-400' : ''
                }`}
                onClick={() => setSelectedPool(pool)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{getDEXIcon(pool.dex)}</div>
                    <div>
                      <div className="font-semibold text-white">
                        {pool.dex.toUpperCase()} Pool
                      </div>
                      <div className="text-sm text-gray-400">
                        Token/SOL Pair
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${getTVLTier(pool.tvl).color}`}>
                      {getTVLTier(pool.tvl).label}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(pool.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">TVL</div>
                    <div className="font-semibold text-white">
                      ${formatNumber(pool.tvl)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">24h Volume</div>
                    <div className="font-semibold text-white">
                      ${formatNumber(pool.volume24h)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">APR</div>
                    <div className={`font-semibold ${getAPRColor(pool.apr)}`}>
                      {pool.apr.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Price</div>
                    <div className="font-semibold text-white">
                      ${pool.price.toFixed(8)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    Pool: {formatAddress(pool.poolAddress)}
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`https://dexscreener.com/solana/${pool.poolAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Charts ↗
                    </a>
                    <a
                      href={pool.dex === 'raydium' 
                        ? `https://raydium.io/liquidity/add/?ammId=${pool.poolAddress}`
                        : `https://www.orca.so/pools/${pool.poolAddress}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-400 hover:text-green-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Add Liquidity ↗
                    </a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* User Positions Tab */}
      {activeTab === 'positions' && showUserPositions && (
        <div className="space-y-4">
          {!publicKey ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🔒</div>
              <h4 className="text-lg font-semibold text-white mb-2">Wallet Not Connected</h4>
              <p className="text-gray-400 text-sm">
                Connect your wallet to view liquidity positions
              </p>
            </div>
          ) : userPositions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">💼</div>
              <h4 className="text-lg font-semibold text-white mb-2">No Positions</h4>
              <p className="text-gray-400 text-sm">
                You don't have any liquidity positions yet
              </p>
            </div>
          ) : (
            userPositions.map((position, index) => (
              <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-semibold text-white">LP Position</div>
                    <div className="text-sm text-gray-400">
                      {formatAddress(position.poolAddress)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white">
                      ${formatNumber(position.valueUSD)}
                    </div>
                    <div className="text-sm text-gray-400">
                      {position.sharePercent.toFixed(3)}% share
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">LP Tokens</div>
                    <div className="text-white">{formatNumber(position.lpTokens)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">24h Fees</div>
                    <div className="text-green-400">+${position.fees24h.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Token A</div>
                    <div className="text-white">{formatNumber(position.tokenAAmount)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Token B</div>
                    <div className="text-white">{formatNumber(position.tokenBAmount)}</div>
                  </div>
                </div>

                {position.impermanentLoss !== 0 && (
                  <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded">
                    <div className="text-xs text-yellow-400">
                      Impermanent Loss: {position.impermanentLoss > 0 ? '+' : ''}{position.impermanentLoss.toFixed(2)}%
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Swap Tab */}
      {activeTab === 'swap' && (
        <div className="space-y-6">
          {!selectedPool ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">👆</div>
              <h4 className="text-lg font-semibold text-white mb-2">Select a Pool</h4>
              <p className="text-gray-400 text-sm">
                Choose a pool from the Pools tab to get swap quotes
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h4 className="font-semibold text-white mb-2">
                  Swap on {selectedPool.dex.toUpperCase()}
                </h4>
                <div className="text-sm text-gray-400">
                  Pool: {formatAddress(selectedPool.poolAddress)}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Amount to Swap
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={swapAmount}
                      onChange={(e) => setSwapAmount(e.target.value)}
                      placeholder="0.0"
                      className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                    />
                    <button
                      onClick={handleSwapQuote}
                      disabled={!swapAmount}
                      className="px-6 py-3 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Get Quote
                    </button>
                  </div>
                </div>

                {swapQuotes.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="font-semibold text-white">Swap Quotes</h5>
                    {swapQuotes.map((quote, index) => (
                      <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <div className="text-lg">{getDEXIcon(quote.dex)}</div>
                            <div>
                              <div className="font-medium text-white">
                                {quote.dex.toUpperCase()}
                              </div>
                              <div className="text-xs text-gray-400">
                                Best available rate
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => executeSwap(quote)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors"
                          >
                            Execute Swap
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-400">You Pay</div>
                            <div className="font-medium text-white">
                              {formatNumber(quote.inputAmount)} SOL
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-400">You Receive</div>
                            <div className="font-medium text-green-400">
                              {formatNumber(quote.outputAmount)} Tokens
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-400">Price Impact</div>
                            <div className={`font-medium ${
                              quote.priceImpact > 2 ? 'text-red-400' : 
                              quote.priceImpact > 0.5 ? 'text-yellow-400' : 'text-green-400'
                            }`}>
                              {quote.priceImpact.toFixed(2)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-400">Fees</div>
                            <div className="font-medium text-white">
                              {formatNumber(quote.fees)} SOL
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
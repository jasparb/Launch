import { useState, useEffect } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { getPriceDataService, MarketDepth as MarketDepthData } from '../lib/priceDataService'
import { formatNumber } from '../lib/utils'

interface MarketDepthProps {
  campaignAddress: string
  maxLevels?: number
}

export default function MarketDepth({ campaignAddress, maxLevels = 10 }: MarketDepthProps) {
  const { connection } = useConnection()
  const [depthData, setDepthData] = useState<MarketDepthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)

  useEffect(() => {
    if (!connection || !campaignAddress) return

    const loadMarketDepth = async () => {
      setLoading(true)
      try {
        const priceService = getPriceDataService(connection)
        const depth = await priceService.generateMarketDepth(campaignAddress)
        setDepthData(depth)
      } catch (error) {
        console.error('Error loading market depth:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMarketDepth()

    // Refresh every 60 seconds (reduced from 10s to prevent rate limiting)
    const interval = setInterval(loadMarketDepth, 60000)
    return () => clearInterval(interval)
  }, [connection, campaignAddress])

  const getBarWidth = (size: number, maxSize: number) => {
    return Math.max(2, (size / maxSize) * 100)
  }

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <h3 className="text-lg font-bold text-white mb-4">Market Depth</h3>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
        </div>
      </div>
    )
  }

  if (!depthData || (depthData.bids.length === 0 && depthData.asks.length === 0)) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <h3 className="text-lg font-bold text-white mb-4">Market Depth</h3>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📊</div>
          <h4 className="text-lg font-semibold text-white mb-2">No Market Data</h4>
          <p className="text-gray-400 text-sm">
            Market depth will appear after trading begins
          </p>
        </div>
      </div>
    )
  }

  const maxBidSize = Math.max(...depthData.bids.map(b => b.size), 1)
  const maxAskSize = Math.max(...depthData.asks.map(a => a.size), 1)
  const maxSize = Math.max(maxBidSize, maxAskSize)

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white">Market Depth</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-green-400">LIVE</span>
        </div>
      </div>

      {/* Market summary */}
      <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
        <div className="text-center">
          <div className="text-gray-400">Spread</div>
          <div className="text-white font-bold">
            ${depthData.spread.toFixed(8)}
          </div>
          <div className="text-xs text-gray-500">
            {((depthData.spread / depthData.midPrice) * 100).toFixed(3)}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">Mid Price</div>
          <div className="text-white font-bold">
            ${depthData.midPrice.toFixed(8)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">Last Update</div>
          <div className="text-white font-bold">
            {new Date(depthData.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Bids (Buy Orders) */}
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-2 px-2">
            <span>Price (SOL)</span>
            <span>Size</span>
            <span>Total</span>
          </div>
          
          <div className="space-y-1">
            {depthData.bids.slice(0, maxLevels).map((bid, index) => (
              <div
                key={index}
                className={`relative flex justify-between items-center p-2 rounded text-xs font-mono cursor-pointer transition-all ${
                  selectedLevel === index ? 'bg-green-500/20 border border-green-500/30' : 'hover:bg-green-500/10'
                }`}
                onClick={() => setSelectedLevel(selectedLevel === index ? null : index)}
              >
                {/* Background bar for size visualization */}
                <div
                  className="absolute left-0 top-0 h-full bg-green-500/20 rounded"
                  style={{ width: `${getBarWidth(bid.size, maxSize)}%` }}
                />
                
                <div className="relative z-10 flex justify-between w-full">
                  <span className="text-green-400 font-semibold">
                    ${bid.price.toFixed(8)}
                  </span>
                  <span className="text-white">
                    {formatNumber(bid.size, 3)}
                  </span>
                  <span className="text-gray-300">
                    {formatNumber(bid.total, 3)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 text-center">
            <div className="text-xs text-green-400 font-semibold">BIDS</div>
            <div className="text-xs text-gray-500">
              {formatNumber(depthData.bids.reduce((sum, bid) => sum + bid.size, 0), 2)} SOL total
            </div>
          </div>
        </div>

        {/* Asks (Sell Orders) */}
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-2 px-2">
            <span>Price (SOL)</span>
            <span>Size</span>
            <span>Total</span>
          </div>
          
          <div className="space-y-1">
            {depthData.asks.slice(0, maxLevels).map((ask, index) => (
              <div
                key={index}
                className={`relative flex justify-between items-center p-2 rounded text-xs font-mono cursor-pointer transition-all ${
                  selectedLevel === index + 1000 ? 'bg-red-500/20 border border-red-500/30' : 'hover:bg-red-500/10'
                }`}
                onClick={() => setSelectedLevel(selectedLevel === index + 1000 ? null : index + 1000)}
              >
                {/* Background bar for size visualization */}
                <div
                  className="absolute right-0 top-0 h-full bg-red-500/20 rounded"
                  style={{ width: `${getBarWidth(ask.size, maxSize)}%` }}
                />
                
                <div className="relative z-10 flex justify-between w-full">
                  <span className="text-red-400 font-semibold">
                    ${ask.price.toFixed(8)}
                  </span>
                  <span className="text-white">
                    {formatNumber(ask.size, 3)}
                  </span>
                  <span className="text-gray-300">
                    {formatNumber(ask.total, 3)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 text-center">
            <div className="text-xs text-red-400 font-semibold">ASKS</div>
            <div className="text-xs text-gray-500">
              {formatNumber(depthData.asks.reduce((sum, ask) => sum + ask.size, 0), 2)} SOL total
            </div>
          </div>
        </div>
      </div>

      {/* Market depth visualization */}
      <div className="mt-6">
        <h4 className="text-sm font-semibold text-white mb-3">Depth Visualization</h4>
        <div className="relative h-24 bg-black/20 rounded-lg overflow-hidden">
          {/* Cumulative bid depth */}
          <div className="absolute bottom-0 left-0 h-full w-1/2 flex items-end">
            {depthData.bids.slice(0, 10).map((bid, index) => (
              <div
                key={index}
                className="bg-green-500/60 border-r border-green-500/80"
                style={{
                  width: '10%',
                  height: `${(bid.total / Math.max(...depthData.bids.map(b => b.total))) * 100}%`
                }}
                title={`${bid.price.toFixed(8)} SOL - ${formatNumber(bid.total)} total`}
              />
            ))}
          </div>

          {/* Cumulative ask depth */}
          <div className="absolute bottom-0 right-0 h-full w-1/2 flex items-end">
            {depthData.asks.slice(0, 10).map((ask, index) => (
              <div
                key={index}
                className="bg-red-500/60 border-l border-red-500/80"
                style={{
                  width: '10%',
                  height: `${(ask.total / Math.max(...depthData.asks.map(a => a.total))) * 100}%`
                }}
                title={`${ask.price.toFixed(8)} SOL - ${formatNumber(ask.total)} total`}
              />
            ))}
          </div>

          {/* Mid line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/50" />
          
          {/* Price labels */}
          <div className="absolute bottom-1 left-1 text-xs text-green-400">
            ${depthData.bids[0]?.price.toFixed(6)}
          </div>
          <div className="absolute bottom-1 right-1 text-xs text-red-400">
            ${depthData.asks[0]?.price.toFixed(6)}
          </div>
        </div>
      </div>

      {/* Additional market info */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-gray-400 mb-1">Best Bid</div>
          <div className="text-green-400 font-bold">
            ${depthData.bids[0]?.price.toFixed(8) || 'N/A'}
          </div>
          <div className="text-gray-300">
            {formatNumber(depthData.bids[0]?.size || 0)} SOL
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-gray-400 mb-1">Best Ask</div>
          <div className="text-red-400 font-bold">
            ${depthData.asks[0]?.price.toFixed(8) || 'N/A'}
          </div>
          <div className="text-gray-300">
            {formatNumber(depthData.asks[0]?.size || 0)} SOL
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        Market depth simulated based on bonding curve and recent trading activity
      </div>
    </div>
  )
}
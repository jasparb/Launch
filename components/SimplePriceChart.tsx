import { useState, useEffect } from 'react'
import { getSolPriceInUSD } from '../lib/solPriceService'

interface SimplePriceChartProps {
  campaign: any
}

export default function SimplePriceChart({ campaign }: SimplePriceChartProps) {
  const [currentPrice, setCurrentPrice] = useState<number>(0.0001)
  const [priceChange, setPriceChange] = useState<number>(5.2)
  const [solPriceUsd, setSolPriceUsd] = useState<number>(150)
  const [priceHistory, setPriceHistory] = useState<number[]>([])
  const [timeRange, setTimeRange] = useState('24h')

  useEffect(() => {
    // Fetch SOL price
    getSolPriceInUSD().then(setSolPriceUsd).catch(console.error)
    
    // Generate mock price history
    const history = []
    const basePrice = campaign?.tokenPrice || 0.0001
    for (let i = 0; i < 100; i++) {
      const variation = (Math.random() - 0.5) * 0.2
      history.push(basePrice * (1 + variation))
    }
    setPriceHistory(history)
    setCurrentPrice(history[history.length - 1] || basePrice)
    
    // Calculate price change
    const change = ((history[history.length - 1] - history[0]) / history[0]) * 100
    setPriceChange(change)
  }, [campaign])

  const formatPrice = (priceInSol: number) => {
    const priceInUsd = priceInSol * solPriceUsd
    if (priceInUsd >= 1) return `$${priceInUsd.toFixed(4)}`
    if (priceInUsd >= 0.0001) return `$${priceInUsd.toFixed(6)}`
    return `$${priceInUsd.toFixed(8)}`
  }

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(2)}%`
  }

  return (
    <div className="h-80">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-2xl font-bold text-white">
              {formatPrice(currentPrice)}
            </div>
            <div className={`text-sm ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatChange(priceChange)} (24h)
            </div>
          </div>
          
          {campaign?.tokenSymbol && (
            <div className="flex items-center gap-2">
              {campaign.tokenIcon && (
                <img 
                  src={campaign.tokenIcon}
                  alt={campaign.tokenSymbol}
                  className="w-8 h-8 rounded-full border border-white/20"
                />
              )}
              <div>
                <div className="text-sm font-medium text-white">{campaign.tokenSymbol}</div>
                <div className="text-xs text-gray-400">{campaign.tokenName || campaign.name}</div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          {['1h', '4h', '24h', '7d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-lg text-sm transition-all ${
                timeRange === range
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      
      <div className="w-full rounded-lg bg-black/20 border border-white/10 p-6" style={{ height: '300px' }}>
        <div className="h-full flex flex-col">
          <div className="flex-1 flex items-end space-x-1">
            {priceHistory.slice(-60).map((price, index) => {
              const prevPrice = index > 0 ? priceHistory[priceHistory.length - 60 + index - 1] : price
              const isUp = price >= prevPrice
              const maxPrice = Math.max(...priceHistory.slice(-60))
              const minPrice = Math.min(...priceHistory.slice(-60))
              const height = ((price - minPrice) / (maxPrice - minPrice)) * 100
              
              return (
                <div
                  key={index}
                  className={`flex-1 rounded-t transition-all hover:opacity-80 ${
                    isUp ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ 
                    height: `${height}%`, 
                    minHeight: '2px',
                    opacity: 0.8 + (index / 60) * 0.2 
                  }}
                  title={formatPrice(price)}
                />
              )
            })}
          </div>
          
          <div className="mt-4 flex justify-between text-xs text-gray-400">
            <span>1 hour ago</span>
            <span>30 min ago</span>
            <span>Now</span>
          </div>
        </div>
        
        <div className="mt-2 text-center text-xs text-gray-500">
          Simple price visualization
        </div>
      </div>
    </div>
  )
}
import { useState, useEffect, useRef } from 'react'
import { getSolPriceInUSD } from '../lib/solPriceService'

interface WorkingPriceChartProps {
  campaign: any
}

export default function WorkingPriceChart({ campaign }: WorkingPriceChartProps) {
  const [currentPrice, setCurrentPrice] = useState<number>(0.0000028)
  const [priceChange, setPriceChange] = useState<number>(127.5)
  const [solPriceUsd, setSolPriceUsd] = useState<number>(150)
  const [marketCap, setMarketCap] = useState<number>(2800)
  const [timeRange, setTimeRange] = useState('24h')
  const [priceData, setPriceData] = useState<any[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // Fetch SOL price
    getSolPriceInUSD().then(setSolPriceUsd).catch(() => {})
    
    // Generate pump.fun style price data
    generatePumpFunData()
  }, [campaign, timeRange])

  const generatePumpFunData = () => {
    const data = []
    const periods = timeRange === '1h' ? 60 : timeRange === '4h' ? 240 : timeRange === '24h' ? 1440 : 10080
    const interval = periods / 60
    
    // Start with very low price (pump.fun style)
    let price = 0.0000001
    const targetPrice = campaign?.tokenPrice || 0.0000028
    
    for (let i = 0; i < 60; i++) {
      // Simulate pump.fun style price action
      const buyPressure = Math.random() > 0.3 ? 1.02 : 0.99
      const momentum = i < 30 ? 1.03 : 1.01 // Strong initial pump
      price = price * buyPressure * momentum
      
      // Add volatility
      const volatility = (Math.random() - 0.5) * 0.1
      price = price * (1 + volatility)
      
      // Gradually approach target
      if (i > 40) {
        price = price * 0.9 + targetPrice * 0.1
      }
      
      data.push({
        time: Date.now() - (60 - i) * interval * 60000,
        price: price,
        volume: Math.random() * 10000 + 1000,
        isGreen: Math.random() > 0.4
      })
    }
    
    setPriceData(data)
    setCurrentPrice(data[data.length - 1].price)
    
    // Calculate change
    const firstPrice = data[0].price
    const lastPrice = data[data.length - 1].price
    const change = ((lastPrice - firstPrice) / firstPrice) * 100
    setPriceChange(change)
    
    // Calculate market cap (pump.fun style)
    setMarketCap(lastPrice * 1000000000 * solPriceUsd)
  }

  useEffect(() => {
    if (!canvasRef.current || priceData.length === 0) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Set canvas size
    canvas.width = canvas.offsetWidth * 2
    canvas.height = canvas.offsetHeight * 2
    ctx.scale(2, 2)
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
    ctx.lineWidth = 1
    for (let i = 0; i < 5; i++) {
      const y = (canvas.height / 2 / 5) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width / 2, y)
      ctx.stroke()
    }
    
    // Find min/max for scaling
    const prices = priceData.map(d => d.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice || 0.0000001
    
    // Draw price line
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 2
    ctx.beginPath()
    
    priceData.forEach((point, i) => {
      const x = (i / (priceData.length - 1)) * (canvas.width / 2)
      const y = canvas.height / 2 - ((point.price - minPrice) / priceRange) * (canvas.height / 2 - 40) - 20
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    
    ctx.stroke()
    
    // Draw volume bars
    priceData.forEach((point, i) => {
      const x = (i / (priceData.length - 1)) * (canvas.width / 2)
      const barWidth = (canvas.width / 2) / priceData.length * 0.8
      const barHeight = (point.volume / 10000) * 30
      
      ctx.fillStyle = point.isGreen ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
      ctx.fillRect(x - barWidth / 2, canvas.height / 2 - barHeight, barWidth, barHeight)
    })
    
  }, [priceData])

  const formatPrice = (price: number) => {
    const priceInUsd = price * solPriceUsd
    if (priceInUsd >= 0.01) return `$${priceInUsd.toFixed(4)}`
    if (priceInUsd >= 0.0001) return `$${priceInUsd.toFixed(6)}`
    return `$${priceInUsd.toFixed(8)}`
  }

  const formatMarketCap = (mcap: number) => {
    if (mcap >= 1000000) return `$${(mcap / 1000000).toFixed(2)}M`
    if (mcap >= 1000) return `$${(mcap / 1000).toFixed(2)}K`
    return `$${mcap.toFixed(0)}`
  }

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(2)}%`
  }

  const progressToGraduation = (marketCap / 69000) * 100

  return (
    <div className="space-y-4">
      {/* Pump.fun Style Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-bold text-white">
              {formatPrice(currentPrice)}
            </div>
            <div className={`px-2 py-1 rounded text-sm font-medium ${
              priceChange >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {formatChange(priceChange)}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <div className="text-gray-400">
              Market Cap: <span className="text-white font-medium">{formatMarketCap(marketCap)}</span>
            </div>
            <div className="text-gray-400">
              {campaign?.tokenSymbol && (
                <>Token: <span className="text-purple-400 font-medium">{campaign.tokenSymbol}</span></>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          {['1h', '4h', '24h', '7d'].map((range) => (
            <button
              key={range}
              onClick={() => {
                setTimeRange(range)
                generatePumpFunData()
              }}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                timeRange === range
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative bg-black/20 rounded-lg border border-white/10 p-4" style={{ height: '400px' }}>
        <canvas 
          ref={canvasRef}
          className="w-full h-full"
          style={{ imageRendering: 'crisp-edges' }}
        />
        
        {/* Chart Labels */}
        <div className="absolute bottom-4 left-4 text-xs text-gray-500">
          Volume
        </div>
        <div className="absolute top-4 right-4 text-xs text-gray-500">
          USD Price
        </div>
      </div>

      {/* Graduation Progress Bar */}
      <div className="bg-black/20 rounded-lg border border-white/10 p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">King of the Hill Progress</span>
          <span className="text-sm text-white font-medium">
            {formatMarketCap(marketCap)} / $69K
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(progressToGraduation, 100)}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-2">
          {progressToGraduation >= 100 
            ? "🎉 Ready to graduate to Raydium!" 
            : `${(100 - progressToGraduation).toFixed(1)}% remaining to graduation`}
        </div>
      </div>

      {/* Pump.fun Style Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-black/20 rounded-lg border border-white/10 p-3">
          <div className="text-xs text-gray-400">24h Volume</div>
          <div className="text-sm font-medium text-white">
            ${(Math.random() * 50000 + 10000).toFixed(0)}
          </div>
        </div>
        <div className="bg-black/20 rounded-lg border border-white/10 p-3">
          <div className="text-xs text-gray-400">Holders</div>
          <div className="text-sm font-medium text-white">
            {Math.floor(Math.random() * 500 + 50)}
          </div>
        </div>
        <div className="bg-black/20 rounded-lg border border-white/10 p-3">
          <div className="text-xs text-gray-400">Replies</div>
          <div className="text-sm font-medium text-white">
            {Math.floor(Math.random() * 200 + 20)}
          </div>
        </div>
        <div className="bg-black/20 rounded-lg border border-white/10 p-3">
          <div className="text-xs text-gray-400">Created</div>
          <div className="text-sm font-medium text-white">
            {Math.floor(Math.random() * 24 + 1)}h ago
          </div>
        </div>
      </div>
    </div>
  )
}
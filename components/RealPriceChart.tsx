import { useState, useEffect, useRef } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { getTransactionMonitor, PricePoint } from '../lib/transactionMonitor'
import { formatNumber, formatCurrency } from '../lib/utils'

interface RealPriceChartProps {
  campaignAddress: string
  height?: number
  showVolume?: boolean
  timeframe?: '1h' | '6h' | '24h' | '7d'
}

export default function RealPriceChart({ 
  campaignAddress, 
  height = 300,
  showVolume = true,
  timeframe = '24h'
}: RealPriceChartProps) {
  const { connection } = useConnection()
  const [priceData, setPriceData] = useState<PricePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPrice, setCurrentPrice] = useState(0)
  const [priceChange, setPriceChange] = useState(0)
  const [volume24h, setVolume24h] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!connection || !campaignAddress) return

    const monitor = getTransactionMonitor(connection)
    
    // Load price history
    const loadPriceData = () => {
      const priceHistory = monitor.getPriceHistory(campaignAddress)
      
      // Filter by timeframe
      const now = Date.now()
      const timeframeMs = {
        '1h': 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000
      }[timeframe]

      const filteredData = priceHistory.filter(point => 
        point.timestamp >= now - timeframeMs
      )

      setPriceData(filteredData)
      
      if (filteredData.length > 0) {
        const latest = filteredData[filteredData.length - 1]
        const earliest = filteredData[0]
        
        setCurrentPrice(latest.price)
        setPriceChange(((latest.price - earliest.price) / earliest.price) * 100)
        
        // Calculate 24h volume
        const volume = filteredData.reduce((sum, point) => sum + point.volume, 0)
        setVolume24h(volume)
      }
      
      setLoading(false)
    }

    loadPriceData()

    // Subscribe to updates
    const unsubscribe = monitor.subscribeToTransactions(campaignAddress, () => {
      loadPriceData()
    })

    return unsubscribe
  }, [connection, campaignAddress, timeframe])

  // Draw the chart on canvas
  useEffect(() => {
    if (!canvasRef.current || priceData.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    const width = rect.width
    const chartHeight = showVolume ? rect.height * 0.7 : rect.height
    const volumeHeight = showVolume ? rect.height * 0.3 : 0

    // Clear canvas
    ctx.clearRect(0, 0, width, rect.height)

    if (priceData.length < 2) return

    // Calculate price range
    const prices = priceData.map(p => p.price)
    const volumes = priceData.map(p => p.volume)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const maxVolume = Math.max(...volumes)

    const priceRange = maxPrice - minPrice
    const padding = 20

    // Draw price line
    ctx.beginPath()
    ctx.strokeStyle = priceChange >= 0 ? '#10B981' : '#EF4444' // Green for up, red for down
    ctx.lineWidth = 2

    priceData.forEach((point, index) => {
      const x = (index / (priceData.length - 1)) * (width - padding * 2) + padding
      const y = chartHeight - ((point.price - minPrice) / priceRange) * (chartHeight - padding * 2) - padding

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    // Fill area under the line
    ctx.beginPath()
    ctx.fillStyle = priceChange >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'
    
    priceData.forEach((point, index) => {
      const x = (index / (priceData.length - 1)) * (width - padding * 2) + padding
      const y = chartHeight - ((point.price - minPrice) / priceRange) * (chartHeight - padding * 2) - padding

      if (index === 0) {
        ctx.moveTo(x, chartHeight - padding)
        ctx.lineTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.lineTo(width - padding, chartHeight - padding)
    ctx.closePath()
    ctx.fill()

    // Draw volume bars if enabled
    if (showVolume && volumeHeight > 0) {
      const volumeTop = chartHeight + 10
      const barWidth = (width - padding * 2) / priceData.length

      priceData.forEach((point, index) => {
        const x = (index / priceData.length) * (width - padding * 2) + padding
        const barHeight = (point.volume / maxVolume) * (volumeHeight - 20)
        
        ctx.fillStyle = 'rgba(99, 102, 241, 0.5)' // Purple for volume
        ctx.fillRect(x, volumeTop + volumeHeight - barHeight - 10, barWidth * 0.8, barHeight)
      })
    }

    // Draw price grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * (chartHeight - padding * 2) + padding
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // Draw current price dot
    if (priceData.length > 0) {
      const lastPoint = priceData[priceData.length - 1]
      const x = width - padding
      const y = chartHeight - ((lastPoint.price - minPrice) / priceRange) * (chartHeight - padding * 2) - padding

      ctx.beginPath()
      ctx.fillStyle = priceChange >= 0 ? '#10B981' : '#EF4444'
      ctx.arc(x, y, 4, 0, 2 * Math.PI)
      ctx.fill()
    }

  }, [priceData, showVolume, priceChange])

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
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Price Chart</h3>
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold text-white">
              ${currentPrice.toFixed(8)}
            </div>
            <div className={`text-sm font-medium ${
              priceChange >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </div>
          </div>
        </div>
        
        {showVolume && (
          <div className="text-right">
            <div className="text-xs text-gray-400">24h Volume</div>
            <div className="text-sm font-semibold text-white">
              {formatNumber(volume24h)} SOL
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{ height: `${height}px` }}
        />
        
        {priceData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">📈</div>
              <p className="text-gray-400 text-sm">No price data yet</p>
              <p className="text-gray-500 text-xs mt-1">
                Price chart will appear after first transaction
              </p>
            </div>
          </div>
        )}
      </div>

      {priceData.length > 0 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-400">Min Price</div>
            <div className="text-white font-medium">
              ${Math.min(...priceData.map(p => p.price)).toFixed(8)}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Max Price</div>
            <div className="text-white font-medium">
              ${Math.max(...priceData.map(p => p.price)).toFixed(8)}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Transactions</div>
            <div className="text-white font-medium">
              {priceData.reduce((sum, p) => sum + p.txCount, 0)}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Avg Volume</div>
            <div className="text-white font-medium">
              {formatNumber(volume24h / Math.max(priceData.length, 1))} SOL
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
import { useState, useEffect, useRef } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { getPriceDataService, OHLCVCandle, TechnicalIndicators, MarketMetrics } from '../lib/priceDataService'
import { formatNumber, formatCurrency } from '../lib/utils'

interface AdvancedPriceChartProps {
  campaignAddress: string
  height?: number
  showVolume?: boolean
  showIndicators?: boolean
  timeframe?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
}

export default function AdvancedPriceChart({
  campaignAddress,
  height = 400,
  showVolume = true,
  showIndicators = true,
  timeframe = '1h'
}: AdvancedPriceChartProps) {
  const { connection } = useConnection()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [candles, setCandles] = useState<OHLCVCandle[]>([])
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null)
  const [metrics, setMetrics] = useState<MarketMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe)
  const [activeIndicators, setActiveIndicators] = useState({
    sma: true,
    ema: true,
    bollinger: false,
    rsi: false,
    macd: false
  })
  const [hoveredCandle, setHoveredCandle] = useState<OHLCVCandle | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!connection || !campaignAddress) return

    const loadChartData = async () => {
      setLoading(true)
      try {
        const priceService = getPriceDataService(connection)
        
        const [candleData, indicatorData, metricsData] = await Promise.all([
          priceService.generateCandles(campaignAddress, selectedTimeframe, 100),
          showIndicators ? priceService.calculateIndicators(campaignAddress) : null,
          priceService.calculateMarketMetrics(campaignAddress)
        ])

        setCandles(candleData)
        setIndicators(indicatorData)
        setMetrics(metricsData)
      } catch (error) {
        console.error('Error loading chart data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadChartData()

    // Refresh every 2 minutes (reduced from 30s to prevent rate limiting)
    const interval = setInterval(loadChartData, 120000)
    return () => clearInterval(interval)
  }, [connection, campaignAddress, selectedTimeframe, showIndicators])

  // Draw the advanced chart
  useEffect(() => {
    if (!canvasRef.current || candles.length === 0 || loading) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size for high DPI
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const chartHeight = showVolume ? rect.height * 0.7 : rect.height
    const volumeHeight = showVolume ? rect.height * 0.3 : 0
    const padding = { left: 60, right: 20, top: 20, bottom: 20 }

    // Clear canvas
    ctx.clearRect(0, 0, width, rect.height)

    // Calculate price and volume ranges
    const prices = candles.flatMap(c => [c.high, c.low])
    const volumes = candles.map(c => c.volume)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const maxVolume = Math.max(...volumes)
    
    const priceRange = maxPrice - minPrice
    const candleWidth = (width - padding.left - padding.right) / candles.length
    const bodyWidth = Math.max(1, candleWidth * 0.7)

    // Draw price grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i / 5) * (chartHeight - padding.top - padding.bottom)
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()

      // Price labels
      const price = maxPrice - (i / 5) * priceRange
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
      ctx.font = '10px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(price.toFixed(8), padding.left - 5, y + 3)
    }

    // Draw time grid
    const timeStep = Math.max(1, Math.floor(candles.length / 8))
    for (let i = 0; i < candles.length; i += timeStep) {
      const x = padding.left + (i + 0.5) * candleWidth
      ctx.beginPath()
      ctx.moveTo(x, padding.top)
      ctx.lineTo(x, chartHeight - padding.bottom)
      ctx.stroke()

      // Time labels
      const date = new Date(candles[i].timestamp)
      const timeLabel = selectedTimeframe.includes('d') 
        ? date.toLocaleDateString()
        : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
      ctx.textAlign = 'center'
      ctx.fillText(timeLabel, x, chartHeight - 5)
    }

    // Draw technical indicators
    if (indicators && showIndicators) {
      // Simple Moving Averages
      if (activeIndicators.sma && indicators.sma20) {
        ctx.strokeStyle = '#10B981'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        candles.forEach((candle, i) => {
          const x = padding.left + (i + 0.5) * candleWidth
          const y = chartHeight - padding.bottom - ((indicators.sma20! - minPrice) / priceRange) * (chartHeight - padding.top - padding.bottom)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.stroke()
      }

      // Bollinger Bands
      if (activeIndicators.bollinger && indicators.bollinger.upper) {
        ctx.strokeStyle = 'rgba(147, 51, 234, 0.5)'
        ctx.lineWidth = 1
        
        // Upper band
        ctx.beginPath()
        candles.forEach((candle, i) => {
          const x = padding.left + (i + 0.5) * candleWidth
          const y = chartHeight - padding.bottom - ((indicators.bollinger.upper! - minPrice) / priceRange) * (chartHeight - padding.top - padding.bottom)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.stroke()

        // Lower band
        ctx.beginPath()
        candles.forEach((candle, i) => {
          const x = padding.left + (i + 0.5) * candleWidth
          const y = chartHeight - padding.bottom - ((indicators.bollinger.lower! - minPrice) / priceRange) * (chartHeight - padding.top - padding.bottom)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.stroke()
      }
    }

    // Draw candlesticks
    candles.forEach((candle, i) => {
      const x = padding.left + i * candleWidth + (candleWidth - bodyWidth) / 2
      const openY = chartHeight - padding.bottom - ((candle.open - minPrice) / priceRange) * (chartHeight - padding.top - padding.bottom)
      const closeY = chartHeight - padding.bottom - ((candle.close - minPrice) / priceRange) * (chartHeight - padding.top - padding.bottom)
      const highY = chartHeight - padding.bottom - ((candle.high - minPrice) / priceRange) * (chartHeight - padding.top - padding.bottom)
      const lowY = chartHeight - padding.bottom - ((candle.low - minPrice) / priceRange) * (chartHeight - padding.top - padding.bottom)

      const isGreen = candle.close >= candle.open
      
      // Draw wick
      ctx.strokeStyle = isGreen ? '#10B981' : '#EF4444'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x + bodyWidth / 2, highY)
      ctx.lineTo(x + bodyWidth / 2, lowY)
      ctx.stroke()

      // Draw body
      ctx.fillStyle = isGreen ? '#10B981' : '#EF4444'
      if (isGreen) {
        ctx.strokeStyle = '#10B981'
        ctx.lineWidth = 1
        ctx.strokeRect(x, closeY, bodyWidth, openY - closeY)
      } else {
        ctx.fillRect(x, openY, bodyWidth, closeY - openY)
      }
    })

    // Draw volume bars
    if (showVolume && volumeHeight > 0) {
      const volumeTop = chartHeight + 10
      candles.forEach((candle, i) => {
        const x = padding.left + i * candleWidth + (candleWidth - bodyWidth) / 2
        const barHeight = (candle.volume / maxVolume) * (volumeHeight - 20)
        
        ctx.fillStyle = candle.close >= candle.open 
          ? 'rgba(16, 185, 129, 0.6)' 
          : 'rgba(239, 68, 68, 0.6)'
        ctx.fillRect(x, volumeTop + volumeHeight - barHeight - 10, bodyWidth, barHeight)
      })

      // Volume labels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
      ctx.font = '10px monospace'
      ctx.textAlign = 'right'
      ctx.fillText('Volume', padding.left - 5, volumeTop + 15)
      ctx.fillText(formatNumber(maxVolume), padding.left - 5, volumeTop + volumeHeight - 15)
    }

  }, [candles, indicators, showVolume, showIndicators, activeIndicators, selectedTimeframe, loading])

  // Handle mouse events for hover tooltip
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || candles.length === 0) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const padding = { left: 60, right: 20, top: 20, bottom: 20 }
    const candleWidth = (rect.width - padding.left - padding.right) / candles.length
    const candleIndex = Math.floor((x - padding.left) / candleWidth)

    if (candleIndex >= 0 && candleIndex < candles.length) {
      setHoveredCandle(candles[candleIndex])
      setMousePosition({ x: event.clientX, y: event.clientY })
    } else {
      setHoveredCandle(null)
    }
  }

  const handleMouseLeave = () => {
    setHoveredCandle(null)
  }

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      {/* Header with metrics and controls */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-white mb-2">Advanced Price Chart</h3>
          {metrics && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-white font-mono">
                ${candles.length > 0 ? candles[candles.length - 1].close.toFixed(8) : '0.00000000'}
              </span>
              <span className={`${metrics.priceChangePercent24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {metrics.priceChangePercent24h >= 0 ? '+' : ''}{metrics.priceChangePercent24h.toFixed(2)}%
              </span>
              <span className="text-gray-400">
                Vol: {formatNumber(metrics.volume24h)} SOL
              </span>
              <span className="text-gray-400">
                H: ${metrics.high24h.toFixed(8)}
              </span>
              <span className="text-gray-400">
                L: ${metrics.low24h.toFixed(8)}
              </span>
            </div>
          )}
        </div>

        {/* Timeframe selector */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {(['1m', '5m', '15m', '1h', '4h', '1d'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setSelectedTimeframe(tf)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                selectedTimeframe === tf
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Indicator controls */}
      {showIndicators && (
        <div className="flex gap-2 mb-4 text-xs">
          <button
            onClick={() => setActiveIndicators(prev => ({ ...prev, sma: !prev.sma }))}
            className={`px-2 py-1 rounded ${
              activeIndicators.sma ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-400'
            }`}
          >
            SMA(20)
          </button>
          <button
            onClick={() => setActiveIndicators(prev => ({ ...prev, bollinger: !prev.bollinger }))}
            className={`px-2 py-1 rounded ${
              activeIndicators.bollinger ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-gray-400'
            }`}
          >
            BB(20,2)
          </button>
        </div>
      )}

      {/* Chart canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair"
          style={{ height: `${height}px` }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />

        {/* Hover tooltip */}
        {hoveredCandle && (
          <div
            className="fixed z-50 bg-black/90 text-white p-3 rounded-lg text-xs font-mono"
            style={{
              left: mousePosition.x + 10,
              top: mousePosition.y - 100,
              pointerEvents: 'none'
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <div>Time:</div>
              <div>{new Date(hoveredCandle.timestamp).toLocaleString()}</div>
              <div>Open:</div>
              <div>${hoveredCandle.open.toFixed(8)}</div>
              <div>High:</div>
              <div className="text-green-400">${hoveredCandle.high.toFixed(8)}</div>
              <div>Low:</div>
              <div className="text-red-400">${hoveredCandle.low.toFixed(8)}</div>
              <div>Close:</div>
              <div>${hoveredCandle.close.toFixed(8)}</div>
              <div>Volume:</div>
              <div>{formatNumber(hoveredCandle.volume)} SOL</div>
              <div>VWAP:</div>
              <div>${hoveredCandle.vwap.toFixed(8)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Chart statistics */}
      {candles.length > 0 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-400">Candles</div>
            <div className="text-white font-medium">{candles.length}</div>
          </div>
          <div>
            <div className="text-gray-400">Avg Volume</div>
            <div className="text-white font-medium">
              {formatNumber(candles.reduce((sum, c) => sum + c.volume, 0) / candles.length)} SOL
            </div>
          </div>
          <div>
            <div className="text-gray-400">Price Range</div>
            <div className="text-white font-medium">
              {(((Math.max(...candles.map(c => c.high)) - Math.min(...candles.map(c => c.low))) / Math.min(...candles.map(c => c.low))) * 100).toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-gray-400">Total Trades</div>
            <div className="text-white font-medium">
              {candles.reduce((sum, c) => sum + c.transactions, 0)}
            </div>
          </div>
        </div>
      )}

      {candles.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📊</div>
          <h4 className="text-lg font-semibold text-white mb-2">No Chart Data</h4>
          <p className="text-gray-400 text-sm">
            Price chart will appear after trading activity begins
          </p>
        </div>
      )}
    </div>
  )
}
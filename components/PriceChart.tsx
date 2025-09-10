import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { getSolPriceInUSD } from '../lib/solPriceService'

interface PriceChartProps {
  campaign: any
}

interface CandlestickData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface PriceUpdate {
  tokenAddress: string
  price: number
  volume: number
  marketCap: number
  change24h: number
  timestamp: number
}

export default function PriceChart({ campaign }: PriceChartProps) {
  const [timeRange, setTimeRange] = useState('24h')
  const [chartData, setChartData] = useState<CandlestickData[]>([])
  const [currentPrice, setCurrentPrice] = useState<number>(0)
  const [priceChange, setPriceChange] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [solPriceUsd, setSolPriceUsd] = useState<number>(150)
  const socketRef = useRef<Socket | null>(null)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)

  // Fetch SOL price in USD
  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        const price = await getSolPriceInUSD()
        setSolPriceUsd(price)
      } catch (error) {
        console.warn('Failed to fetch SOL price, using default')
      }
    }
    
    fetchSolPrice()
    
    // Update SOL price every 5 minutes
    const interval = setInterval(fetchSolPrice, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return

    const loadChart = async () => {
      try {
        console.log('Starting to load TradingView chart...')
        console.log('Chart container exists:', !!chartContainerRef.current)
        
        // Try to load TradingView Lightweight Charts
        const lightweightCharts = await import('lightweight-charts')
        console.log('Lightweight charts loaded successfully:', lightweightCharts)
        
        if (!lightweightCharts || !lightweightCharts.createChart) {
          throw new Error('createChart function not found in lightweight-charts')
        }
        
        const { createChart } = lightweightCharts
        
        console.log('Creating chart with container width:', chartContainerRef.current!.clientWidth)
        const chart = createChart(chartContainerRef.current!, {
          width: chartContainerRef.current!.clientWidth,
          height: 400,
          layout: {
            background: { color: 'transparent' },
            textColor: '#d1d5db',
          },
          grid: {
            vertLines: { color: 'rgba(255, 255, 255, 0.1)' },
            horzLines: { color: 'rgba(255, 255, 255, 0.1)' },
          },
          rightPriceScale: {
            borderColor: 'rgba(255, 255, 255, 0.2)',
          },
          timeScale: {
            borderColor: 'rgba(255, 255, 255, 0.2)',
            timeVisible: true,
            secondsVisible: false,
          },
        })
        
        console.log('Chart created successfully')

        const candlestickSeries = (chart as any).addCandlestickSeries({
          upColor: '#10b981',
          downColor: '#ef4444',
          borderDownColor: '#ef4444',
          borderUpColor: '#10b981',
          wickDownColor: '#ef4444',
          wickUpColor: '#10b981',
        })
        
        console.log('Candlestick series added')

        chartRef.current = { chart, candlestickSeries }
        console.log('Chart setup complete')

        // Handle resize
        const handleResize = () => {
          if (chartContainerRef.current && chartRef.current && chartRef.current.chart) {
            (chartRef.current.chart as any).applyOptions({
              width: chartContainerRef.current.clientWidth,
            })
          }
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)

      } catch (error) {
        console.error('Failed to load TradingView chart:', error)
        console.error('Chart error details:', error)
        // Set a flag to show fallback display
        chartRef.current = { error: true }
        setIsLoading(false)
      }
    }

    loadChart()

    return () => {
      if (chartRef.current && chartRef.current.chart) {
        (chartRef.current.chart as any).remove()
      }
    }
  }, [])

  // Fetch historical data and set up real-time updates
  useEffect(() => {
    if (!campaign?.publicKey) return

    const tokenAddress = campaign.publicKey

    // Fetch historical chart data
    const fetchChartData = async () => {
      try {
        const intervalMap = {
          '1h': '1h',
          '4h': '4h', 
          '24h': '1d',
          '7d': '1d'
        }
        
        const interval = intervalMap[timeRange as keyof typeof intervalMap] || '1h'
        const response = await fetch(`/api/chart/${tokenAddress}?interval=${interval}&range=${timeRange}`)
        const result = await response.json()
        
        if (result.success && result.data) {
          setChartData(result.data.candlesticks)
          
          if (result.data.metrics) {
            setCurrentPrice(result.data.metrics.currentPrice)
            setPriceChange(result.data.metrics.change24h)
          }

          // Update chart if TradingView is loaded
          if (chartRef.current && chartRef.current.candlestickSeries && result.data.candlesticks.length > 0) {
            console.log('Updating chart with data:', result.data.candlesticks.length, 'candles')
            const priceMultiplier = solPriceUsd
            
            const formattedPriceData = result.data.candlesticks.map((candle: CandlestickData) => ({
              time: Math.floor(candle.time / 1000), // Convert to seconds
              open: candle.open * priceMultiplier,
              high: candle.high * priceMultiplier,
              low: candle.low * priceMultiplier,
              close: candle.close * priceMultiplier,
            }))
            
            console.log('Setting chart data:', formattedPriceData.slice(0, 2))
            chartRef.current.candlestickSeries.setData(formattedPriceData)
            
            // Auto-fit the chart to show all data
            if (chartRef.current.chart) {
              (chartRef.current.chart as any).timeScale().fitContent()
            }
            console.log('Chart updated successfully')
          } else {
            console.log('Chart not ready or no data:', !!chartRef.current, result.data?.candlesticks?.length)
          }
        }
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to fetch chart data:', error)
        setIsLoading(false)
      }
    }

    fetchChartData()

    // Set up WebSocket connection for real-time updates
    const setupWebSocket = () => {
      socketRef.current = io({
        path: '/api/websocket/price',
      })

      socketRef.current.on('connect', () => {
        console.log('Connected to price WebSocket')
        socketRef.current?.emit('subscribe', { tokenAddress })
      })

      socketRef.current.on('priceUpdate', (update: PriceUpdate) => {
        if (update.tokenAddress === tokenAddress) {
          setCurrentPrice(update.price)
          setPriceChange(update.change24h || 0)
          
          // Update chart with new price point
          if (chartRef.current && chartRef.current.candlestickSeries) {
            const priceInUsd = update.price * solPriceUsd
            const newPricePoint = {
              time: Math.floor(update.timestamp / 1000),
              open: priceInUsd,
              high: priceInUsd,
              low: priceInUsd,
              close: priceInUsd,
            }
            
            console.log('Updating chart with real-time price:', newPricePoint)
            chartRef.current.candlestickSeries.update(newPricePoint)
          }
        }
      })

      socketRef.current.on('subscribed', (data) => {
        console.log('Subscribed to price updates for:', data.tokenAddress)
      })

      socketRef.current.on('error', (error) => {
        console.error('WebSocket error:', error)
      })
    }

    setupWebSocket()

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('unsubscribe', { tokenAddress })
        socketRef.current.disconnect()
      }
    }
  }, [campaign?.publicKey, timeRange, solPriceUsd])

  const formatPrice = (priceInSol: number) => {
    // Convert SOL price to USD using real-time SOL price
    const priceInUsd = priceInSol * solPriceUsd
    
    if (priceInUsd >= 1) return `$${priceInUsd.toFixed(4)}`
    if (priceInUsd >= 0.0001) return `$${priceInUsd.toFixed(6)}`
    return `$${priceInUsd.toFixed(8)}`
  }

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(2)}%`
  }

  if (isLoading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
      </div>
    )
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
      
      <div 
        ref={chartContainerRef} 
        className="w-full rounded-lg bg-black/20 border border-white/10"
        style={{ height: '400px', minHeight: '400px' }}
      >
        {(!chartRef.current || chartRef.current.error) && (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              {isLoading ? (
                <>
                  <div className="text-lg font-medium">Real-time Price Chart</div>
                  <div className="text-sm">Loading TradingView chart...</div>
                  <div className="mt-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400 mx-auto"></div>
                  </div>
                </>
              ) : chartRef.current?.error ? (
                <div className="p-6">
                  <div className="text-lg font-medium mb-4">Simple Price View</div>
                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div>
                      <div className="text-sm text-gray-400">Current Price</div>
                      <div className="text-xl font-bold text-white">{formatPrice(currentPrice)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">24h Change</div>
                      <div className={`text-xl font-bold ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatChange(priceChange)}
                      </div>
                    </div>
                  </div>
                  {chartData.length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm text-gray-400 mb-2">Price History ({chartData.length} data points)</div>
                      <div className="h-32 flex items-end space-x-1">
                        {chartData.slice(-50).map((candle, index) => {
                          const height = ((candle.close - Math.min(...chartData.map(c => c.low))) / 
                                         (Math.max(...chartData.map(c => c.high)) - Math.min(...chartData.map(c => c.low)))) * 100
                          return (
                            <div
                              key={index}
                              className={`flex-1 ${candle.close >= candle.open ? 'bg-green-500' : 'bg-red-500'}`}
                              style={{ height: `${height}%`, minHeight: '2px' }}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )}
                  <div className="text-xs mt-4 text-gray-500">
                    TradingView chart unavailable. Showing simple view.
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-lg font-medium">Price Data</div>
                  <div className="text-sm">Chart loading...</div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
import { useState, useEffect, useRef } from 'react'
import { getSolPriceInUSD } from '../lib/solPriceService'

interface TradingViewChartProps {
  campaign: any
}

declare global {
  interface Window {
    TradingView: any
  }
}

export default function TradingViewChart({ campaign }: TradingViewChartProps) {
  const [currentPrice, setCurrentPrice] = useState<number>(0.0001)
  const [priceChange, setPriceChange] = useState<number>(5.2)
  const [solPriceUsd, setSolPriceUsd] = useState<number>(150)
  const [timeRange, setTimeRange] = useState('1D')
  const [isLoading, setIsLoading] = useState(true)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<any>(null)

  // Fetch SOL price
  useEffect(() => {
    getSolPriceInUSD().then(setSolPriceUsd).catch(console.error)
  }, [])

  // Load TradingView script
  useEffect(() => {
    // Check if script is already loaded
    const existingScript = document.querySelector('script[src*="tradingview.com"]')
    if (existingScript) {
      setScriptLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.id = 'tradingview-widget-script'
    
    script.onload = () => {
      console.log('TradingView script loaded')
      setScriptLoaded(true)
    }
    
    script.onerror = () => {
      console.error('Failed to load TradingView script')
      setIsLoading(false)
    }
    
    document.head.appendChild(script)
    
    return () => {
      // Only try to remove if the script is still in the DOM and is a child
      try {
        if (script && script.parentNode === document.head) {
          document.head.removeChild(script)
        }
      } catch (error) {
        // Silently ignore removal errors
        console.log('Script already removed or not found')
      }
    }
  }, [])

  // Initialize TradingView widget
  useEffect(() => {
    if (!scriptLoaded || !chartContainerRef.current) return

    // Cleanup previous widget
    if (widgetRef.current) {
      try {
        if (typeof widgetRef.current.remove === 'function') {
          widgetRef.current.remove()
        }
      } catch (error) {
        console.log('Widget cleanup error:', error)
      }
      widgetRef.current = null
    }

    // Clear container
    if (chartContainerRef.current) {
      chartContainerRef.current.innerHTML = ''
    }

    // Add a small delay to ensure cleanup is complete
    const initTimer = setTimeout(() => {
      if (!chartContainerRef.current) return

      try {
        // Check if TradingView is available
        if (!window.TradingView) {
          console.log('TradingView not available, using fallback')
          createFallbackChart()
          return
        }

        // Create TradingView Advanced Chart widget
        const widget = new window.TradingView.widget({
          autosize: true,
          symbol: getSymbolForCampaign(campaign),
          interval: timeRange,
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1", // Candlestick style
          locale: "en",
          toolbar_bg: "#f1f3f6",
          enable_publishing: false,
          allow_symbol_change: false,
          container_id: chartContainerRef.current.id || "tradingview_chart",
          studies: [
            "Volume@tv-basicstudies"
          ],
          overrides: {
            "paneProperties.background": "#1a1b23",
            "paneProperties.vertGridProperties.color": "rgba(255,255,255,0.1)",
            "paneProperties.horzGridProperties.color": "rgba(255,255,255,0.1)",
            "symbolWatermarkProperties.transparency": 90,
            "scalesProperties.textColor": "#AAA",
            "mainSeriesProperties.candleStyle.upColor": "#10b981",
            "mainSeriesProperties.candleStyle.downColor": "#ef4444",
            "mainSeriesProperties.candleStyle.borderUpColor": "#10b981",
            "mainSeriesProperties.candleStyle.borderDownColor": "#ef4444",
            "mainSeriesProperties.candleStyle.wickUpColor": "#10b981",
            "mainSeriesProperties.candleStyle.wickDownColor": "#ef4444"
          },
          loading_screen: {
            backgroundColor: "#1a1b23",
            foregroundColor: "#666"
          },
          disabled_features: [
            "use_localization",
            "volume_force_overlay",
            "header_symbol_search",
            "header_resolutions",
            "header_chart_type",
            "header_settings",
            "header_indicators",
            "header_compare",
            "header_undo_redo",
            "header_screenshot",
            "header_fullscreen_button"
          ],
          enabled_features: [
            "study_templates"
          ],
          custom_css_url: undefined,
          studies_overrides: {
            "volume.volume.color.0": "#ef4444",
            "volume.volume.color.1": "#10b981"
          }
        })

        widgetRef.current = widget
        setIsLoading(false)
        
        console.log('TradingView widget initialized')

      } catch (error) {
        console.error('Failed to initialize TradingView widget:', error)
        
        // Fallback to embedded iframe
        createFallbackChart()
      }
    }, 100)

    return () => {
      clearTimeout(initTimer)
    }
  }, [scriptLoaded, campaign, timeRange])

  // Create fallback chart using TradingView iframe embed
  const createFallbackChart = () => {
    if (!chartContainerRef.current) return
    
    const symbol = getSymbolForCampaign(campaign)
    const iframe = document.createElement('iframe')
    
    iframe.src = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${symbol}&interval=${timeRange}&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=1&saveimage=1&toolbarbg=F1F3F6&studies=[]&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=localhost&utm_medium=widget_new&utm_campaign=chart&utm_term=${symbol}`
    iframe.style.width = '100%'
    iframe.style.height = '100%'
    iframe.style.border = 'none'
    iframe.style.backgroundColor = '#1a1b23'
    
    chartContainerRef.current.innerHTML = ''
    chartContainerRef.current.appendChild(iframe)
    
    setIsLoading(false)
    console.log('TradingView fallback chart created')
  }

  // Generate symbol for TradingView (use SOL/USDT as base, could be customized)
  const getSymbolForCampaign = (campaign: any) => {
    // For real implementation, you'd map campaign tokens to actual TradingView symbols
    // For now, use SOL/USDT as representative of Solana ecosystem
    return "BINANCE:SOLUSDT"
    
    // Could also use other symbols based on campaign type:
    // return "COINBASE:SOLUSD"
    // return "KRAKEN:SOLUSD"
    // return "BINANCE:RAYUSDT" // for Raydium-based tokens
  }

  // Update current price from campaign data
  useEffect(() => {
    if (campaign?.tokenPrice && solPriceUsd) {
      setCurrentPrice(campaign.tokenPrice)
      
      // Calculate mock price change (in real app, this would come from API)
      const mockChange = (Math.random() - 0.5) * 20 // -10% to +10%
      setPriceChange(mockChange)
    }
  }, [campaign, solPriceUsd])

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

  // Give the container a unique ID for TradingView
  useEffect(() => {
    if (chartContainerRef.current && !chartContainerRef.current.id) {
      chartContainerRef.current.id = `tradingview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }, [])

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Cleanup widget on unmount
      if (widgetRef.current) {
        try {
          if (typeof widgetRef.current.remove === 'function') {
            widgetRef.current.remove()
          }
        } catch (error) {
          console.log('Widget cleanup on unmount error:', error)
        }
        widgetRef.current = null
      }
    }
  }, [])

  return (
    <div className="h-96">
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
          {['1', '5', '15', '1H', '4H', '1D'].map((range) => (
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
        className="w-full rounded-lg bg-black/20 border border-white/10 overflow-hidden"
        style={{ height: '450px' }}
      >
        {isLoading && (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-lg font-medium">Loading TradingView Chart</div>
              <div className="text-sm mt-2">Connecting to TradingView...</div>
              <div className="mt-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400 mx-auto"></div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* TradingView Branding (required for free usage) */}
      <div className="text-xs text-gray-500 mt-2 text-center">
        Charts powered by{' '}
        <a 
          href="https://www.tradingview.com/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300"
        >
          TradingView
        </a>
      </div>
    </div>
  )
}
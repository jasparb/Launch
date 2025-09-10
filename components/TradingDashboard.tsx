import { useState, useEffect } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { getPriceDataService, MarketMetrics, TechnicalIndicators } from '../lib/priceDataService'
import AdvancedPriceChart from './AdvancedPriceChart'
import MarketDepth from './MarketDepth'
import TradingPanel from './TradingPanel'
import LiveTransactionFeed from './LiveTransactionFeed'
import { formatNumber, formatCurrency } from '../lib/utils'

interface TradingDashboardProps {
  campaign: any
}

export default function TradingDashboard({ campaign }: TradingDashboardProps) {
  const { connection } = useConnection()
  const [activeTab, setActiveTab] = useState<'chart' | 'depth' | 'trades'>('chart')
  const [metrics, setMetrics] = useState<MarketMetrics | null>(null)
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null)
  const [loading, setLoading] = useState(true)
  const [alertsEnabled, setAlertsEnabled] = useState(false)

  useEffect(() => {
    if (!connection || !campaign?.publicKey) return

    const loadTradingData = async () => {
      setLoading(true)
      try {
        const priceService = getPriceDataService(connection)
        
        const [metricsData, indicatorsData] = await Promise.all([
          priceService.calculateMarketMetrics(campaign.publicKey),
          priceService.calculateIndicators(campaign.publicKey)
        ])

        setMetrics(metricsData)
        setIndicators(indicatorsData)
      } catch (error) {
        console.error('Error loading trading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTradingData()

    // Refresh every 3 minutes (reduced to prevent rate limiting)
    const interval = setInterval(loadTradingData, 180000)
    return () => clearInterval(interval)
  }, [connection, campaign?.publicKey])

  const getMetricColor = (value: number, isPercent: boolean = false) => {
    if (value > 0) return 'text-green-400'
    if (value < 0) return 'text-red-400'
    return 'text-gray-300'
  }

  const getRSIColor = (rsi: number | null) => {
    if (!rsi) return 'text-gray-400'
    if (rsi > 70) return 'text-red-400' // Overbought
    if (rsi < 30) return 'text-green-400' // Oversold
    return 'text-yellow-400' // Neutral
  }

  const getVolumeIndicator = (volumeChange: number) => {
    if (volumeChange > 50) return { icon: '🔥', text: 'High Volume', color: 'text-orange-400' }
    if (volumeChange > 20) return { icon: '📈', text: 'Increasing', color: 'text-green-400' }
    if (volumeChange < -20) return { icon: '📉', text: 'Decreasing', color: 'text-red-400' }
    return { icon: '⚪', text: 'Stable', color: 'text-gray-400' }
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">❌</div>
        <h4 className="text-lg font-semibold text-white mb-2">Campaign Not Found</h4>
        <p className="text-gray-400 text-sm">Unable to load trading data</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Trading Header with Key Metrics */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {campaign.tokenSymbol || campaign.name} Trading
            </h2>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-mono text-white">
                ${campaign.tokenPrice || '0.00000000'}
              </div>
              {metrics && (
                <div className={`text-lg font-semibold ${getMetricColor(metrics.priceChangePercent24h)}`}>
                  {metrics.priceChangePercent24h >= 0 ? '+' : ''}
                  {metrics.priceChangePercent24h.toFixed(2)}%
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-400">LIVE</span>
              </div>
            </div>
          </div>

          {/* Alert toggle */}
          <button
            onClick={() => setAlertsEnabled(!alertsEnabled)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              alertsEnabled 
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                : 'bg-white/10 text-gray-400 border border-white/20 hover:bg-white/20'
            }`}
          >
            🔔 Alerts {alertsEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Key Metrics Grid */}
        {metrics && !loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Market Cap</div>
              <div className="text-sm font-bold text-white">
                ${formatNumber(metrics.marketCap)}
              </div>
              <div className={`text-xs ${getMetricColor(metrics.marketCapChange24h)}`}>
                {metrics.marketCapChange24h >= 0 ? '+' : ''}${formatNumber(metrics.marketCapChange24h)}
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">24h Volume</div>
              <div className="text-sm font-bold text-white">
                {formatNumber(metrics.volume24h)} SOL
              </div>
              <div className="flex items-center gap-1">
                <span className={`text-xs ${getMetricColor(metrics.volumeChange24h)}`}>
                  {metrics.volumeChange24h >= 0 ? '+' : ''}{metrics.volumeChange24h.toFixed(1)}%
                </span>
                <span className="text-xs">
                  {getVolumeIndicator(metrics.volumeChange24h).icon}
                </span>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">24h Range</div>
              <div className="text-sm font-bold text-white">
                ${metrics.low24h.toFixed(6)}
              </div>
              <div className="text-sm font-bold text-white">
                ${metrics.high24h.toFixed(6)}
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Avg Trade</div>
              <div className="text-sm font-bold text-white">
                {formatNumber(metrics.averageTradeSize)} SOL
              </div>
              <div className="text-xs text-gray-400">
                {metrics.totalTrades} trades
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Traders</div>
              <div className="text-sm font-bold text-white">
                {metrics.uniqueTraders}
              </div>
              <div className="text-xs text-gray-400">
                24h unique
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Volatility</div>
              <div className="text-sm font-bold text-white">
                {metrics.volatility24h.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-400">
                24h std dev
              </div>
            </div>
          </div>
        )}

        {/* Technical Indicators Bar */}
        {indicators && !loading && (
          <div className="mt-4 flex gap-4 text-sm">
            {indicators.rsi && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">RSI(14):</span>
                <span className={getRSIColor(indicators.rsi)}>
                  {indicators.rsi.toFixed(1)}
                </span>
              </div>
            )}
            {indicators.sma20 && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">SMA(20):</span>
                <span className="text-green-400">
                  ${indicators.sma20.toFixed(8)}
                </span>
              </div>
            )}
            {indicators.support && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Support:</span>
                <span className="text-blue-400">
                  ${indicators.support.toFixed(8)}
                </span>
              </div>
            )}
            {indicators.resistance && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Resistance:</span>
                <span className="text-orange-400">
                  ${indicators.resistance.toFixed(8)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Trading Interface */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Charts and Analysis (3/4 width) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Chart/Depth/Trades Tabs */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
            <div className="flex border-b border-white/10">
              <button
                onClick={() => setActiveTab('chart')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${
                  activeTab === 'chart'
                    ? 'bg-purple-500/20 text-purple-300 border-b-2 border-purple-400'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                📈 Price Chart
              </button>
              <button
                onClick={() => setActiveTab('depth')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${
                  activeTab === 'depth'
                    ? 'bg-purple-500/20 text-purple-300 border-b-2 border-purple-400'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                📊 Market Depth
              </button>
              <button
                onClick={() => setActiveTab('trades')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${
                  activeTab === 'trades'
                    ? 'bg-purple-500/20 text-purple-300 border-b-2 border-purple-400'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                💰 Live Trades
              </button>
            </div>

            <div className="p-0">
              {activeTab === 'chart' && (
                <AdvancedPriceChart
                  campaignAddress={campaign.publicKey}
                  height={450}
                  showVolume={true}
                  showIndicators={true}
                />
              )}
              {activeTab === 'depth' && (
                <div className="p-6">
                  <MarketDepth
                    campaignAddress={campaign.publicKey}
                    maxLevels={15}
                  />
                </div>
              )}
              {activeTab === 'trades' && (
                <div className="p-6">
                  <LiveTransactionFeed
                    campaignAddress={campaign.publicKey}
                    maxTransactions={15}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Additional Market Analysis */}
          {metrics && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-bold text-white mb-4">Market Analysis</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-white mb-3">Liquidity Analysis</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Liquidity Score:</span>
                      <span className={`font-medium ${
                        metrics.liquidityScore > 70 ? 'text-green-400' :
                        metrics.liquidityScore > 40 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {metrics.liquidityScore.toFixed(1)}/100
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Volume/Market Cap:</span>
                      <span className="text-white">
                        {((metrics.volume24h / metrics.marketCap) * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Trade Frequency:</span>
                      <span className="text-white">
                        {(metrics.totalTrades / 24).toFixed(1)} trades/hour
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-white mb-3">Risk Metrics</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Volatility (24h):</span>
                      <span className={`font-medium ${
                        metrics.volatility24h > 50 ? 'text-red-400' :
                        metrics.volatility24h > 20 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {metrics.volatility24h.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Price Range (24h):</span>
                      <span className="text-white">
                        {(((metrics.high24h - metrics.low24h) / metrics.low24h) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Market Depth:</span>
                      <span className="text-white">
                        {metrics.liquidityScore > 50 ? 'Deep' : 'Shallow'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Trading Panel (1/4 width) */}
        <div className="lg:col-span-1">
          <TradingPanel campaign={campaign} />
        </div>
      </div>
    </div>
  )
}
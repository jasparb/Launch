// Advanced price data service with OHLCV candles and trading indicators
import { Connection, PublicKey } from '@solana/web3.js'
import { getTransactionMonitor, PricePoint } from './transactionMonitor'
import { createBondingCurve } from './bondingCurve'

export interface OHLCVCandle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  volumeUSD: number
  transactions: number
  vwap: number // Volume Weighted Average Price
}

export interface MarketDepth {
  timestamp: number
  bids: Array<{ price: number; size: number; total: number }>
  asks: Array<{ price: number; size: number; total: number }>
  spread: number
  midPrice: number
}

export interface TechnicalIndicators {
  sma20: number | null  // Simple Moving Average 20
  sma50: number | null  // Simple Moving Average 50
  ema12: number | null  // Exponential Moving Average 12
  ema26: number | null  // Exponential Moving Average 26
  macd: number | null   // MACD Line
  macdSignal: number | null // MACD Signal Line
  rsi: number | null    // Relative Strength Index
  bollinger: {
    upper: number | null
    middle: number | null
    lower: number | null
  }
  support: number | null
  resistance: number | null
}

export interface MarketMetrics {
  priceChange24h: number
  priceChangePercent24h: number
  high24h: number
  low24h: number
  volume24h: number
  volumeChange24h: number
  marketCap: number
  marketCapChange24h: number
  averageTradeSize: number
  totalTrades: number
  uniqueTraders: number
  liquidityScore: number
  volatility24h: number
}

export interface PriceAlert {
  id: string
  campaignAddress: string
  type: 'price_above' | 'price_below' | 'volume_spike' | 'new_ath' | 'new_atl'
  threshold: number
  triggered: boolean
  createdAt: number
  triggeredAt?: number
}

export class PriceDataService {
  private connection: Connection
  private candleCache: Map<string, OHLCVCandle[]> = new Map()
  private indicatorCache: Map<string, TechnicalIndicators> = new Map()
  private alertsCache: Map<string, PriceAlert[]> = new Map()
  private lastUpdateTime: Map<string, number> = new Map()

  constructor(connection: Connection) {
    this.connection = connection
  }

  // Generate OHLCV candles from transaction data
  async generateCandles(
    campaignAddress: string, 
    timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' = '1h',
    limit: number = 100
  ): Promise<OHLCVCandle[]> {
    const cacheKey = `${campaignAddress}-${timeframe}`
    
    // Check if we need to update (every 30 seconds)
    const lastUpdate = this.lastUpdateTime.get(cacheKey) || 0
    if (Date.now() - lastUpdate < 30000 && this.candleCache.has(cacheKey)) {
      return this.candleCache.get(cacheKey)!
    }

    try {
      const monitor = getTransactionMonitor(this.connection)
      const transactions = monitor.getTransactions(campaignAddress)
      
      if (transactions.length === 0) {
        return []
      }

      // Filter contribution transactions and sort by time
      const contributions = transactions
        .filter(tx => tx.type === 'contribution' && tx.price)
        .sort((a, b) => a.blockTime - b.blockTime)

      if (contributions.length === 0) {
        return []
      }

      // Group transactions into time buckets
      const timeframeBuckets = this.getTimeframeBuckets(timeframe)
      const candles: OHLCVCandle[] = []
      
      const now = Date.now()
      const startTime = now - (limit * timeframeBuckets.duration)
      
      for (let i = 0; i < limit; i++) {
        const bucketStart = startTime + (i * timeframeBuckets.duration)
        const bucketEnd = bucketStart + timeframeBuckets.duration
        
        const bucketTransactions = contributions.filter(tx => 
          tx.blockTime >= bucketStart && tx.blockTime < bucketEnd
        )

        if (bucketTransactions.length > 0) {
          const prices = bucketTransactions.map(tx => tx.price!)
          const volumes = bucketTransactions.map(tx => tx.amount)
          const volumeWeights = bucketTransactions.map(tx => tx.amount * tx.price!)
          
          const open = prices[0]
          const close = prices[prices.length - 1]
          const high = Math.max(...prices)
          const low = Math.min(...prices)
          const volume = volumes.reduce((sum, v) => sum + v, 0)
          const volumeUSD = volumeWeights.reduce((sum, v) => sum + v, 0)
          const vwap = volumeUSD / volume

          candles.push({
            timestamp: bucketStart,
            open,
            high,
            low,
            close,
            volume,
            volumeUSD,
            transactions: bucketTransactions.length,
            vwap
          })
        } else if (candles.length > 0) {
          // Fill gaps with previous close price
          const lastCandle = candles[candles.length - 1]
          candles.push({
            timestamp: bucketStart,
            open: lastCandle.close,
            high: lastCandle.close,
            low: lastCandle.close,
            close: lastCandle.close,
            volume: 0,
            volumeUSD: 0,
            transactions: 0,
            vwap: lastCandle.close
          })
        }
      }

      this.candleCache.set(cacheKey, candles)
      this.lastUpdateTime.set(cacheKey, Date.now())
      
      return candles
    } catch (error) {
      console.error('Error generating candles:', error)
      return []
    }
  }

  // Calculate technical indicators
  async calculateIndicators(campaignAddress: string): Promise<TechnicalIndicators> {
    const cacheKey = campaignAddress
    
    // Check cache (update every 60 seconds)
    const lastUpdate = this.lastUpdateTime.get(`indicators-${cacheKey}`) || 0
    if (Date.now() - lastUpdate < 60000 && this.indicatorCache.has(cacheKey)) {
      return this.indicatorCache.get(cacheKey)!
    }

    try {
      const candles = await this.generateCandles(campaignAddress, '1h', 200)
      
      if (candles.length < 50) {
        return this.getEmptyIndicators()
      }

      const closes = candles.map(c => c.close)
      const highs = candles.map(c => c.high)
      const lows = candles.map(c => c.low)
      const volumes = candles.map(c => c.volume)

      const indicators: TechnicalIndicators = {
        sma20: this.calculateSMA(closes, 20),
        sma50: this.calculateSMA(closes, 50),
        ema12: this.calculateEMA(closes, 12),
        ema26: this.calculateEMA(closes, 26),
        macd: null,
        macdSignal: null,
        rsi: this.calculateRSI(closes, 14),
        bollinger: this.calculateBollingerBands(closes, 20, 2),
        support: this.findSupport(lows),
        resistance: this.findResistance(highs)
      }

      // Calculate MACD
      if (indicators.ema12 && indicators.ema26) {
        indicators.macd = indicators.ema12 - indicators.ema26
        const macdLine = this.calculateMACD(closes)
        indicators.macdSignal = this.calculateEMA(macdLine, 9)
      }

      this.indicatorCache.set(cacheKey, indicators)
      this.lastUpdateTime.set(`indicators-${cacheKey}`, Date.now())
      
      return indicators
    } catch (error) {
      console.error('Error calculating indicators:', error)
      return this.getEmptyIndicators()
    }
  }

  // Calculate market metrics
  async calculateMarketMetrics(campaignAddress: string): Promise<MarketMetrics> {
    try {
      const monitor = getTransactionMonitor(this.connection)
      const transactions = monitor.getTransactions(campaignAddress)
      const candles = await this.generateCandles(campaignAddress, '1h', 24)

      const now = Date.now()
      const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000)
      
      const recent24h = transactions.filter(tx => 
        tx.blockTime >= twentyFourHoursAgo && tx.type === 'contribution'
      )
      
      const previous24h = transactions.filter(tx => 
        tx.blockTime >= (twentyFourHoursAgo - 24 * 60 * 60 * 1000) && 
        tx.blockTime < twentyFourHoursAgo && 
        tx.type === 'contribution'
      )

      const currentPrice = recent24h.length > 0 ? recent24h[recent24h.length - 1].price || 0 : 0
      const price24hAgo = previous24h.length > 0 ? previous24h[previous24h.length - 1].price || 0 : currentPrice

      const volume24h = recent24h.reduce((sum, tx) => sum + tx.amount, 0)
      const volumePrevious24h = previous24h.reduce((sum, tx) => sum + tx.amount, 0)

      const prices24h = recent24h.map(tx => tx.price || 0).filter(p => p > 0)
      const high24h = prices24h.length > 0 ? Math.max(...prices24h) : currentPrice
      const low24h = prices24h.length > 0 ? Math.min(...prices24h) : currentPrice

      const uniqueTraders = new Set(recent24h.map(tx => tx.user)).size
      const averageTradeSize = recent24h.length > 0 ? volume24h / recent24h.length : 0

      // Calculate volatility (standard deviation of returns)
      const returns = candles.slice(1).map((candle, i) => 
        (candle.close - candles[i].close) / candles[i].close
      ).filter(r => !isNaN(r))
      
      const volatility = returns.length > 0 ? this.calculateStandardDeviation(returns) * 100 : 0

      const marketCap = currentPrice * 1_000_000_000 // Assuming 1B total supply
      const marketCap24hAgo = price24hAgo * 1_000_000_000

      return {
        priceChange24h: currentPrice - price24hAgo,
        priceChangePercent24h: price24hAgo > 0 ? ((currentPrice - price24hAgo) / price24hAgo) * 100 : 0,
        high24h,
        low24h,
        volume24h,
        volumeChange24h: volumePrevious24h > 0 ? ((volume24h - volumePrevious24h) / volumePrevious24h) * 100 : 0,
        marketCap,
        marketCapChange24h: marketCap - marketCap24hAgo,
        averageTradeSize,
        totalTrades: recent24h.length,
        uniqueTraders,
        liquidityScore: this.calculateLiquidityScore(volume24h, volatility),
        volatility24h: volatility
      }
    } catch (error) {
      console.error('Error calculating market metrics:', error)
      return this.getEmptyMetrics()
    }
  }

  // Generate simulated market depth (order book)
  async generateMarketDepth(campaignAddress: string): Promise<MarketDepth> {
    try {
      const monitor = getTransactionMonitor(this.connection)
      const transactions = monitor.getTransactions(campaignAddress)
      const recentTx = transactions.filter(tx => tx.type === 'contribution').slice(0, 10)
      
      if (recentTx.length === 0) {
        return {
          timestamp: Date.now(),
          bids: [],
          asks: [],
          spread: 0,
          midPrice: 0
        }
      }

      const currentPrice = recentTx[0].price || 0
      const volume = recentTx.reduce((sum, tx) => sum + tx.amount, 0) / recentTx.length

      // Simulate order book based on bonding curve and recent activity
      const curve = createBondingCurve(volume, 0)
      const bids: Array<{ price: number; size: number; total: number }> = []
      const asks: Array<{ price: number; size: number; total: number }> = []

      // Generate bid levels (below current price)
      let totalBidSize = 0
      for (let i = 1; i <= 10; i++) {
        const priceOffset = (i * 0.5) / 100 // 0.5% steps
        const price = currentPrice * (1 - priceOffset)
        const size = volume * (1 + Math.random() * 0.5) // Simulate liquidity
        totalBidSize += size
        
        bids.push({
          price,
          size,
          total: totalBidSize
        })
      }

      // Generate ask levels (above current price)
      let totalAskSize = 0
      for (let i = 1; i <= 10; i++) {
        const priceOffset = (i * 0.5) / 100 // 0.5% steps
        const price = currentPrice * (1 + priceOffset)
        const size = volume * (1 + Math.random() * 0.5) // Simulate liquidity
        totalAskSize += size
        
        asks.push({
          price,
          size,
          total: totalAskSize
        })
      }

      const spread = asks[0].price - bids[0].price
      const midPrice = (asks[0].price + bids[0].price) / 2

      return {
        timestamp: Date.now(),
        bids: bids.reverse(), // Highest bids first
        asks, // Lowest asks first
        spread,
        midPrice
      }
    } catch (error) {
      console.error('Error generating market depth:', error)
      return {
        timestamp: Date.now(),
        bids: [],
        asks: [],
        spread: 0,
        midPrice: 0
      }
    }
  }

  // Helper methods for technical analysis
  private calculateSMA(data: number[], period: number): number | null {
    if (data.length < period) return null
    const slice = data.slice(-period)
    return slice.reduce((sum, val) => sum + val, 0) / period
  }

  private calculateEMA(data: number[], period: number): number | null {
    if (data.length < period) return null
    
    const multiplier = 2 / (period + 1)
    let ema = data.slice(0, period).reduce((sum, val) => sum + val, 0) / period
    
    for (let i = period; i < data.length; i++) {
      ema = (data[i] * multiplier) + (ema * (1 - multiplier))
    }
    
    return ema
  }

  private calculateRSI(data: number[], period: number): number | null {
    if (data.length < period + 1) return null
    
    const changes = []
    for (let i = 1; i < data.length; i++) {
      changes.push(data[i] - data[i - 1])
    }
    
    let avgGain = 0
    let avgLoss = 0
    
    for (let i = 0; i < period; i++) {
      if (changes[i] > 0) avgGain += changes[i]
      else avgLoss += Math.abs(changes[i])
    }
    
    avgGain /= period
    avgLoss /= period
    
    for (let i = period; i < changes.length; i++) {
      const gain = changes[i] > 0 ? changes[i] : 0
      const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0
      
      avgGain = (avgGain * (period - 1) + gain) / period
      avgLoss = (avgLoss * (period - 1) + loss) / period
    }
    
    if (avgLoss === 0) return 100
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }

  private calculateBollingerBands(data: number[], period: number, stdDev: number) {
    const sma = this.calculateSMA(data, period)
    if (!sma || data.length < period) {
      return { upper: null, middle: null, lower: null }
    }
    
    const slice = data.slice(-period)
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period
    const standardDeviation = Math.sqrt(variance)
    
    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev)
    }
  }

  private calculateMACD(data: number[]): number[] {
    const ema12Values = []
    const ema26Values = []
    
    for (let i = 12; i <= data.length; i++) {
      const ema12 = this.calculateEMA(data.slice(0, i), 12)
      if (ema12) ema12Values.push(ema12)
    }
    
    for (let i = 26; i <= data.length; i++) {
      const ema26 = this.calculateEMA(data.slice(0, i), 26)
      if (ema26) ema26Values.push(ema26)
    }
    
    const macdLine = []
    const minLength = Math.min(ema12Values.length, ema26Values.length)
    for (let i = 0; i < minLength; i++) {
      macdLine.push(ema12Values[i] - ema26Values[i])
    }
    
    return macdLine
  }

  private findSupport(lows: number[]): number | null {
    if (lows.length < 10) return null
    
    // Find local minima in the last 50 periods
    const recentLows = lows.slice(-50)
    const supports = []
    
    for (let i = 2; i < recentLows.length - 2; i++) {
      if (recentLows[i] < recentLows[i-1] && recentLows[i] < recentLows[i-2] &&
          recentLows[i] < recentLows[i+1] && recentLows[i] < recentLows[i+2]) {
        supports.push(recentLows[i])
      }
    }
    
    // Return the highest support level
    return supports.length > 0 ? Math.max(...supports) : null
  }

  private findResistance(highs: number[]): number | null {
    if (highs.length < 10) return null
    
    // Find local maxima in the last 50 periods
    const recentHighs = highs.slice(-50)
    const resistances = []
    
    for (let i = 2; i < recentHighs.length - 2; i++) {
      if (recentHighs[i] > recentHighs[i-1] && recentHighs[i] > recentHighs[i-2] &&
          recentHighs[i] > recentHighs[i+1] && recentHighs[i] > recentHighs[i+2]) {
        resistances.push(recentHighs[i])
      }
    }
    
    // Return the lowest resistance level
    return resistances.length > 0 ? Math.min(...resistances) : null
  }

  private calculateStandardDeviation(data: number[]): number {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length
    return Math.sqrt(variance)
  }

  private calculateLiquidityScore(volume: number, volatility: number): number {
    // Higher volume and lower volatility = better liquidity
    if (volume === 0) return 0
    return Math.min(100, (volume * 10) / (1 + volatility))
  }

  private getTimeframeBuckets(timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d') {
    const buckets = {
      '1m': { duration: 60 * 1000, label: '1 Minute' },
      '5m': { duration: 5 * 60 * 1000, label: '5 Minutes' },
      '15m': { duration: 15 * 60 * 1000, label: '15 Minutes' },
      '1h': { duration: 60 * 60 * 1000, label: '1 Hour' },
      '4h': { duration: 4 * 60 * 60 * 1000, label: '4 Hours' },
      '1d': { duration: 24 * 60 * 60 * 1000, label: '1 Day' }
    }
    return buckets[timeframe]
  }

  private getEmptyIndicators(): TechnicalIndicators {
    return {
      sma20: null,
      sma50: null,
      ema12: null,
      ema26: null,
      macd: null,
      macdSignal: null,
      rsi: null,
      bollinger: { upper: null, middle: null, lower: null },
      support: null,
      resistance: null
    }
  }

  private getEmptyMetrics(): MarketMetrics {
    return {
      priceChange24h: 0,
      priceChangePercent24h: 0,
      high24h: 0,
      low24h: 0,
      volume24h: 0,
      volumeChange24h: 0,
      marketCap: 0,
      marketCapChange24h: 0,
      averageTradeSize: 0,
      totalTrades: 0,
      uniqueTraders: 0,
      liquidityScore: 0,
      volatility24h: 0
    }
  }
}

// Singleton instance
let priceDataService: PriceDataService | null = null

export function getPriceDataService(connection: Connection): PriceDataService {
  if (!priceDataService) {
    priceDataService = new PriceDataService(connection)
  }
  return priceDataService
}
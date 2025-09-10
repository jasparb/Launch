import { Connection, PublicKey, ParsedAccountData } from '@solana/web3.js'
import { Program, AnchorProvider, Idl } from '@project-serum/anchor'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'

export interface PricePoint {
  id: string
  tokenAddress: string
  price: number
  volume: number
  solReserves: number
  tokenReserves: number
  marketCap: number
  timestamp: number
  transactionSignature: string
}

export interface CandlestickData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface TokenMetrics {
  currentPrice: number
  change24h: number
  volume24h: number
  marketCap: number
  holders: number
  totalSupply: number
}

export class PriceIndexer {
  private connection: Connection
  private subscriptions: Map<string, number> = new Map()
  private priceData: Map<string, PricePoint[]> = new Map()
  private listeners: Map<string, ((price: PricePoint) => void)[]> = new Map()

  constructor(connection: Connection) {
    this.connection = connection
  }

  // Subscribe to campaign account changes for price updates
  async subscribeToCampaign(campaignAddress: string): Promise<void> {
    try {
      // Check if it's a valid Solana PublicKey format
      let campaignPubkey: PublicKey
      try {
        campaignPubkey = new PublicKey(campaignAddress)
      } catch (error) {
        // If not a valid PublicKey, it's probably a local campaign ID
        console.log(`Campaign ${campaignAddress} is not a valid PublicKey, skipping Solana subscription`)
        return
      }
      
      const subscriptionId = this.connection.onAccountChange(
        campaignPubkey,
        (accountInfo, context) => {
          this.processCampaignUpdate(campaignAddress, accountInfo, context.slot)
        },
        'confirmed'
      )

      this.subscriptions.set(campaignAddress, subscriptionId)
      console.log(`Subscribed to campaign ${campaignAddress}`)
    } catch (error) {
      console.error(`Failed to subscribe to campaign ${campaignAddress}:`, error)
    }
  }

  // Unsubscribe from campaign updates
  async unsubscribeFromCampaign(campaignAddress: string): Promise<void> {
    const subscriptionId = this.subscriptions.get(campaignAddress)
    if (subscriptionId) {
      await this.connection.removeAccountChangeListener(subscriptionId)
      this.subscriptions.delete(campaignAddress)
      console.log(`Unsubscribed from campaign ${campaignAddress}`)
    }
  }

  // Process campaign account updates to extract price data
  private async processCampaignUpdate(
    campaignAddress: string,
    accountInfo: any,
    slot: number
  ): Promise<void> {
    try {
      // Parse campaign account data
      const campaignData = this.parseCampaignData(accountInfo.data)
      if (!campaignData) return

      // Calculate current price from bonding curve
      const price = this.calculatePrice(
        campaignData.virtualSolReserves + campaignData.realSolReserves,
        campaignData.virtualTokenReserves + campaignData.realTokenReserves
      )

      // Calculate market cap
      const marketCap = price * (campaignData.tokenTotalSupply / 1e6) // Assuming 6 decimals

      // Create price point
      const pricePoint: PricePoint = {
        id: `${campaignAddress}_${Date.now()}`,
        tokenAddress: campaignData.tokenMint,
        price,
        volume: 0, // Will be calculated from transaction history
        solReserves: campaignData.realSolReserves,
        tokenReserves: campaignData.realTokenReserves,
        marketCap,
        timestamp: Date.now(),
        transactionSignature: '' // Will be filled from transaction context
      }

      // Store price data
      this.storePricePoint(campaignAddress, pricePoint)

      // Notify listeners
      this.notifyListeners(campaignAddress, pricePoint)

    } catch (error) {
      console.error(`Error processing campaign update for ${campaignAddress}:`, error)
    }
  }

  // Parse campaign account data (simplified - would use Anchor IDL in production)
  private parseCampaignData(data: Buffer): any {
    try {
      // This is a simplified parser - in production, use Anchor's account parsing
      // For now, return mock data structure
      return {
        virtualSolReserves: 30_000_000_000, // 30 SOL in lamports
        virtualTokenReserves: 1_073_000_000_000_000, // 1.073B tokens
        realSolReserves: Math.random() * 10_000_000_000, // Random for demo
        realTokenReserves: 800_000_000_000_000, // 800M tokens
        tokenTotalSupply: 1_000_000_000_000_000, // 1B tokens
        tokenMint: 'TokenMintAddress123...'
      }
    } catch (error) {
      console.error('Error parsing campaign data:', error)
      return null
    }
  }

  // Calculate price using bonding curve formula
  private calculatePrice(solReserves: number, tokenReserves: number): number {
    if (tokenReserves === 0) return 0
    return (solReserves / 1e9) / (tokenReserves / 1e6) // Convert to SOL and tokens
  }

  // Store price point in memory (in production, save to database)
  private storePricePoint(campaignAddress: string, pricePoint: PricePoint): void {
    if (!this.priceData.has(campaignAddress)) {
      this.priceData.set(campaignAddress, [])
    }
    
    const prices = this.priceData.get(campaignAddress)!
    prices.push(pricePoint)
    
    // Keep only last 1000 price points in memory
    if (prices.length > 1000) {
      prices.shift()
    }
  }

  // Add price update listener
  public addPriceListener(
    campaignAddress: string,
    callback: (price: PricePoint) => void
  ): void {
    if (!this.listeners.has(campaignAddress)) {
      this.listeners.set(campaignAddress, [])
    }
    this.listeners.get(campaignAddress)!.push(callback)
  }

  // Remove price update listener
  public removePriceListener(
    campaignAddress: string,
    callback: (price: PricePoint) => void
  ): void {
    const listeners = this.listeners.get(campaignAddress)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  // Notify all listeners of price update
  private notifyListeners(campaignAddress: string, pricePoint: PricePoint): void {
    const listeners = this.listeners.get(campaignAddress)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(pricePoint)
        } catch (error) {
          console.error('Error in price listener callback:', error)
        }
      })
    }
  }

  // Get historical price data
  public getHistoricalPrices(campaignAddress: string): PricePoint[] {
    return this.priceData.get(campaignAddress) || []
  }

  // Generate candlestick data from price points
  public generateCandlestickData(
    campaignAddress: string,
    interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' = '1h'
  ): CandlestickData[] {
    const prices = this.getHistoricalPrices(campaignAddress)
    if (prices.length === 0) return []

    const intervalMs = this.getIntervalMs(interval)
    const candlesticks: CandlestickData[] = []
    
    // Group prices by time interval
    const groups = new Map<number, PricePoint[]>()
    
    prices.forEach(price => {
      const timeKey = Math.floor(price.timestamp / intervalMs) * intervalMs
      if (!groups.has(timeKey)) {
        groups.set(timeKey, [])
      }
      groups.get(timeKey)!.push(price)
    })

    // Convert groups to candlestick data
    Array.from(groups.entries())
      .sort(([a], [b]) => a - b)
      .forEach(([time, groupPrices]) => {
        if (groupPrices.length === 0) return

        const prices = groupPrices.map(p => p.price).sort((a, b) => a - b)
        const volumes = groupPrices.reduce((sum, p) => sum + p.volume, 0)

        candlesticks.push({
          time,
          open: groupPrices[0].price,
          high: Math.max(...prices),
          low: Math.min(...prices),
          close: groupPrices[groupPrices.length - 1].price,
          volume: volumes
        })
      })

    return candlesticks
  }

  // Get current token metrics
  public getCurrentMetrics(campaignAddress: string): TokenMetrics | null {
    const prices = this.getHistoricalPrices(campaignAddress)
    if (prices.length === 0) return null

    const currentPrice = prices[prices.length - 1]
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    const dayPrices = prices.filter(p => p.timestamp >= oneDayAgo)
    
    const change24h = dayPrices.length > 1 
      ? ((currentPrice.price - dayPrices[0].price) / dayPrices[0].price) * 100
      : 0

    const volume24h = dayPrices.reduce((sum, p) => sum + p.volume, 0)

    return {
      currentPrice: currentPrice.price,
      change24h,
      volume24h,
      marketCap: currentPrice.marketCap,
      holders: 0, // Would need to track token holders separately
      totalSupply: 1_000_000_000 // 1B tokens
    }
  }

  // Helper function to convert interval string to milliseconds
  private getIntervalMs(interval: string): number {
    const intervals: Record<string, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    }
    return intervals[interval] || intervals['1h']
  }

  // Clean up all subscriptions
  public async cleanup(): Promise<void> {
    for (const [campaignAddress] of Array.from(this.subscriptions)) {
      await this.unsubscribeFromCampaign(campaignAddress)
    }
    this.priceData.clear()
    this.listeners.clear()
  }
}

// Singleton instance
let priceIndexerInstance: PriceIndexer | null = null

export function getPriceIndexer(connection?: Connection): PriceIndexer {
  if (!priceIndexerInstance && connection) {
    priceIndexerInstance = new PriceIndexer(connection)
  }
  if (!priceIndexerInstance) {
    throw new Error('PriceIndexer not initialized. Call with connection first.')
  }
  return priceIndexerInstance
}
// Real-time transaction monitoring and indexing for Launch.fund
import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js'
import { Program } from '@coral-xyz/anchor'

export interface TransactionEvent {
  signature: string
  campaignAddress: string
  type: 'contribution' | 'withdrawal' | 'campaign_created'
  timestamp: number
  blockTime: number
  slot: number
  user: string
  amount: number // SOL amount
  tokenAmount?: number // Token amount for contributions
  price?: number // Token price at time of transaction
  priceImpact?: number
  fee?: number
  status: 'pending' | 'confirmed' | 'failed'
}

export interface PricePoint {
  timestamp: number
  price: number
  volume: number
  marketCap: number
  txCount: number
}

export interface CampaignStats {
  totalVolume: number
  totalTransactions: number
  uniqueHolders: number
  avgTransactionSize: number
  priceHistory: PricePoint[]
  recentTransactions: TransactionEvent[]
  topHolders: Array<{ address: string; balance: number; percentage: number }>
}

export class TransactionMonitor {
  private connection: Connection
  private subscriptions: Map<string, number> = new Map()
  private eventListeners: Map<string, Set<(event: TransactionEvent) => void>> = new Map()
  private transactionCache: Map<string, TransactionEvent[]> = new Map()
  private priceCache: Map<string, PricePoint[]> = new Map()
  private updateInterval: NodeJS.Timeout | null = null

  constructor(connection: Connection) {
    this.connection = connection
    this.startPeriodicUpdates()
  }

  // Subscribe to real-time updates for a campaign
  subscribeToTransactions(campaignAddress: string, callback: (event: TransactionEvent) => void) {
    if (!this.eventListeners.has(campaignAddress)) {
      this.eventListeners.set(campaignAddress, new Set())
    }
    
    this.eventListeners.get(campaignAddress)!.add(callback)

    // Start monitoring if not already doing so
    if (!this.subscriptions.has(campaignAddress)) {
      this.startMonitoring(campaignAddress)
    }

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(campaignAddress)
      if (listeners) {
        listeners.delete(callback)
        if (listeners.size === 0) {
          this.stopMonitoring(campaignAddress)
        }
      }
    }
  }

  // Start monitoring transactions for a specific campaign
  private async startMonitoring(campaignAddress: string) {
    try {
      const publicKey = new PublicKey(campaignAddress)
      
      // Subscribe to account changes
      const subscriptionId = this.connection.onAccountChange(
        publicKey,
        (accountInfo, context) => {
          this.handleAccountChange(campaignAddress, accountInfo, context)
        },
        'confirmed'
      )

      this.subscriptions.set(campaignAddress, subscriptionId)
      
      // Load initial transaction history
      await this.loadTransactionHistory(campaignAddress)
      
      console.log(`Started monitoring transactions for campaign: ${campaignAddress}`)
    } catch (error) {
      console.error('Error starting transaction monitoring:', error)
    }
  }

  // Stop monitoring a campaign
  private async stopMonitoring(campaignAddress: string) {
    const subscriptionId = this.subscriptions.get(campaignAddress)
    if (subscriptionId) {
      await this.connection.removeAccountChangeListener(subscriptionId)
      this.subscriptions.delete(campaignAddress)
      console.log(`Stopped monitoring transactions for campaign: ${campaignAddress}`)
    }
  }

  // Handle account changes (new transactions)
  private async handleAccountChange(campaignAddress: string, accountInfo: any, context: any) {
    try {
      // Fetch recent transactions to identify the latest one
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(campaignAddress),
        { limit: 5 },
        'confirmed'
      )

      // Process new transactions
      for (const signatureInfo of signatures) {
        const existingTransactions = this.transactionCache.get(campaignAddress) || []
        const isNewTransaction = !existingTransactions.find(tx => tx.signature === signatureInfo.signature)
        
        if (isNewTransaction) {
          const transactionEvent = await this.parseTransaction(campaignAddress, signatureInfo.signature)
          if (transactionEvent) {
            this.addTransactionToCache(campaignAddress, transactionEvent)
            this.notifyListeners(campaignAddress, transactionEvent)
            this.updatePriceHistory(campaignAddress, transactionEvent)
          }
        }
      }
    } catch (error) {
      console.error('Error handling account change:', error)
    }
  }

  // Load historical transactions for a campaign
  private async loadTransactionHistory(campaignAddress: string, limit: number = 50) {
    try {
      const publicKey = new PublicKey(campaignAddress)
      const signatures = await this.connection.getSignaturesForAddress(
        publicKey,
        { limit },
        'confirmed'
      )

      const transactions: TransactionEvent[] = []

      for (const signatureInfo of signatures) {
        const transactionEvent = await this.parseTransaction(campaignAddress, signatureInfo.signature)
        if (transactionEvent) {
          transactions.push(transactionEvent)
        }
      }

      // Sort by timestamp (newest first)
      transactions.sort((a, b) => b.timestamp - a.timestamp)
      this.transactionCache.set(campaignAddress, transactions)
      
      // Build initial price history
      this.buildPriceHistory(campaignAddress, transactions)
      
      console.log(`Loaded ${transactions.length} historical transactions for ${campaignAddress}`)
    } catch (error) {
      console.error('Error loading transaction history:', error)
    }
  }

  // Parse a transaction to extract relevant information
  private async parseTransaction(campaignAddress: string, signature: string): Promise<TransactionEvent | null> {
    try {
      const transaction = await this.connection.getParsedTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      })

      if (!transaction || !transaction.blockTime) return null

      // Extract basic information
      const blockTime = transaction.blockTime * 1000 // Convert to milliseconds
      const slot = transaction.slot

      // Parse transaction instructions to determine type and amounts
      const instructions = transaction.transaction.message.instructions
      let transactionType: 'contribution' | 'withdrawal' | 'campaign_created' = 'contribution'
      let user = ''
      let solAmount = 0
      let tokenAmount = 0

      // Analyze transaction for our program interactions
      for (const instruction of instructions) {
        if ('program' in instruction) {
          // Look for SOL transfers (contributions)
          if (instruction.program === 'system') {
            const parsed = instruction.parsed
            if (parsed?.type === 'transfer') {
              const info = parsed.info
              solAmount = (info.lamports || 0) / 1e9 // Convert lamports to SOL
              user = info.source || ''
              
              // Check if this is a contribution (transfer TO campaign account)
              if (info.destination === campaignAddress) {
                transactionType = 'contribution'
              } else if (info.source === campaignAddress) {
                transactionType = 'withdrawal'
                user = info.destination || ''
              }
            }
          }
        }
      }

      // Skip if no relevant transaction found
      if (solAmount === 0) return null

      // Calculate approximate token amount and price for contributions
      if (transactionType === 'contribution') {
        // This would need to be calculated based on the bonding curve at the time
        // For now, using a simple estimation
        tokenAmount = solAmount * 1_000_000 // Rough estimation
      }

      return {
        signature,
        campaignAddress,
        type: transactionType,
        timestamp: Date.now(),
        blockTime,
        slot,
        user,
        amount: solAmount,
        tokenAmount: transactionType === 'contribution' ? tokenAmount : undefined,
        price: transactionType === 'contribution' ? solAmount / tokenAmount : undefined,
        status: 'confirmed'
      }
    } catch (error) {
      console.error('Error parsing transaction:', error)
      return null
    }
  }

  // Add transaction to cache
  private addTransactionToCache(campaignAddress: string, transaction: TransactionEvent) {
    const transactions = this.transactionCache.get(campaignAddress) || []
    transactions.unshift(transaction) // Add to beginning (newest first)
    
    // Keep only last 100 transactions
    if (transactions.length > 100) {
      transactions.splice(100)
    }
    
    this.transactionCache.set(campaignAddress, transactions)
  }

  // Notify all listeners of new transaction
  private notifyListeners(campaignAddress: string, transaction: TransactionEvent) {
    const listeners = this.eventListeners.get(campaignAddress)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(transaction)
        } catch (error) {
          console.error('Error in transaction listener:', error)
        }
      })
    }
  }

  // Update price history with new transaction
  private updatePriceHistory(campaignAddress: string, transaction: TransactionEvent) {
    if (transaction.type !== 'contribution' || !transaction.price) return

    const priceHistory = this.priceCache.get(campaignAddress) || []
    const timestamp = transaction.blockTime
    
    // Check if we already have a price point for this time period (group by hour)
    const hourTimestamp = Math.floor(timestamp / (60 * 60 * 1000)) * (60 * 60 * 1000)
    const existingPoint = priceHistory.find(p => 
      Math.floor(p.timestamp / (60 * 60 * 1000)) * (60 * 60 * 1000) === hourTimestamp
    )

    if (existingPoint) {
      // Update existing point
      existingPoint.volume += transaction.amount
      existingPoint.txCount += 1
      existingPoint.price = transaction.price // Use latest price
    } else {
      // Create new price point
      priceHistory.push({
        timestamp: hourTimestamp,
        price: transaction.price,
        volume: transaction.amount,
        marketCap: transaction.price * 1_000_000_000, // Estimate
        txCount: 1
      })
    }

    // Sort by timestamp and keep last 168 hours (7 days)
    priceHistory.sort((a, b) => a.timestamp - b.timestamp)
    if (priceHistory.length > 168) {
      priceHistory.splice(0, priceHistory.length - 168)
    }

    this.priceCache.set(campaignAddress, priceHistory)
  }

  // Build initial price history from transaction data
  private buildPriceHistory(campaignAddress: string, transactions: TransactionEvent[]) {
    const pricePoints: Map<number, PricePoint> = new Map()

    // Group transactions by hour and build price points
    for (const tx of transactions.reverse()) { // Process oldest first
      if (tx.type === 'contribution' && tx.price) {
        const hourTimestamp = Math.floor(tx.blockTime / (60 * 60 * 1000)) * (60 * 60 * 1000)
        
        const existing = pricePoints.get(hourTimestamp)
        if (existing) {
          existing.volume += tx.amount
          existing.txCount += 1
          existing.price = tx.price // Use latest price in hour
        } else {
          pricePoints.set(hourTimestamp, {
            timestamp: hourTimestamp,
            price: tx.price,
            volume: tx.amount,
            marketCap: tx.price * 1_000_000_000,
            txCount: 1
          })
        }
      }
    }

    const priceHistory = Array.from(pricePoints.values())
      .sort((a, b) => a.timestamp - b.timestamp)
    
    this.priceCache.set(campaignAddress, priceHistory)
  }

  // Get transactions for a campaign
  getTransactions(campaignAddress: string): TransactionEvent[] {
    return this.transactionCache.get(campaignAddress) || []
  }

  // Get price history for a campaign
  getPriceHistory(campaignAddress: string): PricePoint[] {
    return this.priceCache.get(campaignAddress) || []
  }

  // Get campaign statistics
  getCampaignStats(campaignAddress: string): CampaignStats {
    const transactions = this.getTransactions(campaignAddress)
    const priceHistory = this.getPriceHistory(campaignAddress)
    
    const contributions = transactions.filter(tx => tx.type === 'contribution')
    const totalVolume = contributions.reduce((sum, tx) => sum + tx.amount, 0)
    const uniqueUsers = new Set(contributions.map(tx => tx.user))
    
    return {
      totalVolume,
      totalTransactions: transactions.length,
      uniqueHolders: uniqueUsers.size,
      avgTransactionSize: contributions.length > 0 ? totalVolume / contributions.length : 0,
      priceHistory,
      recentTransactions: transactions.slice(0, 10),
      topHolders: [] // Would need to query token accounts for this
    }
  }

  // Start periodic updates (reduced to every 5 minutes to prevent rate limiting)
  private startPeriodicUpdates() {
    this.updateInterval = setInterval(() => {
      // Refresh data for all monitored campaigns
      for (const campaignAddress of Array.from(this.subscriptions.keys())) {
        this.refreshCampaignData(campaignAddress)
      }
    }, 300000) // 5 minutes (reduced from 30 seconds)
  }

  // Refresh campaign data
  private async refreshCampaignData(campaignAddress: string) {
    try {
      // Load recent transactions to catch any missed updates
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(campaignAddress),
        { limit: 5 },
        'confirmed'
      )

      for (const signatureInfo of signatures) {
        const existingTransactions = this.transactionCache.get(campaignAddress) || []
        const isNewTransaction = !existingTransactions.find(tx => tx.signature === signatureInfo.signature)
        
        if (isNewTransaction) {
          const transactionEvent = await this.parseTransaction(campaignAddress, signatureInfo.signature)
          if (transactionEvent) {
            this.addTransactionToCache(campaignAddress, transactionEvent)
            this.notifyListeners(campaignAddress, transactionEvent)
            this.updatePriceHistory(campaignAddress, transactionEvent)
          }
        }
      }
    } catch (error) {
      console.error(`Error refreshing data for ${campaignAddress}:`, error)
    }
  }

  // Cleanup
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }
    
    // Unsubscribe from all account changes
    for (const [campaignAddress, subscriptionId] of Array.from(this.subscriptions)) {
      this.connection.removeAccountChangeListener(subscriptionId)
    }
    
    this.subscriptions.clear()
    this.eventListeners.clear()
    this.transactionCache.clear()
    this.priceCache.clear()
  }
}

// Singleton instance
let transactionMonitor: TransactionMonitor | null = null

export function getTransactionMonitor(connection: Connection): TransactionMonitor {
  if (!transactionMonitor) {
    transactionMonitor = new TransactionMonitor(connection)
  }
  return transactionMonitor
}
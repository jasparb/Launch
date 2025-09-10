// Automated graduation service for token graduation to DEX pools
import { Connection, PublicKey } from '@solana/web3.js'
import { createBondingCurve } from './bondingCurve'
import { DEXIntegration, GraduationResult } from './dexIntegration'
import { getTransactionMonitor } from './transactionMonitor'

export interface GraduationEvent {
  campaignAddress: string
  tokenMint: string
  tokenSymbol: string
  marketCapAtGraduation: number
  totalSolRaised: number
  timestamp: number
  dex: 'raydium' | 'orca'
  poolAddress?: string
  lpTokens?: number
  initialTVL?: number
  graduationTx?: string
}

export interface GraduationAlert {
  campaignAddress: string
  currentMarketCap: number
  threshold: number
  progressPercent: number
  estimatedTime?: number
  message: string
  type: 'approaching' | 'ready' | 'completed'
}

export class GraduationService {
  private connection: Connection
  private dexIntegration: DEXIntegration
  private graduationThreshold = 69000 // $69k USD
  private monitoredCampaigns = new Map<string, boolean>()
  private graduationEvents: GraduationEvent[] = []
  private graduationCallbacks = new Map<string, Set<(event: GraduationEvent) => void>>()
  private alertCallbacks = new Map<string, Set<(alert: GraduationAlert) => void>>()

  constructor(connection: Connection, wallet: any) {
    this.connection = connection
    this.dexIntegration = new DEXIntegration(connection, wallet)
  }

  // Start monitoring a campaign for graduation
  startMonitoring(campaignAddress: string, tokenMint: string, tokenSymbol: string) {
    if (this.monitoredCampaigns.has(campaignAddress)) {
      return // Already monitoring
    }

    this.monitoredCampaigns.set(campaignAddress, true)
    console.log(`Started graduation monitoring for ${tokenSymbol} (${campaignAddress})`)

    // Set up transaction monitoring to track market cap changes
    const monitor = getTransactionMonitor(this.connection)
    monitor.subscribeToTransactions(campaignAddress, async (transaction) => {
      await this.checkGraduationStatus(campaignAddress, tokenMint, tokenSymbol)
    })

    // Initial check
    this.checkGraduationStatus(campaignAddress, tokenMint, tokenSymbol)
  }

  // Stop monitoring a campaign
  stopMonitoring(campaignAddress: string) {
    this.monitoredCampaigns.delete(campaignAddress)
    this.graduationCallbacks.delete(campaignAddress)
    this.alertCallbacks.delete(campaignAddress)
    console.log(`Stopped graduation monitoring for ${campaignAddress}`)
  }

  // Subscribe to graduation events
  onGraduation(campaignAddress: string, callback: (event: GraduationEvent) => void): () => void {
    if (!this.graduationCallbacks.has(campaignAddress)) {
      this.graduationCallbacks.set(campaignAddress, new Set())
    }
    this.graduationCallbacks.get(campaignAddress)!.add(callback)

    return () => {
      const callbacks = this.graduationCallbacks.get(campaignAddress)
      if (callbacks) {
        callbacks.delete(callback)
        if (callbacks.size === 0) {
          this.graduationCallbacks.delete(campaignAddress)
        }
      }
    }
  }

  // Subscribe to graduation alerts
  onAlert(campaignAddress: string, callback: (alert: GraduationAlert) => void): () => void {
    if (!this.alertCallbacks.has(campaignAddress)) {
      this.alertCallbacks.set(campaignAddress, new Set())
    }
    this.alertCallbacks.get(campaignAddress)!.add(callback)

    return () => {
      const callbacks = this.alertCallbacks.get(campaignAddress)
      if (callbacks) {
        callbacks.delete(callback)
        if (callbacks.size === 0) {
          this.alertCallbacks.delete(campaignAddress)
        }
      }
    }
  }

  // Check graduation status for a campaign
  private async checkGraduationStatus(
    campaignAddress: string, 
    tokenMint: string, 
    tokenSymbol: string
  ) {
    try {
      // Get current campaign state
      const monitor = getTransactionMonitor(this.connection)
      const transactions = monitor.getTransactions(campaignAddress)
      
      if (transactions.length === 0) return

      // Calculate current market cap
      const contributions = transactions.filter(tx => tx.type === 'contribution')
      const totalSolRaised = contributions.reduce((sum, tx) => sum + tx.amount, 0)
      
      // Create bonding curve to get market cap
      const curve = createBondingCurve(totalSolRaised, 0)
      const curveState = curve.getCurveState()
      const currentMarketCap = curveState.marketCap

      // Check if ready for graduation
      const isReady = currentMarketCap >= this.graduationThreshold
      const progressPercent = (currentMarketCap / this.graduationThreshold) * 100

      // Generate alerts
      this.generateAlerts(campaignAddress, currentMarketCap, progressPercent)

      // If ready and not already graduated, trigger graduation
      if (isReady && !this.hasGraduated(campaignAddress)) {
        await this.executeGraduation(
          campaignAddress,
          tokenMint,
          tokenSymbol,
          currentMarketCap,
          totalSolRaised
        )
      }
    } catch (error) {
      console.error(`Error checking graduation status for ${campaignAddress}:`, error)
    }
  }

  // Generate graduation alerts
  private generateAlerts(campaignAddress: string, currentMarketCap: number, progressPercent: number) {
    const callbacks = this.alertCallbacks.get(campaignAddress)
    if (!callbacks || callbacks.size === 0) return

    let alert: GraduationAlert | null = null

    if (progressPercent >= 100) {
      alert = {
        campaignAddress,
        currentMarketCap,
        threshold: this.graduationThreshold,
        progressPercent,
        message: '🎉 Token is ready for DEX graduation!',
        type: 'ready'
      }
    } else if (progressPercent >= 90) {
      const remaining = this.graduationThreshold - currentMarketCap
      alert = {
        campaignAddress,
        currentMarketCap,
        threshold: this.graduationThreshold,
        progressPercent,
        message: `🔥 Almost there! Only $${remaining.toLocaleString()} away from graduation`,
        type: 'approaching'
      }
    } else if (progressPercent >= 80) {
      alert = {
        campaignAddress,
        currentMarketCap,
        threshold: this.graduationThreshold,
        progressPercent,
        message: '🚀 Token gaining momentum toward graduation',
        type: 'approaching'
      }
    }

    if (alert) {
      callbacks.forEach(callback => {
        try {
          callback(alert!)
        } catch (error) {
          console.error('Error in graduation alert callback:', error)
        }
      })
    }
  }

  // Execute automatic graduation
  private async executeGraduation(
    campaignAddress: string,
    tokenMint: string,
    tokenSymbol: string,
    marketCap: number,
    totalSolRaised: number
  ): Promise<void> {
    try {
      console.log(`Executing automatic graduation for ${tokenSymbol}...`)

      // Get best DEX for graduation
      const bestDEX = await this.dexIntegration.getBestDEXForGraduation(tokenMint)
      
      // Calculate liquidity allocation
      const curve = createBondingCurve(totalSolRaised, 0)
      const liquidityAllocation = curve.getGraduationLiquidity()

      // Execute graduation
      const result = await this.dexIntegration.graduateToPool(
        tokenMint,
        liquidityAllocation.tokensForLiquidity,
        liquidityAllocation.solForLiquidity,
        bestDEX
      )

      if (result.success) {
        // Create graduation event
        const graduationEvent: GraduationEvent = {
          campaignAddress,
          tokenMint,
          tokenSymbol,
          marketCapAtGraduation: marketCap,
          totalSolRaised,
          timestamp: Date.now(),
          dex: bestDEX,
          poolAddress: result.poolAddress,
          lpTokens: result.lpTokens,
          initialTVL: result.initialTVL,
          graduationTx: result.signature
        }

        // Store graduation event
        this.graduationEvents.push(graduationEvent)

        // Notify callbacks
        const callbacks = this.graduationCallbacks.get(campaignAddress)
        if (callbacks) {
          callbacks.forEach(callback => {
            try {
              callback(graduationEvent)
            } catch (error) {
              console.error('Error in graduation callback:', error)
            }
          })
        }

        // Generate completion alert
        const completionAlert: GraduationAlert = {
          campaignAddress,
          currentMarketCap: marketCap,
          threshold: this.graduationThreshold,
          progressPercent: 100,
          message: `🎓 ${tokenSymbol} successfully graduated to ${bestDEX.toUpperCase()}!`,
          type: 'completed'
        }

        const alertCallbacks = this.alertCallbacks.get(campaignAddress)
        if (alertCallbacks) {
          alertCallbacks.forEach(callback => {
            try {
              callback(completionAlert)
            } catch (error) {
              console.error('Error in completion alert callback:', error)
            }
          })
        }

        console.log(`✅ Graduation completed for ${tokenSymbol}`)
        console.log(`Pool Address: ${result.poolAddress}`)
        console.log(`Transaction: ${result.signature}`)

      } else {
        console.error(`❌ Graduation failed for ${tokenSymbol}:`, result.error)
      }
    } catch (error) {
      console.error(`Error executing graduation for ${tokenSymbol}:`, error)
    }
  }

  // Check if a campaign has already graduated
  private hasGraduated(campaignAddress: string): boolean {
    return this.graduationEvents.some(event => event.campaignAddress === campaignAddress)
  }

  // Get graduation history
  getGraduationHistory(): GraduationEvent[] {
    return [...this.graduationEvents].sort((a, b) => b.timestamp - a.timestamp)
  }

  // Get graduation event for specific campaign
  getGraduationEvent(campaignAddress: string): GraduationEvent | null {
    return this.graduationEvents.find(event => event.campaignAddress === campaignAddress) || null
  }

  // Calculate estimated graduation time based on current trend
  estimateGraduationTime(campaignAddress: string): number | null {
    try {
      const monitor = getTransactionMonitor(this.connection)
      const transactions = monitor.getTransactions(campaignAddress)
      
      if (transactions.length < 10) return null // Need more data

      // Get recent transactions (last 24 hours)
      const now = Date.now()
      const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000)
      const recentTxs = transactions.filter(tx => 
        tx.blockTime >= twentyFourHoursAgo && tx.type === 'contribution'
      )

      if (recentTxs.length === 0) return null

      // Calculate growth rate
      const recentVolume = recentTxs.reduce((sum, tx) => sum + tx.amount, 0)
      const totalVolume = transactions
        .filter(tx => tx.type === 'contribution')
        .reduce((sum, tx) => sum + tx.amount, 0)

      const curve = createBondingCurve(totalVolume, 0)
      const currentMarketCap = curve.getCurveState().marketCap

      const remaining = this.graduationThreshold - currentMarketCap
      if (remaining <= 0) return 0

      // Estimate based on recent growth rate
      const dailyGrowthRate = recentVolume * 150 // Approximate USD conversion
      if (dailyGrowthRate <= 0) return null

      const daysToGraduation = remaining / dailyGrowthRate
      return Math.max(0, daysToGraduation * 24 * 60 * 60 * 1000) // Convert to milliseconds
    } catch (error) {
      console.error('Error estimating graduation time:', error)
      return null
    }
  }

  // Get platform graduation statistics
  getPlatformStats(): {
    totalGraduations: number
    totalTVLCreated: number
    averageTimeToGraduation: number
    graduationsByDEX: { raydium: number; orca: number }
    averageMarketCapAtGraduation: number
  } {
    const graduations = this.graduationEvents

    const totalTVLCreated = graduations.reduce((sum, event) => 
      sum + (event.initialTVL || 0), 0
    )

    const graduationsByDEX = graduations.reduce((acc, event) => {
      acc[event.dex] = (acc[event.dex] || 0) + 1
      return acc
    }, { raydium: 0, orca: 0 } as { raydium: number; orca: number })

    const averageMarketCap = graduations.length > 0 
      ? graduations.reduce((sum, event) => sum + event.marketCapAtGraduation, 0) / graduations.length
      : 0

    return {
      totalGraduations: graduations.length,
      totalTVLCreated,
      averageTimeToGraduation: 0, // Would need campaign creation timestamps to calculate
      graduationsByDEX,
      averageMarketCapAtGraduation: averageMarketCap
    }
  }

  // Manual graduation trigger (for admin/creator use)
  async manualGraduation(
    campaignAddress: string,
    tokenMint: string,
    tokenSymbol: string,
    preferredDEX?: 'raydium' | 'orca'
  ): Promise<GraduationResult> {
    try {
      // Check if eligible
      const monitor = getTransactionMonitor(this.connection)
      const transactions = monitor.getTransactions(campaignAddress)
      const contributions = transactions.filter(tx => tx.type === 'contribution')
      const totalSolRaised = contributions.reduce((sum, tx) => sum + tx.amount, 0)
      
      const curve = createBondingCurve(totalSolRaised, 0)
      const currentMarketCap = curve.getCurveState().marketCap

      if (currentMarketCap < this.graduationThreshold) {
        return {
          success: false,
          error: `Market cap ($${currentMarketCap.toLocaleString()}) below graduation threshold ($${this.graduationThreshold.toLocaleString()})`
        }
      }

      // Use preferred DEX or auto-select
      const dex = preferredDEX || await this.dexIntegration.getBestDEXForGraduation(tokenMint)
      
      // Execute graduation
      const liquidityAllocation = curve.getGraduationLiquidity()
      return await this.dexIntegration.graduateToPool(
        tokenMint,
        liquidityAllocation.tokensForLiquidity,
        liquidityAllocation.solForLiquidity,
        dex
      )
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Manual graduation failed'
      }
    }
  }
}

// Singleton instance
let graduationService: GraduationService | null = null

export function getGraduationService(connection: Connection, wallet: any): GraduationService {
  if (!graduationService) {
    graduationService = new GraduationService(connection, wallet)
  }
  return graduationService
}
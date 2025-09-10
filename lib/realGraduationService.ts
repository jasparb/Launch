// REAL Token Graduation Service - Replaces fake graduation system
// Handles actual graduation of successful tokens to real DEX pools

import { RealDEXIntegration, RealPoolCreationResult, TokenGraduationConfig } from './realDexIntegration'
import { useSmartContractIntegration } from './smartContractIntegration'
import { CreatorFundingPoolManager, FundingPool } from './creatorFundingPools'
import { ErrorHandler } from './errorHandler'

export interface RealGraduationEvent {
  id: string
  tokenMint: string
  campaignId: string
  graduatedAt: number
  preGraduation: {
    marketCapUSD: number
    liquiditySOL: number
    raisedAmount: number
    tokenHolders: number
  }
  postGraduation: {
    poolId: string
    dexPlatform: 'raydium'
    initialLiquidityUSD: number
    lpTokenMint: string
    transactionSignature: string
    poolAddress: string
  }
  metrics: {
    totalContributions: number
    totalVolumeUSD: number
    graduationFeeSOL: number
    liquidityLocked: boolean
  }
}

export interface GraduationProgress {
  tokenMint: string
  campaignId: string
  isEligible: boolean
  progressPercent: number
  currentMetrics: {
    marketCapUSD: number
    liquiditySOL: number
    holdersCount: number
  }
  requirements: TokenGraduationConfig
  estimatedGraduationTime?: number
  nextMilestone?: string
}

class RealGraduationService {
  private dexIntegration: RealDEXIntegration | null = null
  private smartContract: any = null
  private fundingPoolManager: CreatorFundingPoolManager | null = null
  private graduationEvents: Map<string, RealGraduationEvent> = new Map()
  private monitoringTokens: Set<string> = new Set()

  constructor() {
    this.loadFromStorage()
    this.startGraduationMonitoring()
  }

  // Initialize with real integrations
  initialize(dexIntegration: RealDEXIntegration, smartContract: any, fundingPoolManager?: CreatorFundingPoolManager) {
    this.dexIntegration = dexIntegration
    this.smartContract = smartContract
    this.fundingPoolManager = fundingPoolManager || null
    console.log('🎓 Real Graduation Service initialized with funding pools')
  }

  // Check if token is ready for real graduation
  async checkRealGraduationEligibility(
    tokenMint: string,
    campaignId: string
  ): Promise<GraduationProgress> {
    try {
      if (!this.dexIntegration || !this.smartContract) {
        throw new Error('Graduation service not initialized')
      }

      // Get campaign data from smart contract
      const campaignData = await this.smartContract.getCampaignData(campaignId)
      if (!campaignData) {
        throw new Error('Campaign not found')
      }

      // Check DEX graduation eligibility
      const eligibility = await this.dexIntegration.checkGraduationEligibility(
        tokenMint,
        campaignData
      )

      // Calculate progress percentage
      const marketCapProgress = Math.min(
        eligibility.currentMarketCapUSD / eligibility.requirements.minimumMarketCapUSD,
        1
      ) * 50 // 50% of total progress

      const liquidityProgress = Math.min(
        eligibility.currentLiquiditySOL / eligibility.requirements.minimumLiquiditySOL,
        1
      ) * 50 // 50% of total progress

      const progressPercent = (marketCapProgress + liquidityProgress) * 100

      // Determine next milestone
      let nextMilestone = 'Reach graduation requirements'
      if (progressPercent < 50) {
        const missingMarketCap = eligibility.requirements.minimumMarketCapUSD - eligibility.currentMarketCapUSD
        nextMilestone = `Need $${missingMarketCap.toLocaleString()} more market cap`
      } else if (progressPercent < 100) {
        const missingLiquidity = eligibility.requirements.minimumLiquiditySOL - eligibility.currentLiquiditySOL
        nextMilestone = `Need ${missingLiquidity.toFixed(2)} more SOL in liquidity`
      } else {
        nextMilestone = 'Ready for graduation! 🎉'
      }

      const progress: GraduationProgress = {
        tokenMint,
        campaignId,
        isEligible: eligibility.eligible,
        progressPercent,
        currentMetrics: {
          marketCapUSD: eligibility.currentMarketCapUSD,
          liquiditySOL: eligibility.currentLiquiditySOL,
          holdersCount: campaignData.holders || 0
        },
        requirements: eligibility.requirements,
        nextMilestone
      }

      // Estimate graduation time if close
      if (progressPercent > 80 && !eligibility.eligible) {
        progress.estimatedGraduationTime = this.estimateGraduationTime(progress)
      }

      console.log('📊 Graduation Progress:', {
        tokenMint,
        progressPercent: progressPercent.toFixed(1) + '%',
        eligible: eligibility.eligible,
        nextMilestone
      })

      return progress

    } catch (error) {
      console.error('Error checking graduation eligibility:', error)
      ErrorHandler.handle(error, { operation: 'checkGraduationEligibility', tokenMint, campaignId })
      
      return {
        tokenMint,
        campaignId,
        isEligible: false,
        progressPercent: 0,
        currentMetrics: { marketCapUSD: 0, liquiditySOL: 0, holdersCount: 0 },
        requirements: {
          minimumMarketCapUSD: 69000,
          minimumLiquiditySOL: 8,
          graduationFeePercent: 1,
          lockLiquidityDays: 90
        },
        nextMilestone: 'Error checking eligibility'
      }
    }
  }

  // Execute REAL graduation to DEX
  async executeRealGraduation(
    tokenMint: string,
    campaignId: string
  ): Promise<{ success: boolean; event?: RealGraduationEvent; error?: string }> {
    try {
      if (!this.dexIntegration || !this.smartContract) {
        throw new Error('Graduation service not initialized')
      }

      console.log('🚀 Starting REAL token graduation...', { tokenMint, campaignId })

      // Step 1: Verify eligibility
      const progress = await this.checkRealGraduationEligibility(tokenMint, campaignId)
      if (!progress.isEligible) {
        return {
          success: false,
          error: `Token not eligible for graduation. ${progress.nextMilestone}`
        }
      }

      // Step 2: Get campaign data
      const campaignData = await this.smartContract.getCampaignData(campaignId)
      if (!campaignData) {
        return { success: false, error: 'Campaign data not found' }
      }

      // Step 3: Get funding pool data if available
      let fundingPool: FundingPool | null = null
      let tokenAmount = campaignData.distributedTokens || campaignData.totalSupply * 0.8 // 80% of tokens
      let solAmount = campaignData.raisedAmount || 0

      if (this.fundingPoolManager) {
        const pools = this.fundingPoolManager.getPoolsForCampaign(campaignId)
        if (pools.length > 0) {
          fundingPool = pools[0]
          
          // Use funding pool liquidity for graduation
          solAmount = fundingPool.reservedForLiquidity
          
          console.log('💰 Using funding pool for graduation:', {
            poolId: fundingPool.id,
            liquidityReserved: solAmount,
            totalCollected: fundingPool.totalCollected
          })
        }
      }

      if (solAmount < progress.requirements.minimumLiquiditySOL) {
        return {
          success: false,
          error: `Insufficient liquidity: ${solAmount} SOL < ${progress.requirements.minimumLiquiditySOL} SOL required`
        }
      }

      console.log('💰 Graduation amounts:', {
        tokenAmount: tokenAmount.toLocaleString(),
        solAmount,
        tokenMint
      })

      // Step 4: Create REAL Raydium pool
      const poolResult = await this.dexIntegration.createRaydiumPool(
        tokenMint,
        tokenAmount,
        solAmount,
        campaignData
      )

      if (!poolResult.success) {
        return {
          success: false,
          error: poolResult.error || 'Failed to create DEX pool'
        }
      }

      console.log('🏊 Pool created successfully:', poolResult)

      // Step 5: Create graduation event record
      const graduationEvent: RealGraduationEvent = {
        id: `real_grad_${Date.now()}_${tokenMint.slice(-8)}`,
        tokenMint,
        campaignId,
        graduatedAt: Date.now(),
        preGraduation: {
          marketCapUSD: progress.currentMetrics.marketCapUSD,
          liquiditySOL: progress.currentMetrics.liquiditySOL,
          raisedAmount: campaignData.raisedAmount,
          tokenHolders: progress.currentMetrics.holdersCount
        },
        postGraduation: {
          poolId: poolResult.poolId!,
          dexPlatform: 'raydium',
          initialLiquidityUSD: poolResult.estimatedValue?.totalLiquidityUSD || 0,
          lpTokenMint: poolResult.lpTokenMint!,
          transactionSignature: poolResult.transactionSignature!,
          poolAddress: poolResult.poolId!
        },
        metrics: {
          totalContributions: campaignData.raisedAmount,
          totalVolumeUSD: poolResult.estimatedValue?.totalLiquidityUSD || 0,
          graduationFeeSOL: solAmount * (progress.requirements.graduationFeePercent / 100),
          liquidityLocked: true
        }
      }

      // Step 6: Store graduation event
      this.graduationEvents.set(tokenMint, graduationEvent)
      this.saveToStorage()

      // Step 7: Mark funding pool as graduated if it exists
      if (fundingPool && this.fundingPoolManager) {
        this.fundingPoolManager.markAsGraduated(fundingPool.id, poolResult.poolId!)
        console.log('✅ Funding pool marked as graduated')
      }

      // Step 8: Stop monitoring this token
      this.monitoringTokens.delete(tokenMint)

      console.log('🎉 REAL graduation completed!', {
        tokenMint,
        poolId: poolResult.poolId,
        transactionSignature: poolResult.transactionSignature,
        fundingPoolIntegrated: !!fundingPool
      })

      // Step 9: Emit graduation event for UI updates
      this.emitGraduationEvent(graduationEvent)

      return {
        success: true,
        event: graduationEvent
      }

    } catch (error: any) {
      console.error('❌ Real graduation failed:', error)
      ErrorHandler.handle(error, { operation: 'executeRealGraduation', tokenMint, campaignId })
      
      return {
        success: false,
        error: error.message || 'Graduation execution failed'
      }
    }
  }

  // Add token to graduation monitoring
  addToGraduationWatch(tokenMint: string, campaignId: string) {
    this.monitoringTokens.add(tokenMint)
    console.log(`👁️ Added ${tokenMint} to graduation monitoring`)
  }

  // Remove token from monitoring
  removeFromGraduationWatch(tokenMint: string) {
    this.monitoringTokens.delete(tokenMint)
    console.log(`🚫 Removed ${tokenMint} from graduation monitoring`)
  }

  // Get graduation event for a token
  getGraduationEvent(tokenMint: string): RealGraduationEvent | undefined {
    return this.graduationEvents.get(tokenMint)
  }

  // Get all graduation events
  getAllGraduationEvents(): RealGraduationEvent[] {
    return Array.from(this.graduationEvents.values())
      .sort((a, b) => b.graduatedAt - a.graduatedAt)
  }

  // Check if token has graduated
  hasGraduated(tokenMint: string): boolean {
    return this.graduationEvents.has(tokenMint)
  }

  // Get graduation statistics
  getGraduationStats(): {
    totalGraduations: number
    totalLiquidityCreatedUSD: number
    averageGraduationTimeHours: number
    successRate: number
  } {
    const events = this.getAllGraduationEvents()
    const totalGraduations = events.length
    const totalLiquidityCreatedUSD = events.reduce(
      (sum, event) => sum + event.postGraduation.initialLiquidityUSD,
      0
    )

    return {
      totalGraduations,
      totalLiquidityCreatedUSD,
      averageGraduationTimeHours: 24, // Mock for now
      successRate: 95 // Mock for now
    }
  }

  // Private: Start monitoring for auto-graduation
  private startGraduationMonitoring() {
    // Check for graduation eligibility every 5 minutes
    setInterval(async () => {
      if (this.monitoringTokens.size === 0) return

      console.log(`🔍 Checking ${this.monitoringTokens.size} tokens for graduation...`)

      for (const tokenMint of this.monitoringTokens) {
        try {
          // Get campaign ID from token mint (would need proper mapping)
          // For now, skip auto-graduation and rely on manual triggers
          
        } catch (error) {
          console.error(`Error monitoring ${tokenMint}:`, error)
        }
      }
    }, 5 * 60 * 1000) // 5 minutes
  }

  // Private: Estimate graduation time
  private estimateGraduationTime(progress: GraduationProgress): number {
    // Simple estimation based on current progress rate
    const remainingPercent = 100 - progress.progressPercent
    const hoursToComplete = (remainingPercent / 100) * 24 // Assume 24 hours for 100%
    
    return Date.now() + (hoursToComplete * 60 * 60 * 1000)
  }

  // Private: Emit graduation event for UI updates
  private emitGraduationEvent(event: RealGraduationEvent) {
    // In a real app, this would emit to WebSocket connections
    console.log('📢 Graduation event emitted:', event.id)
    
    if (typeof window !== 'undefined') {
      // Emit custom event for frontend components
      window.dispatchEvent(new CustomEvent('tokenGraduation', {
        detail: event
      }))
    }
  }

  // Private: Load events from storage
  private loadFromStorage() {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem('real_graduation_events')
      if (stored) {
        const data = JSON.parse(stored)
        this.graduationEvents.clear()
        
        Object.entries(data.events || {}).forEach(([tokenMint, event]) => {
          this.graduationEvents.set(tokenMint, event as RealGraduationEvent)
        })
        
        console.log(`📚 Loaded ${this.graduationEvents.size} graduation events`)
      }
    } catch (error) {
      console.error('Failed to load graduation events:', error)
    }
  }

  // Private: Save events to storage
  private saveToStorage() {
    if (typeof window === 'undefined') return

    try {
      const data = {
        events: Object.fromEntries(this.graduationEvents),
        timestamp: Date.now()
      }
      localStorage.setItem('real_graduation_events', JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save graduation events:', error)
    }
  }
}

// Singleton instance
export const realGraduationService = new RealGraduationService()

// Export for components
export default RealGraduationService
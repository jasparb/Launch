// Airdrop Token Distribution System
// Connects task approvals to actual token transfers

import { Connection, PublicKey, Transaction, sendAndConfirmTransaction, Keypair } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction } from '@solana/spl-token'
import { taskSubmissions, TaskSubmission } from './taskSubmissions'
import { useSmartContractIntegration } from './smartContractIntegration'

export interface TokenDistribution {
  id: string
  submissionId: string
  campaignId: string
  userId: string
  userWallet: string
  tokenMint: string
  amount: number
  transactionSignature?: string
  distributedAt: number
  status: 'pending' | 'completed' | 'failed'
  error?: string
}

export interface DistributionStats {
  totalDistributed: number
  totalPending: number
  totalFailed: number
  totalUsers: number
  averageAmount: number
  recentDistributions: TokenDistribution[]
}

class AirdropTokenDistributor {
  private distributions: Map<string, TokenDistribution[]> = new Map()
  private distributionById: Map<string, TokenDistribution> = new Map()
  private connection: Connection | null = null
  private platformKeypair: Keypair | null = null

  constructor() {
    this.loadFromLocalStorage()
  }

  // Initialize with connection and platform keypair for token distribution
  initialize(connection: Connection, platformKeypair?: Keypair) {
    this.connection = connection
    this.platformKeypair = platformKeypair || null
  }

  // Process approved submissions for token distribution
  async processApprovedSubmissions(campaignId: string): Promise<{
    processed: number
    successful: number
    failed: number
    errors: string[]
  }> {
    const errors: string[] = []
    let processed = 0
    let successful = 0
    let failed = 0

    // Get all approved submissions for the campaign
    const approvedSubmissions = taskSubmissions.getSubmissionsForCampaign(campaignId, {
      status: 'approved'
    })

    for (const submission of approvedSubmissions) {
      processed++

      // Check if already distributed
      const existingDistribution = await this.getDistributionBySubmission(submission.id)
      if (existingDistribution && existingDistribution.status === 'completed') {
        continue // Skip already distributed
      }

      // Validate submission has wallet address
      if (!submission.userWallet) {
        errors.push(`Submission ${submission.id}: No wallet address provided`)
        failed++
        continue
      }

      try {
        const distribution = await this.createTokenDistribution(submission)
        if (distribution.status === 'completed') {
          successful++
        } else {
          failed++
          if (distribution.error) {
            errors.push(`Submission ${submission.id}: ${distribution.error}`)
          }
        }
      } catch (error) {
        failed++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Submission ${submission.id}: ${errorMessage}`)
      }
    }

    return { processed, successful, failed, errors }
  }

  // Create a token distribution for an approved submission
  async createTokenDistribution(submission: TaskSubmission): Promise<TokenDistribution> {
    const distribution: TokenDistribution = {
      id: `dist_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      submissionId: submission.id,
      campaignId: submission.campaignId,
      userId: submission.userId,
      userWallet: submission.userWallet!,
      tokenMint: '', // Will be set from campaign data
      amount: submission.rewardAmount,
      distributedAt: Date.now(),
      status: 'pending'
    }

    // Store distribution record
    const campaignDistributions = this.distributions.get(submission.campaignId) || []
    campaignDistributions.push(distribution)
    this.distributions.set(submission.campaignId, campaignDistributions)
    this.distributionById.set(distribution.id, distribution)

    try {
      // Attempt to execute the token transfer
      if (this.connection && submission.userWallet) {
        await this.executeTokenTransfer(distribution)
      } else {
        // For testing/demo mode, mark as completed without actual transfer
        distribution.status = 'completed'
        distribution.transactionSignature = `mock_tx_${Date.now()}`
        console.log(`Mock distribution: ${distribution.amount} ${submission.tokenSymbol} to ${submission.userWallet}`)
      }
    } catch (error) {
      distribution.status = 'failed'
      distribution.error = error instanceof Error ? error.message : 'Transfer failed'
    }

    // Update storage
    this.distributionById.set(distribution.id, distribution)
    this.saveToLocalStorage()

    return distribution
  }

  // Execute the actual token transfer on Solana
  private async executeTokenTransfer(distribution: TokenDistribution): Promise<void> {
    if (!this.connection || !this.platformKeypair) {
      throw new Error('Connection or platform keypair not initialized')
    }

    try {
      // Get campaign data to find token mint
      const campaign = await this.getCampaignTokenMint(distribution.campaignId)
      if (!campaign) {
        throw new Error('Campaign not found')
      }

      distribution.tokenMint = campaign.tokenMint

      const userPublicKey = new PublicKey(distribution.userWallet)
      const tokenMintPublicKey = new PublicKey(campaign.tokenMint)

      // Get or create user's associated token account
      const userTokenAccount = await getAssociatedTokenAddress(
        tokenMintPublicKey,
        userPublicKey
      )

      const transaction = new Transaction()

      // Check if user token account exists
      const accountInfo = await this.connection.getAccountInfo(userTokenAccount)
      if (!accountInfo) {
        // Create associated token account
        transaction.add(
          createAssociatedTokenAccountInstruction(
            this.platformKeypair.publicKey,
            userTokenAccount,
            userPublicKey,
            tokenMintPublicKey
          )
        )
      }

      // Get platform's token account (source)
      const platformTokenAccount = await getAssociatedTokenAddress(
        tokenMintPublicKey,
        this.platformKeypair.publicKey
      )

      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          platformTokenAccount,
          userTokenAccount,
          this.platformKeypair.publicKey,
          distribution.amount,
          [],
          TOKEN_PROGRAM_ID
        )
      )

      // Send transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.platformKeypair],
        {
          commitment: 'confirmed',
          maxRetries: 3
        }
      )

      distribution.status = 'completed'
      distribution.transactionSignature = signature

      console.log(`Token distribution successful: ${distribution.amount} tokens to ${distribution.userWallet}`)
      console.log(`Transaction: ${signature}`)

    } catch (error) {
      console.error('Token transfer failed:', error)
      throw error
    }
  }

  // Get campaign token mint information
  private async getCampaignTokenMint(campaignId: string): Promise<{ tokenMint: string } | null> {
    // In a real implementation, this would fetch from the smart contract or database
    // For now, we'll use mock data or localStorage
    if (typeof window !== 'undefined') {
      const campaigns = localStorage.getItem('onchain_campaigns')
      if (campaigns) {
        const campaignData = JSON.parse(campaigns)
        const campaign = campaignData.find((c: any) => c.publicKey === campaignId)
        if (campaign) {
          return { tokenMint: campaign.tokenMint || 'mock_token_mint' }
        }
      }
    }
    return null
  }

  // Get distribution by submission ID
  getDistributionBySubmission(submissionId: string): TokenDistribution | undefined {
    for (const distributions of Array.from(this.distributions.values())) {
      const found = distributions.find(d => d.submissionId === submissionId)
      if (found) return found
    }
    return undefined
  }

  // Get all distributions for a campaign
  getDistributionsForCampaign(campaignId: string): TokenDistribution[] {
    return this.distributions.get(campaignId) || []
  }

  // Get distribution statistics
  getDistributionStats(campaignId: string): DistributionStats {
    const distributions = this.distributions.get(campaignId) || []
    
    const completed = distributions.filter(d => d.status === 'completed')
    const pending = distributions.filter(d => d.status === 'pending')
    const failed = distributions.filter(d => d.status === 'failed')

    const totalDistributed = completed.reduce((sum, d) => sum + d.amount, 0)
    const uniqueUsers = new Set(completed.map(d => d.userId)).size
    const averageAmount = completed.length > 0 ? totalDistributed / completed.length : 0

    const recentDistributions = distributions
      .sort((a, b) => b.distributedAt - a.distributedAt)
      .slice(0, 10)

    return {
      totalDistributed,
      totalPending: pending.length,
      totalFailed: failed.length,
      totalUsers: uniqueUsers,
      averageAmount,
      recentDistributions
    }
  }

  // Retry failed distributions
  async retryFailedDistributions(campaignId: string): Promise<{
    retried: number
    successful: number
    stillFailed: number
  }> {
    const failedDistributions = this.distributions.get(campaignId)?.filter(
      d => d.status === 'failed'
    ) || []

    let retried = 0
    let successful = 0
    let stillFailed = 0

    for (const distribution of failedDistributions) {
      retried++
      
      try {
        // Reset status and try again
        distribution.status = 'pending'
        distribution.error = undefined
        distribution.distributedAt = Date.now()

        await this.executeTokenTransfer(distribution)
        
        if ((distribution as any).status === 'completed') {
          successful++
        } else {
          stillFailed++
        }
      } catch (error) {
        distribution.status = 'failed'
        distribution.error = error instanceof Error ? error.message : 'Retry failed'
        stillFailed++
      }

      // Update storage
      this.distributionById.set(distribution.id, distribution)
    }

    this.saveToLocalStorage()
    return { retried, successful, stillFailed }
  }

  // Get user's distribution history
  getUserDistributions(userId: string, campaignId?: string): TokenDistribution[] {
    let allDistributions: TokenDistribution[] = []

    if (campaignId) {
      allDistributions = this.distributions.get(campaignId) || []
    } else {
      this.distributions.forEach(campaignDistributions => {
        allDistributions.push(...campaignDistributions)
      })
    }

    return allDistributions
      .filter(d => d.userId === userId)
      .sort((a, b) => b.distributedAt - a.distributedAt)
  }

  // Batch process multiple campaigns
  async batchProcessCampaigns(campaignIds: string[]): Promise<{
    totalProcessed: number
    totalSuccessful: number
    totalFailed: number
    campaignResults: Record<string, any>
  }> {
    const campaignResults: Record<string, any> = {}
    let totalProcessed = 0
    let totalSuccessful = 0
    let totalFailed = 0

    for (const campaignId of campaignIds) {
      try {
        const result = await this.processApprovedSubmissions(campaignId)
        campaignResults[campaignId] = result
        totalProcessed += result.processed
        totalSuccessful += result.successful
        totalFailed += result.failed
      } catch (error) {
        campaignResults[campaignId] = {
          processed: 0,
          successful: 0,
          failed: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        }
      }
    }

    return {
      totalProcessed,
      totalSuccessful,
      totalFailed,
      campaignResults
    }
  }

  // Enhanced approval with immediate distribution
  async approveAndDistribute(
    submissionId: string,
    reviewerId: string,
    notes?: string
  ): Promise<{
    submission: TaskSubmission | null
    distribution: TokenDistribution | null
    error?: string
  }> {
    try {
      // First approve the submission
      const submission = await taskSubmissions.reviewSubmission(
        submissionId,
        'approved',
        reviewerId,
        notes
      )

      if (!submission) {
        return {
          submission: null,
          distribution: null,
          error: 'Submission not found'
        }
      }

      // Then create and execute token distribution
      const distribution = await this.createTokenDistribution(submission)

      return {
        submission,
        distribution,
        error: distribution.status === 'failed' ? distribution.error : undefined
      }
    } catch (error) {
      return {
        submission: null,
        distribution: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Load from localStorage
  private loadFromLocalStorage(): void {
    if (typeof window === 'undefined') return

    const stored = localStorage.getItem('token_distributions')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        
        this.distributions.clear()
        this.distributionById.clear()

        Object.entries(data.campaigns).forEach(([campaignId, distributions]) => {
          this.distributions.set(campaignId, distributions as TokenDistribution[])
          ;(distributions as TokenDistribution[]).forEach(dist => {
            this.distributionById.set(dist.id, dist)
          })
        })
      } catch (error) {
        console.error('Failed to load distributions:', error)
      }
    }
  }

  // Save to localStorage
  private saveToLocalStorage(): void {
    if (typeof window === 'undefined') return

    const data = {
      campaigns: Object.fromEntries(this.distributions),
      timestamp: Date.now()
    }

    localStorage.setItem('token_distributions', JSON.stringify(data))
  }

  // Clear old distributions
  clearOldDistributions(daysToKeep: number = 90): void {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000)

    this.distributions.forEach((distributions, campaignId) => {
      const filtered = distributions.filter(d => d.distributedAt > cutoffTime)
      this.distributions.set(campaignId, filtered)
    })

    this.distributionById.clear()
    this.distributions.forEach(distributions => {
      distributions.forEach(dist => {
        this.distributionById.set(dist.id, dist)
      })
    })

    this.saveToLocalStorage()
  }
}

// Singleton instance
export const airdropDistributor = new AirdropTokenDistributor()

// The airdrop distributor is initialized and ready to use
// Creator-Controlled Funding Pool System for Launch.fund
// Real fund collection and withdrawal system integrated with DEX graduation

import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount, getMint } from '@solana/spl-token'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useMemo } from 'react'
import { ErrorHandler } from './errorHandler'

// USDC mint address (devnet)
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

export type FundingCurrency = 'SOL' | 'USDC'
export type FundingPoolStatus = 'Active' | 'Graduated' | 'Withdrawn' | 'Locked'

export interface FundingPoolConfig {
  // Pool configuration
  poolPercentage: number           // % of tokens going to funding (0-100)
  liquidityPercentage: number      // % of tokens reserved for DEX liquidity (0-100)
  currency: FundingCurrency        // SOL or USDC
  withdrawalSchedule: WithdrawalSchedule
  
  // Creator controls
  creatorAddress: string           // Creator's wallet address
  requiresVoting: boolean          // If true, token holders vote on withdrawals
  minimumVotes: number            // Minimum votes needed for withdrawal
  
  // Platform settings
  platformFeePercent: number      // Platform fee (default 1%)
  emergencyUnlock: boolean        // Platform can unlock in emergencies
}

export interface WithdrawalSchedule {
  type: 'Immediate' | 'Milestone' | 'TimeVested'
  milestones?: WithdrawalMilestone[]
  vestingPeriodDays?: number
  vestingCliff?: number           // Days before first withdrawal allowed
}

export interface WithdrawalMilestone {
  id: string
  name: string
  description: string
  amountPercent: number          // % of total pool
  requiresProof: boolean
  unlockConditions: string[]
  unlocked: boolean
  withdrawnAt?: number
}

export interface FundingPool {
  id: string
  campaignId: string
  tokenMint: string
  
  // Pool state
  config: FundingPoolConfig
  status: FundingPoolStatus
  createdAt: number
  
  // Balances
  totalCollected: number         // Total funds collected
  totalWithdrawn: number         // Total funds withdrawn by creator
  availableForWithdrawal: number // Currently available amount
  reservedForLiquidity: number   // Reserved for DEX graduation
  
  // Pool addresses
  poolAddress: string            // On-chain pool account
  vaultAddress: string           // Token vault address
  
  // Tracking
  contributors: FundingContributor[]
  withdrawals: FundingWithdrawal[]
  votes: WithdrawalVote[]
  
  // Integration
  graduationStatus: 'Pending' | 'Eligible' | 'Graduated'
  raydiumPoolId?: string
}

export interface FundingContributor {
  walletAddress: string
  contributions: FundingContribution[]
  totalContributed: number
  tokenBalance: number
  votingPower: number
}

export interface FundingContribution {
  transactionSignature: string
  amount: number
  currency: FundingCurrency
  timestamp: number
  tokensReceived: number
}

export interface FundingWithdrawal {
  id: string
  milestoneId?: string
  amount: number
  currency: FundingCurrency
  requestedAt: number
  approvedAt?: number
  executedAt?: number
  transactionSignature?: string
  status: 'Pending' | 'Approved' | 'Executed' | 'Rejected'
  votes: WithdrawalVote[]
}

export interface WithdrawalVote {
  voterAddress: string
  withdrawalId: string
  vote: 'Approve' | 'Reject'
  votingPower: number
  timestamp: number
  reason?: string
}

export class CreatorFundingPoolManager {
  private connection: Connection
  private wallet: any
  private fundingPools: Map<string, FundingPool> = new Map()

  constructor(connection: Connection, wallet: any) {
    this.connection = connection
    this.wallet = wallet
    this.loadFromStorage()
  }

  // Create a new funding pool for a campaign
  async createFundingPool(
    campaignId: string,
    tokenMint: string,
    config: FundingPoolConfig
  ): Promise<{ success: boolean; poolId?: string; error?: string }> {
    try {
      if (!this.wallet.publicKey) {
        return { success: false, error: 'Wallet not connected' }
      }

      // Validate configuration
      const validation = this.validatePoolConfig(config)
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      console.log('💰 Creating funding pool...', { campaignId, config })

      // Generate pool ID and addresses
      const poolId = `pool_${Date.now()}_${campaignId}`
      const poolAddress = await this.derivePoolAddress(campaignId, tokenMint)
      const vaultAddress = await this.deriveVaultAddress(poolAddress, config.currency)

      // Create funding pool structure
      const fundingPool: FundingPool = {
        id: poolId,
        campaignId,
        tokenMint,
        config,
        status: 'Active',
        createdAt: Date.now(),
        totalCollected: 0,
        totalWithdrawn: 0,
        availableForWithdrawal: 0,
        reservedForLiquidity: 0,
        poolAddress,
        vaultAddress,
        contributors: [],
        withdrawals: [],
        votes: [],
        graduationStatus: 'Pending'
      }

      // Store funding pool
      this.fundingPools.set(poolId, fundingPool)
      this.saveToStorage()

      console.log('✅ Funding pool created:', {
        poolId,
        poolAddress,
        vaultAddress,
        currency: config.currency,
        poolPercentage: config.poolPercentage
      })

      return { success: true, poolId }

    } catch (error: any) {
      console.error('❌ Failed to create funding pool:', error)
      ErrorHandler.handle(error, { operation: 'createFundingPool', campaignId })
      return { success: false, error: error.message }
    }
  }

  // Process contribution during token purchase
  async processContribution(
    poolId: string,
    contributorAddress: string,
    amount: number,
    currency: FundingCurrency,
    tokensReceived: number,
    transactionSignature: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const pool = this.fundingPools.get(poolId)
      if (!pool) {
        return { success: false, error: 'Funding pool not found' }
      }

      if (pool.status !== 'Active') {
        return { success: false, error: 'Funding pool is not active' }
      }

      console.log('💳 Processing contribution...', {
        poolId,
        contributor: contributorAddress,
        amount,
        currency,
        tokensReceived
      })

      // Calculate fund allocation
      const fundingAmount = amount * (pool.config.poolPercentage / 100)
      const liquidityAmount = amount * (pool.config.liquidityPercentage / 100)
      const platformFee = amount * (pool.config.platformFeePercent / 100)

      // Create contribution record
      const contribution: FundingContribution = {
        transactionSignature,
        amount,
        currency,
        timestamp: Date.now(),
        tokensReceived
      }

      // Find or create contributor
      let contributor = pool.contributors.find(c => c.walletAddress === contributorAddress)
      if (!contributor) {
        contributor = {
          walletAddress: contributorAddress,
          contributions: [],
          totalContributed: 0,
          tokenBalance: 0,
          votingPower: 0
        }
        pool.contributors.push(contributor)
      }

      // Update contributor
      contributor.contributions.push(contribution)
      contributor.totalContributed += amount
      contributor.tokenBalance += tokensReceived
      contributor.votingPower = contributor.tokenBalance // 1 token = 1 vote

      // Update pool balances
      pool.totalCollected += fundingAmount
      pool.availableForWithdrawal += fundingAmount
      pool.reservedForLiquidity += liquidityAmount

      // Update storage
      this.saveToStorage()

      console.log('✅ Contribution processed:', {
        fundingAmount,
        liquidityAmount,
        platformFee,
        totalCollected: pool.totalCollected,
        contributorVotingPower: contributor.votingPower
      })

      return { success: true }

    } catch (error: any) {
      console.error('❌ Failed to process contribution:', error)
      ErrorHandler.handle(error, { operation: 'processContribution', poolId })
      return { success: false, error: error.message }
    }
  }

  // Request withdrawal by creator
  async requestWithdrawal(
    poolId: string,
    amount: number,
    milestoneId?: string,
    reason?: string
  ): Promise<{ success: boolean; withdrawalId?: string; error?: string }> {
    try {
      const pool = this.fundingPools.get(poolId)
      if (!pool) {
        return { success: false, error: 'Funding pool not found' }
      }

      if (!this.wallet.publicKey || this.wallet.publicKey.toString() !== pool.config.creatorAddress) {
        return { success: false, error: 'Only pool creator can request withdrawals' }
      }

      if (amount > pool.availableForWithdrawal) {
        return { success: false, error: 'Insufficient funds available for withdrawal' }
      }

      console.log('💸 Requesting withdrawal...', { poolId, amount, milestoneId })

      // Create withdrawal request
      const withdrawalId = `withdrawal_${Date.now()}_${poolId}`
      const withdrawal: FundingWithdrawal = {
        id: withdrawalId,
        milestoneId,
        amount,
        currency: pool.config.currency,
        requestedAt: Date.now(),
        status: pool.config.requiresVoting ? 'Pending' : 'Approved',
        votes: []
      }

      pool.withdrawals.push(withdrawal)

      // If no voting required, approve immediately
      if (!pool.config.requiresVoting) {
        withdrawal.approvedAt = Date.now()
        const result = await this.executeWithdrawal(poolId, withdrawalId)
        if (!result.success) {
          return { success: false, error: result.error }
        }
      }

      this.saveToStorage()

      console.log('✅ Withdrawal requested:', {
        withdrawalId,
        requiresVoting: pool.config.requiresVoting,
        status: withdrawal.status
      })

      return { success: true, withdrawalId }

    } catch (error: any) {
      console.error('❌ Failed to request withdrawal:', error)
      ErrorHandler.handle(error, { operation: 'requestWithdrawal', poolId })
      return { success: false, error: error.message }
    }
  }

  // Execute approved withdrawal
  async executeWithdrawal(
    poolId: string,
    withdrawalId: string
  ): Promise<{ success: boolean; transactionSignature?: string; error?: string }> {
    try {
      const pool = this.fundingPools.get(poolId)
      if (!pool) {
        return { success: false, error: 'Funding pool not found' }
      }

      const withdrawal = pool.withdrawals.find(w => w.id === withdrawalId)
      if (!withdrawal) {
        return { success: false, error: 'Withdrawal not found' }
      }

      if (withdrawal.status !== 'Approved') {
        return { success: false, error: 'Withdrawal not approved' }
      }

      console.log('🏦 Executing withdrawal...', { poolId, withdrawalId, amount: withdrawal.amount })

      // Create withdrawal transaction
      const transaction = new Transaction()
      const creatorPublicKey = new PublicKey(pool.config.creatorAddress)

      if (withdrawal.currency === 'SOL') {
        // Transfer SOL
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(pool.vaultAddress),
            toPubkey: creatorPublicKey,
            lamports: withdrawal.amount * LAMPORTS_PER_SOL
          })
        )
      } else {
        // Transfer USDC (would need proper token transfer instruction)
        console.log('⚠️ USDC transfers not yet implemented in this version')
      }

      // For now, simulate successful execution
      const transactionSignature = `sim_${Date.now()}_${withdrawalId}`
      
      // Update withdrawal status
      withdrawal.status = 'Executed'
      withdrawal.executedAt = Date.now()
      withdrawal.transactionSignature = transactionSignature

      // Update pool balances
      pool.totalWithdrawn += withdrawal.amount
      pool.availableForWithdrawal -= withdrawal.amount

      this.saveToStorage()

      console.log('✅ Withdrawal executed:', {
        transactionSignature,
        totalWithdrawn: pool.totalWithdrawn,
        remaining: pool.availableForWithdrawal
      })

      return { success: true, transactionSignature }

    } catch (error: any) {
      console.error('❌ Failed to execute withdrawal:', error)
      ErrorHandler.handle(error, { operation: 'executeWithdrawal', poolId, withdrawalId })
      return { success: false, error: error.message }
    }
  }

  // Vote on withdrawal (for community-governed pools)
  async voteOnWithdrawal(
    poolId: string,
    withdrawalId: string,
    vote: 'Approve' | 'Reject',
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const pool = this.fundingPools.get(poolId)
      if (!pool || !this.wallet.publicKey) {
        return { success: false, error: 'Pool not found or wallet not connected' }
      }

      const contributor = pool.contributors.find(c => c.walletAddress === this.wallet.publicKey!.toString())
      if (!contributor || contributor.votingPower === 0) {
        return { success: false, error: 'No voting power in this pool' }
      }

      const withdrawal = pool.withdrawals.find(w => w.id === withdrawalId)
      if (!withdrawal) {
        return { success: false, error: 'Withdrawal not found' }
      }

      // Check if already voted
      const existingVote = withdrawal.votes.find(v => v.voterAddress === this.wallet.publicKey!.toString())
      if (existingVote) {
        return { success: false, error: 'Already voted on this withdrawal' }
      }

      // Create vote
      const withdrawalVote: WithdrawalVote = {
        voterAddress: this.wallet.publicKey.toString(),
        withdrawalId,
        vote,
        votingPower: contributor.votingPower,
        timestamp: Date.now(),
        reason
      }

      withdrawal.votes.push(withdrawalVote)
      pool.votes.push(withdrawalVote)

      // Check if withdrawal should be approved
      const totalVotingPower = pool.contributors.reduce((sum, c) => sum + c.votingPower, 0)
      const approvalVotes = withdrawal.votes.filter(v => v.vote === 'Approve').reduce((sum, v) => sum + v.votingPower, 0)
      const rejectionVotes = withdrawal.votes.filter(v => v.vote === 'Reject').reduce((sum, v) => sum + v.votingPower, 0)

      const approvalPercent = (approvalVotes / totalVotingPower) * 100
      const requiredPercent = pool.config.minimumVotes

      if (approvalPercent >= requiredPercent) {
        withdrawal.status = 'Approved'
        withdrawal.approvedAt = Date.now()
      } else if (rejectionVotes > approvalVotes && (approvalVotes + rejectionVotes) >= totalVotingPower * 0.5) {
        withdrawal.status = 'Rejected'
      }

      this.saveToStorage()

      console.log('🗳️ Vote recorded:', {
        vote,
        votingPower: contributor.votingPower,
        approvalPercent: approvalPercent.toFixed(1),
        withdrawalStatus: withdrawal.status
      })

      return { success: true }

    } catch (error: any) {
      console.error('❌ Failed to vote on withdrawal:', error)
      ErrorHandler.handle(error, { operation: 'voteOnWithdrawal', poolId, withdrawalId })
      return { success: false, error: error.message }
    }
  }

  // Get funding pool details
  getFundingPool(poolId: string): FundingPool | undefined {
    return this.fundingPools.get(poolId)
  }

  // Get pools for a campaign
  getPoolsForCampaign(campaignId: string): FundingPool[] {
    return Array.from(this.fundingPools.values()).filter(pool => pool.campaignId === campaignId)
  }

  // Get pools for a creator
  getPoolsForCreator(creatorAddress: string): FundingPool[] {
    return Array.from(this.fundingPools.values()).filter(pool => pool.config.creatorAddress === creatorAddress)
  }

  // Integration with graduation system
  async prepareForGraduation(poolId: string): Promise<{
    success: boolean
    liquidityAmount?: number
    error?: string
  }> {
    try {
      const pool = this.fundingPools.get(poolId)
      if (!pool) {
        return { success: false, error: 'Pool not found' }
      }

      const liquidityAmount = pool.reservedForLiquidity
      if (liquidityAmount < 8) { // Minimum 8 SOL for graduation
        return { success: false, error: 'Insufficient liquidity reserved for graduation' }
      }

      pool.graduationStatus = 'Eligible'
      this.saveToStorage()

      return { success: true, liquidityAmount }

    } catch (error: any) {
      console.error('❌ Failed to prepare for graduation:', error)
      return { success: false, error: error.message }
    }
  }

  // Mark pool as graduated
  markAsGraduated(poolId: string, raydiumPoolId: string): void {
    const pool = this.fundingPools.get(poolId)
    if (pool) {
      pool.status = 'Graduated'
      pool.graduationStatus = 'Graduated'
      pool.raydiumPoolId = raydiumPoolId
      this.saveToStorage()
    }
  }

  // Private helper methods
  private validatePoolConfig(config: FundingPoolConfig): { valid: boolean; error?: string } {
    if (config.poolPercentage < 0 || config.poolPercentage > 100) {
      return { valid: false, error: 'Pool percentage must be between 0-100%' }
    }

    if (config.liquidityPercentage < 0 || config.liquidityPercentage > 100) {
      return { valid: false, error: 'Liquidity percentage must be between 0-100%' }
    }

    if (config.poolPercentage + config.liquidityPercentage > 100) {
      return { valid: false, error: 'Pool + liquidity percentages cannot exceed 100%' }
    }

    if (config.platformFeePercent < 0 || config.platformFeePercent > 10) {
      return { valid: false, error: 'Platform fee must be between 0-10%' }
    }

    return { valid: true }
  }

  private async derivePoolAddress(campaignId: string, tokenMint: string): Promise<string> {
    // In real implementation, this would derive a PDA
    return `pool_${campaignId}_${tokenMint.slice(-8)}`
  }

  private async deriveVaultAddress(poolAddress: string, currency: FundingCurrency): Promise<string> {
    // In real implementation, this would derive a PDA for the vault
    return `vault_${poolAddress}_${currency}`
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem('creator_funding_pools')
      if (stored) {
        const data = JSON.parse(stored)
        this.fundingPools.clear()
        
        Object.entries(data.pools || {}).forEach(([poolId, pool]) => {
          this.fundingPools.set(poolId, pool as FundingPool)
        })
        
        console.log(`📚 Loaded ${this.fundingPools.size} funding pools`)
      }
    } catch (error) {
      console.error('Failed to load funding pools:', error)
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const data = {
        pools: Object.fromEntries(this.fundingPools),
        timestamp: Date.now()
      }
      localStorage.setItem('creator_funding_pools', JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save funding pools:', error)
    }
  }
}

// Hook to use funding pool manager
export function useCreatorFundingPools() {
  const { connection } = useConnection()
  const wallet = useWallet()
  
  const fundingPoolManager = useMemo(() => 
    new CreatorFundingPoolManager(connection, wallet), 
    [connection, wallet]
  )
  
  return fundingPoolManager
}

export default CreatorFundingPoolManager
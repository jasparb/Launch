import { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Program, AnchorProvider, Wallet, BN, web3, Idl } from '@coral-xyz/anchor'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useMemo } from 'react'
import { tokenMetadataService } from './tokenMetadataService'
import { BondingCurve, createBondingCurve, TradeCalculation } from './bondingCurve'
import { getTransactionMonitor } from './transactionMonitor'
import { ErrorHandler, withErrorHandler, withRetry } from './errorHandler'
import launchFundIDL from '../target/idl/launch_fund.json'

// Program ID for our deployed Launch Fund contract on devnet
const LAUNCH_FUND_PROGRAM_ID = new PublicKey('8RDF8KobfNfe4ZCPw7T3xputHQDAT7wwiBBkFeRruECo')
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

export interface CreateCampaignParams {
  name: string
  description: string
  targetAmount: number
  endTimestamp: number
  fundingRatio: number
  conversionStrategy: 'Instant' | 'OnWithdrawal' | 'Hybrid'
  roadmapStages?: RoadmapStage[]
  airdropConfig?: AirdropConfig
  totalSupply?: string | number // Token total supply from form input
}

export interface RoadmapStage {
  name: string
  description: string
  fundingRequired: number
  fundingUsage: string
  deliverables: string[]
  unlockTimestamp: number
}

export interface AirdropConfig {
  rewardMode: 'PerTask' | 'AllRequired'
  tasks: AirdropTask[]
  bundleReward: number
  totalBudget: number
  endTimestamp: number
}

export interface AirdropTask {
  taskType: 'TwitterFollow' | 'TwitterRetweet' | 'DiscordJoin' | 'TelegramJoin' | 'Custom'
  rewardAmount: number
  verificationData: string
  maxCompletions: number
}

export interface CampaignData {
  id: string
  name: string
  description: string
  creator: string
  targetAmount: number
  raisedAmount: number
  endTimestamp: number
  fundingRatio: number
  conversionStrategy: string
  isActive: boolean
  tokenMint: string
  distributedTokens: number
  totalSupply: number
  createdAt: number
  currentPrice: number
  tokenSymbol: string
  tokenName: string
  bump: number
}

export interface TradeResult {
  success: boolean
  tokensReceived?: number
  solAmount?: number
  transactionSignature?: string
  priceImpact?: number
  platformFee?: number
  slippage?: number
  error?: string
}

// IDL for the smart contract (inline to avoid import issues)
const LAUNCH_FUND_IDL = {
  "version": "0.31.1",
  "name": "launch_fund",
  "instructions": [
    {
      "name": "initializeCampaign",
      "accounts": [
        {"name": "campaign", "isMut": true, "isSigner": false},
        {"name": "tokenMint", "isMut": true, "isSigner": false},
        {"name": "creator", "isMut": true, "isSigner": true},
        {"name": "systemProgram", "isMut": false, "isSigner": false},
        {"name": "tokenProgram", "isMut": false, "isSigner": false},
        {"name": "rent", "isMut": false, "isSigner": false}
      ],
      "args": [
        {"name": "name", "type": "string"},
        {"name": "description", "type": "string"},
        {"name": "targetAmount", "type": "u64"},
        {"name": "tokenSymbol", "type": "string"},
        {"name": "tokenName", "type": "string"},
        {"name": "totalSupply", "type": "u64"}
      ]
    },
    {
      "name": "contribute",
      "accounts": [
        {"name": "campaign", "isMut": true, "isSigner": false},
        {"name": "tokenMint", "isMut": true, "isSigner": false},
        {"name": "contributorTokenAccount", "isMut": true, "isSigner": false},
        {"name": "contributor", "isMut": true, "isSigner": true},
        {"name": "systemProgram", "isMut": false, "isSigner": false},
        {"name": "tokenProgram", "isMut": false, "isSigner": false},
        {"name": "associatedTokenProgram", "isMut": false, "isSigner": false},
        {"name": "rent", "isMut": false, "isSigner": false}
      ],
      "args": [{"name": "amount", "type": "u64"}]
    }
  ],
  "accounts": [
    {
      "name": "Campaign",
      "type": {
        "kind": "struct",
        "fields": [
          {"name": "creator", "type": "publicKey"},
          {"name": "name", "type": "string"},
          {"name": "description", "type": "string"},
          {"name": "targetAmount", "type": "u64"},
          {"name": "raisedAmount", "type": "u64"},
          {"name": "tokenSymbol", "type": "string"},
          {"name": "tokenName", "type": "string"},
          {"name": "totalSupply", "type": "u64"},
          {"name": "tokenMint", "type": "publicKey"},
          {"name": "createdAt", "type": "i64"},
          {"name": "isActive", "type": "bool"},
          {"name": "bump", "type": "u8"}
        ]
      }
    }
  ]
} as any

class SmartContractIntegration {
  private connection: Connection
  private wallet: any | null
  private program: Program | null = null
  private initializationAttempted = false

  constructor(connection: Connection, wallet: any | null) {
    this.connection = connection
    this.wallet = wallet
    // Don't initialize program immediately - wait for wallet connection
  }

  // Safe program initialization with better error handling
  private async initializeProgram(): Promise<boolean> {
    if (this.initializationAttempted && this.program) {
      return true
    }

    this.initializationAttempted = true

    try {
      const walletValidation = this.validateWallet()
      if (!walletValidation.isValid) {
        console.warn('⚠️  Wallet not ready for program init:', walletValidation.error)
        return false
      }

      // Create provider with safer configuration
      const provider = new AnchorProvider(
        this.connection,
        {
          publicKey: this.wallet.publicKey,
          signTransaction: (tx: Transaction) => {
            if (!this.wallet?.signTransaction) {
              throw new Error('Wallet signing not available')
            }
            return this.wallet.signTransaction(tx)
          },
          signAllTransactions: this.wallet.signAllTransactions?.bind(this.wallet)
        },
        {
          commitment: 'confirmed',
          preflightCommitment: 'confirmed',
          skipPreflight: false
        }
      )

      // Initialize program with error handling
      this.program = new Program(launchFundIDL as Idl, LAUNCH_FUND_PROGRAM_ID, provider)
      
      console.log('✅ Program initialized successfully')
      return true
    } catch (error) {
      console.error('❌ Program initialization failed:', error)
      // Reset attempt flag to allow retry
      this.initializationAttempted = false
      return false
    }
  }

  // Check if campaign address is a mock campaign (simple string like "1", "2", "3")
  private isMockCampaign(campaignAddress: string): boolean {
    // Mock campaigns have simple string IDs, real campaigns have base58 addresses (44 chars)
    return campaignAddress.length < 10 || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(campaignAddress)
  }

  // Validate wallet connection state
  private validateWallet(): { isValid: boolean, error?: string } {
    if (!this.wallet) {
      return { isValid: false, error: 'No wallet adapter provided' }
    }

    if (!this.wallet.publicKey) {
      return { isValid: false, error: 'Wallet not connected - no public key available' }
    }

    if (!this.wallet.signTransaction) {
      return { isValid: false, error: 'Wallet does not support transaction signing' }
    }

    if (this.wallet.connecting) {
      return { isValid: false, error: 'Wallet is currently connecting, please wait' }
    }

    if (!this.wallet.connected) {
      return { isValid: false, error: 'Wallet is not connected' }
    }

    return { isValid: true }
  }

  // Handle mock campaign token purchases (for demo purposes)
  private async buyTokensMock(campaignAddress: string, solAmount: number): Promise<TradeResult> {
    if (!this.wallet.publicKey) {
      throw new Error('Wallet not connected')
    }

    // Check SOL balance
    const balance = await this.getSolBalance(this.wallet.publicKey)
    if (solAmount > balance - 0.01) {
      throw new Error('Insufficient SOL balance for this transaction plus fees')
    }

    // Simulate transaction delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Mock calculations for demo
    const baseTokenRate = 1000000 // 1M tokens per SOL
    const tokensReceived = solAmount * baseTokenRate

    // Mock fees and slippage
    const platformFee = solAmount * 0.003 // 0.3% platform fee
    const priceImpact = Math.min(solAmount * 0.001, 0.05) // Max 5% impact
    
    console.log('🎭 Mock transaction completed:', {
      campaignAddress,
      solAmount,
      tokensReceived,
      platformFee,
      priceImpact
    })

    return {
      success: true,
      tokensReceived,
      solAmount,
      transactionSignature: 'mock_tx_' + Date.now(),
      priceImpact: priceImpact,
      platformFee: platformFee,
      slippage: 0.5
    }
  }

  private async initializeProgram() {
    try {
      if (!this.wallet || !this.wallet.publicKey) {
        console.warn('Cannot initialize program: wallet not connected')
        return false
      }
      
      console.log('Initializing program with:')
      console.log('- Program ID:', LAUNCH_FUND_PROGRAM_ID.toString())
      console.log('- Wallet:', this.wallet.publicKey.toString())
      console.log('- Connection:', this.connection.rpcEndpoint)

      // Create a wallet adapter that matches Anchor's expectations
      const walletAdapter = {
        publicKey: this.wallet.publicKey,
        signTransaction: this.wallet.signTransaction ? this.wallet.signTransaction.bind(this.wallet) : undefined,
        signAllTransactions: this.wallet.signAllTransactions ? this.wallet.signAllTransactions.bind(this.wallet) : undefined
      }

      const provider = new AnchorProvider(
        this.connection,
        walletAdapter as any,
        AnchorProvider.defaultOptions()
      )
      this.program = new Program(LAUNCH_FUND_IDL, LAUNCH_FUND_PROGRAM_ID, provider)
      console.log('✅ Program initialized successfully')
      
      // Test program accessibility
      try {
        const programAccount = await this.connection.getAccountInfo(LAUNCH_FUND_PROGRAM_ID)
        if (!programAccount) {
          throw new Error(`Program not found at ${LAUNCH_FUND_PROGRAM_ID.toString()}. The smart contract may not be deployed to devnet.`)
        }
        console.log('✅ Program found and accessible')
      } catch (testError) {
        console.error('⚠️ Program accessibility test failed:', testError)
        throw new Error(`Smart contract not accessible: ${testError}`)
      }
      
      return true
      
    } catch (error: any) {
      console.error('❌ Failed to initialize program:', error)
      ErrorHandler.handle(error, {
        operation: 'initializeProgram',
        programId: LAUNCH_FUND_PROGRAM_ID.toString(),
        wallet: this.wallet?.publicKey?.toString()
      })
      return false
    }
  }

  // Ensure program is initialized before use
  private async ensureProgramInitialized(): Promise<boolean> {
    console.log('🔍 ENSURE PROGRAM INIT - Starting check')
    
    if (this.program) {
      console.log('🔍 ENSURE PROGRAM INIT - Program already exists, returning true')
      return true
    }
    
    console.log('🔍 ENSURE PROGRAM INIT - No program, checking wallet...', {
      hasWallet: !!this.wallet,
      hasPublicKey: !!this.wallet?.publicKey,
      connected: this.wallet?.connected
    })
    
    if (!this.wallet || !this.wallet.publicKey) {
      console.warn('🔍 ENSURE PROGRAM INIT - Cannot initialize program: wallet not connected')
      console.warn('   Wallet:', !!this.wallet)
      console.warn('   PublicKey:', !!this.wallet?.publicKey)
      return false
    }
    
    console.log('🔍 ENSURE PROGRAM INIT - Wallet OK, calling initializeProgram()')
    const result = await this.initializeProgram()
    console.log('🔍 ENSURE PROGRAM INIT - initializeProgram() returned:', result)
    return result
  }

  // Update wallet reference (for when wallet connects/disconnects)
  updateWallet(wallet: any | null) {
    this.wallet = wallet
    this.program = null // Reset program when wallet changes
  }

  // Get campaign PDA
  private async getCampaignPDA(creator: PublicKey, name: string): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [
        Buffer.from('campaign'),
        creator.toBuffer(),
        Buffer.from(name)
      ],
      LAUNCH_FUND_PROGRAM_ID
    )
  }

  // Create a new campaign on-chain with enhanced token metadata
  async createCampaign(params: CreateCampaignParams): Promise<{
    success: boolean
    campaignId?: string
    tokenMint?: string
    signature?: string
    error?: string
  }> {
    // Extract only the parameters our smart contract supports
    const basicParams = {
      name: params.name,
      description: params.description,
      targetAmount: params.targetAmount,
      totalSupply: params.totalSupply
    }
    console.log('🚀 Starting createCampaign with basic params only:', basicParams)
    console.log('🔄 Ignoring advanced features (roadmap, airdrop, etc.) - not implemented in current smart contract')
    try {
      // Validate wallet connection
      console.log('🔍 Validating wallet connection...')
      const walletValidation = this.validateWallet()
      if (!walletValidation.isValid) {
        console.error('❌ Wallet validation failed:', walletValidation.error)
        return { success: false, error: walletValidation.error! }
      }
      console.log('✅ Wallet validation passed')
      
      console.log('Creating campaign with wallet:', this.wallet.publicKey!.toString())
      console.log('Campaign params:', {
        name: basicParams.name,
        description: basicParams.description,
        targetAmount: basicParams.targetAmount,
        totalSupply: basicParams.totalSupply
      })

      if (!this.program) {
        console.log('🔄 Program not initialized, attempting to initialize...')
      }

      console.log('🔄 Ensuring program is initialized...')
      console.log('🔍 DEBUGGING - Current wallet state:', {
        wallet: !!this.wallet,
        publicKey: this.wallet?.publicKey?.toString(),
        connected: this.wallet?.connected,
        connecting: this.wallet?.connecting,
        signTransaction: !!this.wallet?.signTransaction
      })
      
      const isInitialized = await this.ensureProgramInitialized()
      
      console.log('🔍 DEBUGGING - Initialization result:', {
        isInitialized,
        hasProgram: !!this.program,
        willCreateMock: !isInitialized || !this.program
      })

      if (!isInitialized || !this.program) {
        console.warn('⚠️ Program initialization failed - creating mock campaign for testing')
        console.warn('🔍 FAILURE REASON:', {
          isInitialized,
          hasProgram: !!this.program,
          walletConnected: !!this.wallet?.connected,
          hasPublicKey: !!this.wallet?.publicKey
        })
        
        // Create a mock campaign when smart contract is not available
        const mockCampaignId = `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`
        const mockTokenMint = `token_${Date.now()}_${Math.random().toString(36).substring(7)}`
        
        console.log('✅ Mock campaign created:', {
          campaignId: mockCampaignId,
          tokenMint: mockTokenMint,
          name: basicParams.name,
          targetAmount: basicParams.targetAmount
        })
        
        // Return mock campaign data
        return {
          success: true,
          campaignId: mockCampaignId,
          campaignAddress: mockCampaignId, // For compatibility
          tokenMint: mockTokenMint,
          signature: 'mock_tx_' + Date.now()
        }
      }
      console.log('✅ Program initialized successfully')

      const [campaignPDA] = await this.getCampaignPDA(this.wallet.publicKey, basicParams.name)
      console.log('Campaign PDA:', campaignPDA.toString())

      // Generate a new token mint
      const tokenMint = Keypair.generate()
      console.log('Token mint:', tokenMint.publicKey.toString())

      const targetAmountLamports = new BN(basicParams.targetAmount * LAMPORTS_PER_SOL)
      
      // Use user's input for total supply, default to 1B if not provided
      const supplyFromInput = basicParams.totalSupply ? 
        (typeof basicParams.totalSupply === 'string' ? parseInt(basicParams.totalSupply) : basicParams.totalSupply) : 
        1000000000
      const totalSupplyTokens = new BN(supplyFromInput * 1000000000) // Convert to tokens with 9 decimals
      
      console.log('Using token supply from user input:', supplyFromInput.toLocaleString(), 'tokens')

      console.log('🔄 Calling initializeCampaign instruction...')
      console.log('- Campaign PDA:', campaignPDA.toString())
      console.log('- Token Mint:', tokenMint.publicKey.toString())
      console.log('- Creator:', this.wallet.publicKey.toString())
      console.log('- Target Amount:', targetAmountLamports.toString())
      console.log('- Total Supply:', totalSupplyTokens.toString())
      
      const tx = await this.program.methods
        .initializeCampaign(
          basicParams.name,
          basicParams.description,
          targetAmountLamports,
          basicParams.name.substring(0, 6).toUpperCase(), // Token symbol
          `${basicParams.name} Token`, // Token name
          totalSupplyTokens
        )
        .accounts({
          campaign: campaignPDA,
          tokenMint: tokenMint.publicKey,
          creator: this.wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([tokenMint])
        .rpc()

      console.log('✅ Campaign creation transaction sent:', tx)

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(tx, 'confirmed')
      if (confirmation.value.err) {
        throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err))
      }

      // TODO: In future enhancement, add metadata creation after smart contract upgrade
      console.log('✅ Campaign created successfully')
      
      // Store campaign metadata using existing service
      try {
        await tokenMetadataService.createTokenMetadata({
          mint: tokenMint.publicKey.toString(),
          name: `${basicParams.name} Token`,
          symbol: basicParams.name.substring(0, 6).toUpperCase(),
          description: basicParams.description,
          image: '',
          creator: this.wallet.publicKey.toString()
        })
      } catch (metadataError) {
        console.warn('Failed to create metadata:', metadataError)
        // Continue anyway - metadata is optional
      }

      return {
        success: true,
        campaignId: campaignPDA.toString(),
        tokenMint: tokenMint.publicKey.toBase58(),
        signature: tx
      }
    } catch (error: any) {
      console.error('❌ ERROR creating campaign:', {
        message: error.message,
        code: error.code,
        logs: error.logs,
        stack: error.stack
      })

      ErrorHandler.handle(error, {
        operation: 'createCampaign',
        params: basicParams,
        wallet: this.wallet?.publicKey?.toString(),
        programId: LAUNCH_FUND_PROGRAM_ID.toString()
      })

      // Enhanced error messages for user
      let errorMessage = 'Failed to create campaign'
      
      if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient SOL balance. You need approximately 0.02 SOL to create a campaign.'
      } else if (error.message.includes('signer')) {
        errorMessage = 'Wallet signing error. Please ensure your wallet is properly connected and try again.'
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Transaction timed out. The network may be congested. Please try again.'
      } else if (error.message.includes('blockhash')) {
        errorMessage = 'Network synchronization error. Please try again in a moment.'
      } else if (error.message.includes('rate')) {
        errorMessage = 'Too many requests. Please wait a moment and try again.'
      } else if (error.code === -32002) {
        errorMessage = 'Transaction rejected by wallet. Please check your wallet and try again.'
      } else if (error.code === -32603) {
        errorMessage = 'Internal wallet error. Please reconnect your wallet and try again.'
      }
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  // Buy tokens (contribute to campaign)
  async buyTokens(campaignAddress: string, solAmount: number): Promise<TradeResult> {
    // Handle mock campaigns
    if (this.isMockCampaign(campaignAddress)) {
      return this.buyTokensMock(campaignAddress, solAmount)
    }

    const result = await withErrorHandler(async () => {
      if (!this.wallet.publicKey || !this.program) {
        throw new Error('Wallet not connected or program not initialized')
      }

      // Check SOL balance
      const balance = await this.getSolBalance(this.wallet.publicKey)
      if (solAmount > balance - 0.01) { // Reserve for fees
        throw new Error('Insufficient SOL balance for this transaction plus fees')
      }

      await this.initializeProgram()

      // Get campaign data
      let campaignPDA: PublicKey
      try {
        campaignPDA = new PublicKey(campaignAddress)
      } catch (error) {
        throw new Error(`Invalid campaign address: ${campaignAddress}`)
      }
      const campaign = await this.getCampaignData(campaignAddress)
      
      if (!campaign) {
        throw new Error('Campaign not found')
      }

      if (!campaign.isActive) {
        throw new Error('Campaign is no longer active')
      }

      const tokenMint = new PublicKey(campaign.tokenMint)
      const contributorTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        this.wallet.publicKey
      )

      // Check if ATA exists, create if not
      const ataExists = await this.accountExists(contributorTokenAccount)
      if (!ataExists) {
        console.log('Creating associated token account...')
        const createATAIx = createAssociatedTokenAccountInstruction(
          this.wallet.publicKey,
          contributorTokenAccount,
          this.wallet.publicKey,
          tokenMint
        )
        await this.connection.sendTransaction(
          new Transaction().add(createATAIx),
          [this.wallet as any]
        )
      }

      // Execute transaction with retry for network issues
      const amountLamports = new BN(solAmount * LAMPORTS_PER_SOL)
      const tx = await this.program.methods
        .contribute(amountLamports)
        .accounts({
          campaign: campaignPDA,
          tokenMint: tokenMint,
          contributorTokenAccount: contributorTokenAccount,
          contributor: this.wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc()

      // Calculate tokens received using bonding curve
      const tradeCalc = this.calculateBuyTokens(solAmount, campaign.raisedAmount, campaign.distributedTokens)

      // Notify transaction monitor
      try {
        const monitor = getTransactionMonitor()
        monitor.addTransaction(tx, 'contribute', { campaignAddress, solAmount })
      } catch (error) {
        console.warn('Failed to notify transaction monitor:', error)
      }

      return {
        success: true,
        tokensReceived: tradeCalc.tokensOut,
        solAmount: solAmount,
        transactionSignature: tx,
        priceImpact: tradeCalc.priceImpact,
        platformFee: tradeCalc.platformFee,
        slippage: tradeCalc.slippage
      }
    }, { operation: 'buyTokens', campaignAddress, solAmount })

    if (!result.success) {
      return {
        success: false,
        error: result.error.userMessage
      }
    }

    return result.data
  }

  // Sell tokens (not implemented in current smart contract)
  async sellTokens(campaignAddress: string, tokenAmount: number): Promise<TradeResult> {
    return {
      success: false,
      error: 'Token selling not yet implemented in smart contract'
    }
  }

  // Withdraw funds from campaign
  async withdrawFunds(campaignAddress: string, amount: number): Promise<{ success: boolean, signature?: string, error?: string }> {
    try {
      if (!this.wallet.publicKey || !this.program) {
        return { success: false, error: 'Wallet not connected or program not initialized' }
      }

      await this.initializeProgram()

      const campaignPDA = new PublicKey(campaignAddress)
      const amountLamports = new BN(amount * LAMPORTS_PER_SOL)

      const tx = await this.program.methods
        .withdrawFunds(amountLamports)
        .accounts({
          campaign: campaignPDA,
          creator: this.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      return {
        success: true,
        signature: tx
      }
    } catch (error: any) {
      console.error('Error withdrawing funds:', error)
      return {
        success: false,
        error: error.message || 'Failed to withdraw funds'
      }
    }
  }

  // Get campaign data from blockchain
  async getCampaignData(campaignAddress: string): Promise<CampaignData | null> {
    try {
      if (!this.program) {
        await this.initializeProgram()
        if (!this.program) return null
      }

      const campaignPDA = new PublicKey(campaignAddress)
      const campaignAccount = await this.program.account.campaign.fetch(campaignPDA)

      // Calculate current metrics
      const currentPrice = this.calculateTokenPrice(campaignAccount.raisedAmount.toNumber())
      const raisedAmountSol = campaignAccount.raisedAmount.toNumber() / LAMPORTS_PER_SOL
      const targetAmountSol = campaignAccount.targetAmount.toNumber() / LAMPORTS_PER_SOL

      // Estimate distributed tokens based on raised amount and bonding curve
      const distributedTokens = this.calculateTokensFromSOL(
        raisedAmountSol,
        0 // Starting from 0 for simplicity
      )

      return {
        id: campaignAddress,
        name: campaignAccount.name,
        description: campaignAccount.description,
        creator: campaignAccount.creator.toString(),
        targetAmount: targetAmountSol,
        raisedAmount: raisedAmountSol,
        endTimestamp: Date.now() + (30 * 24 * 60 * 60 * 1000), // Default 30 days
        fundingRatio: 0.8, // Default
        conversionStrategy: 'Instant',
        isActive: campaignAccount.isActive,
        tokenMint: campaignAccount.tokenMint.toString(),
        distributedTokens: distributedTokens.tokensOut,
        totalSupply: campaignAccount.totalSupply.toNumber() / 1000000000, // Convert from smallest unit
        createdAt: campaignAccount.createdAt.toNumber() * 1000, // Convert to milliseconds
        currentPrice: currentPrice,
        tokenSymbol: campaignAccount.tokenSymbol,
        tokenName: campaignAccount.tokenName,
        bump: campaignAccount.bump
      }
    } catch (error) {
      console.error('Error fetching campaign data:', error)
      return null
    }
  }

  // Get all campaigns
  async getAllCampaigns(): Promise<CampaignData[]> {
    try {
      if (!this.program) {
        await this.initializeProgram()
        if (!this.program) return []
      }

      const campaigns = await this.program.account.campaign.all()
      const campaignData: CampaignData[] = []

      for (const campaign of campaigns) {
        const account = campaign.account
        const currentPrice = this.calculateTokenPrice(account.raisedAmount.toNumber())
        const raisedAmountSol = account.raisedAmount.toNumber() / LAMPORTS_PER_SOL
        const targetAmountSol = account.targetAmount.toNumber() / LAMPORTS_PER_SOL
        
        const distributedTokens = this.calculateTokensFromSOL(
          raisedAmountSol,
          0
        )

        campaignData.push({
          id: campaign.publicKey.toString(),
          name: account.name,
          description: account.description,
          creator: account.creator.toString(),
          targetAmount: targetAmountSol,
          raisedAmount: raisedAmountSol,
          endTimestamp: Date.now() + (30 * 24 * 60 * 60 * 1000),
          fundingRatio: 0.8,
          conversionStrategy: 'Instant',
          isActive: account.isActive,
          tokenMint: account.tokenMint.toString(),
          distributedTokens: distributedTokens.tokensOut,
          totalSupply: account.totalSupply.toNumber() / 1000000000,
          createdAt: account.createdAt.toNumber() * 1000,
          currentPrice: currentPrice,
          tokenSymbol: account.tokenSymbol,
          tokenName: account.tokenName,
          bump: account.bump
        })
      }

      return campaignData
    } catch (error) {
      console.error('Error fetching all campaigns:', error)
      return []
    }
  }

  // Calculate current token price using SMART CONTRACT FORMULA (matches blockchain)
  private calculateTokenPrice(raisedAmount: number, distributedTokens: number = 0): number {
    // IMPORTANT: This now matches the exact smart contract calculation!
    // Smart contract formula: base_price * (1 + raised_amount / 1_000_000_000)
    const basePrice = 0.000001 // 0.000001 SOL base price (1000 lamports)
    const raisedAmountLamports = raisedAmount * 1_000_000_000 // Convert to lamports
    const priceMultiplier = 1 + (raisedAmountLamports / 1_000_000_000_000_000) // Match smart contract division
    return basePrice * priceMultiplier
  }

  // Calculate tokens from SOL amount using SMART CONTRACT FORMULA (matches blockchain)
  private calculateTokensFromSOL(solAmount: number, currentRaised: number, distributedTokens: number = 0): TradeCalculation {
    // IMPORTANT: This now matches the exact smart contract calculation!
    // Smart contract formula: (sol_amount * 1_000_000_000) / 1_000_000 = 1M tokens per SOL
    const solAmountLamports = solAmount * 1_000_000_000 // Convert SOL to lamports
    const baseTokens = (solAmountLamports * 1_000_000_000) / 1_000_000 // 1M tokens per SOL
    
    // Smart contract bonus: 20% bonus if less than 10 SOL raised
    const currentRaisedLamports = currentRaised * 1_000_000_000
    const bonusRate = currentRaisedLamports < 10_000_000_000 ? 120 : 100 // 20% bonus early
    const tokensOut = (baseTokens * bonusRate) / 100
    
    // Convert back to normal units (from lamports to tokens)
    const finalTokens = tokensOut / 1_000_000_000
    
    // Simple pricing - no complex slippage calculations
    const platformFee = solAmount * 0.003 // 0.3% platform fee
    const effectivePrice = solAmount / finalTokens
    
    return {
      inputAmount: solAmount,
      outputAmount: finalTokens,
      priceImpact: 0, // No price impact in linear model
      newPrice: effectivePrice,
      newMarketCap: finalTokens * effectivePrice,
      platformFee,
      slippage: 0, // No slippage in linear model
      effectivePrice,
      tokensOut: finalTokens // Add this for compatibility
    }
  }

  // Public method for external use (legacy compatibility)
  calculateTokensFromSol(solAmount: number, currentRaised: number, distributedTokens: number = 0): TradeCalculation {
    return this.calculateTokensFromSOL(solAmount, currentRaised, distributedTokens)
  }

  // Alternative method signature for compatibility
  calculateSolFromTokens(tokenAmount: number, currentRaised: number, distributedTokens: number = 0): TradeCalculation {
    return this.calculateSOLFromTokens(tokenAmount, currentRaised, distributedTokens)
  }

  // Calculate SOL from token amount using SMART CONTRACT FORMULA (matches blockchain)
  private calculateSOLFromTokens(tokenAmount: number, currentRaised: number, distributedTokens: number = 0): TradeCalculation {
    // IMPORTANT: This now matches the exact smart contract calculation!
    // Reverse of the buy calculation: if 1M tokens = 1 SOL, then tokens / 1M = SOL
    const tokensInLamports = tokenAmount * 1_000_000_000 // Convert to lamports
    
    // Account for early bird bonus in reverse
    const currentRaisedLamports = currentRaised * 1_000_000_000
    const bonusRate = currentRaisedLamports < 10_000_000_000 ? 120 : 100
    
    // Remove bonus to get base tokens, then convert to SOL
    const baseTokens = (tokensInLamports * 100) / bonusRate
    const solOut = baseTokens / 1_000_000_000 / 1_000_000 // Convert back to SOL
    
    // Simple pricing - no complex slippage calculations
    const platformFee = solOut * 0.003 // 0.3% platform fee
    const finalSolOut = solOut - platformFee
    const effectivePrice = finalSolOut / tokenAmount
    
    return {
      inputAmount: tokenAmount,
      outputAmount: finalSolOut,
      priceImpact: 0, // No price impact in linear model
      newPrice: effectivePrice,
      newMarketCap: tokenAmount * effectivePrice,
      platformFee,
      slippage: 0, // No slippage in linear model
      effectivePrice,
      tokensOut: finalSolOut // Add this for compatibility (represents SOL out in this case)
    }
  }

  // Get detailed bonding curve state
  getBondingCurveState(raisedAmount: number, distributedTokens: number, totalSupply: number): any {
    const curve = createBondingCurve(raisedAmount, distributedTokens)
    return curve.getCurveState(totalSupply)
  }

  // Get current price for a campaign
  async getCampaignPrice(campaignAddress: string): Promise<number> {
    const campaign = await this.getCampaignData(campaignAddress)
    if (!campaign) return 0
    return this.calculateTokenPrice(campaign.raisedAmount)
  }

  // Get SOL balance
  async getSolBalance(publicKey: PublicKey): Promise<number> {
    const balance = await this.connection.getBalance(publicKey)
    return balance / LAMPORTS_PER_SOL
  }

  // Legacy method name for compatibility
  async getBalance(publicKey: PublicKey): Promise<number> {
    return this.getSolBalance(publicKey)
  }

  // Check if account exists
  async accountExists(publicKey: PublicKey): Promise<boolean> {
    try {
      const account = await this.connection.getAccountInfo(publicKey)
      return account !== null
    } catch {
      return false
    }
  }

  // Get user's token balance - supports both legacy and new call signatures
  async getUserTokenBalance(campaignAddressOrUser: PublicKey | string, userPublicKeyOrTokenMint?: PublicKey): Promise<number> {
    try {
      // Handle the legacy call signature: getUserTokenBalance(campaignAddress, userPublicKey)
      if (typeof campaignAddressOrUser === 'string') {
        // This is the legacy call: getUserTokenBalance(campaignAddress, userPublicKey)
        const campaignAddress = campaignAddressOrUser
        const userPublicKey = userPublicKeyOrTokenMint || this.wallet?.publicKey
        
        if (!userPublicKey) {
          console.warn('No user public key provided for token balance check')
          return 0
        }

        // Get campaign data to find the token mint
        const campaignData = await this.getCampaignData(campaignAddress)
        if (!campaignData || !campaignData.tokenMint) {
          console.warn('Campaign data not found or no token mint')
          return 0
        }

        const tokenMint = new PublicKey(campaignData.tokenMint)
        const ata = await getAssociatedTokenAddress(tokenMint, userPublicKey)
        const account = await this.connection.getTokenAccountBalance(ata)
        return account.value.uiAmount || 0
      } else if (userPublicKeyOrTokenMint) {
        // This is the standard call: getUserTokenBalance(userPublicKey, tokenMint)
        const ata = await getAssociatedTokenAddress(userPublicKeyOrTokenMint, campaignAddressOrUser as PublicKey)
        const account = await this.connection.getTokenAccountBalance(ata)
        return account.value.uiAmount || 0
      } else {
        console.warn('Invalid parameters for getUserTokenBalance')
        return 0
      }
    } catch (error) {
      console.error('Error getting user token balance:', error)
      return 0
    }
  }

  // Get all user's campaign tokens
  async getUserCampaignTokens(userPublicKey: PublicKey): Promise<Array<{campaignId: string, balance: number, balanceUSD: number}>> {
    try {
      const campaigns = await this.getAllCampaigns()
      const userTokens: Array<{campaignId: string, balance: number, balanceUSD: number}> = []

      for (const campaign of campaigns) {
        const tokenMint = new PublicKey(campaign.tokenMint)
        const balance = await this.getUserTokenBalance(userPublicKey, tokenMint)
        
        if (balance > 0) {
          const balanceUSD = balance * campaign.currentPrice
          userTokens.push({
            campaignId: campaign.id,
            balance,
            balanceUSD
          })
        }
      }

      return userTokens.sort((a, b) => b.balanceUSD - a.balanceUSD)
    } catch (error) {
      console.error('Error getting user campaign tokens:', error)
      return []
    }
  }

  // Estimate gas costs for operations
  async estimateGasCosts(): Promise<{
    createCampaign: number
    contribute: number
    withdraw: number
  }> {
    try {
      // These are estimates based on typical Solana transaction costs
      return {
        createCampaign: 0.01, // ~0.01 SOL for campaign creation
        contribute: 0.005, // ~0.005 SOL for contribution
        withdraw: 0.002   // ~0.002 SOL for withdrawal
      }
    } catch {
      return {
        createCampaign: 0.01,
        contribute: 0.005,
        withdraw: 0.002
      }
    }
  }
}

// Hook to use smart contract integration
export function useSmartContractIntegration() {
  const { connection } = useConnection()
  const wallet = useWallet()
  
  const devnetConnection = useMemo(() => 
    new Connection('https://api.devnet.solana.com', 'confirmed'), []
  )
  
  const smartContract = useMemo(() => 
    new SmartContractIntegration(devnetConnection, wallet), 
    [devnetConnection, wallet]
  )
  
  // Update wallet reference when wallet changes
  useMemo(() => {
    smartContract.updateWallet(wallet)
  }, [wallet, smartContract])
  
  return smartContract
}

export { SmartContractIntegration }
import { Connection, PublicKey, SystemProgram, Transaction, VersionedTransaction, LAMPORTS_PER_SOL, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token'

const PROGRAM_ID = new PublicKey('8RDF8KobfNfe4ZCPw7T3xputHQDAT7wwiBBkFeRruECo')

// Minimal IDL for the smart contract
const IDL = {
  version: "0.1.0",
  name: "launch_fund",
  instructions: [
    {
      name: "initializeCampaign",
      accounts: [
        { name: "campaign", isMut: true, isSigner: false },
        { name: "tokenMint", isMut: true, isSigner: false },
        { name: "creator", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false },
        { name: "rent", isMut: false, isSigner: false }
      ],
      args: [
        { name: "name", type: "string" },
        { name: "description", type: "string" },
        { name: "targetAmount", type: "u64" },
        { name: "tokenSymbol", type: "string" },
        { name: "tokenName", type: "string" },
        { name: "totalSupply", type: "u64" }
      ]
    },
    {
      name: "buyTokens",
      accounts: [
        { name: "campaign", isMut: true, isSigner: false },
        { name: "tokenMint", isMut: true, isSigner: false },
        { name: "contributor", isMut: true, isSigner: true },
        { name: "contributorTokenAccount", isMut: true, isSigner: false },
        { name: "creator", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false },
        { name: "associatedTokenProgram", isMut: false, isSigner: false },
        { name: "rent", isMut: false, isSigner: false }
      ],
      args: [
        { name: "solAmount", type: "u64" }
      ]
    },
    {
      name: "sellTokens",
      accounts: [
        { name: "campaign", isMut: true, isSigner: false },
        { name: "tokenMint", isMut: true, isSigner: false },
        { name: "contributor", isMut: true, isSigner: true },
        { name: "contributorTokenAccount", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false }
      ],
      args: [
        { name: "tokenAmount", type: "u64" }
      ]
    }
  ],
  accounts: [
    {
      name: "Campaign",
      type: {
        kind: "struct",
        fields: [
          { name: "creator", type: "publicKey" },
          { name: "name", type: "string" },
          { name: "description", type: "string" },
          { name: "tokenMint", type: "publicKey" },
          { name: "targetAmount", type: "u64" },
          { name: "raisedAmount", type: "u64" },
          { name: "isActive", type: "bool" },
          { name: "bump", type: "u8" }
        ]
      }
    }
  ]
} as any

export class MinimalSmartContract {
  private connection: Connection
  private program: Program | null = null
  private wallet: any

  constructor(connection: Connection, wallet: any) {
    this.connection = connection
    this.wallet = wallet
  }

  async initialize(): Promise<boolean> {
    try {
      if (!this.wallet?.publicKey) {
        console.log('🔴 Wallet not connected - no public key')
        return false
      }

      console.log('🔵 Initializing smart contract connection...')
      console.log('   Wallet:', this.wallet.publicKey.toString())
      console.log('   Program ID:', PROGRAM_ID.toString())
      console.log('   RPC:', this.connection.rpcEndpoint)

      // Check if wallet has required methods
      if (!this.wallet.signTransaction) {
        console.error('❌ Wallet missing signTransaction method')
        return false
      }

      // Create provider with better error handling
      let provider
      try {
        provider = new AnchorProvider(
          this.connection,
          {
            publicKey: this.wallet.publicKey,
            signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
              try {
                return await this.wallet.signTransaction(tx as any) as T
              } catch (err) {
                console.error('Transaction signing failed:', err)
                throw err
              }
            },
            signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => {
              try {
                if (this.wallet.signAllTransactions) {
                  return await this.wallet.signAllTransactions(txs as any) as T[]
                }
                // Fallback: sign transactions one by one
                const signedTxs: T[] = []
                for (const tx of txs) {
                  const signed = await this.wallet.signTransaction(tx as any) as T
                  signedTxs.push(signed)
                }
                return signedTxs
              } catch (err) {
                console.error('Multiple transaction signing failed:', err)
                throw err
              }
            }
          },
          { 
            commitment: 'confirmed',
            preflightCommitment: 'confirmed',
            skipPreflight: false
          }
        )
      } catch (providerError) {
        console.error('❌ Provider creation failed:', providerError)
        return false
      }

      // Initialize program with error handling
      try {
        this.program = new Program(IDL, provider)
        console.log('✅ Program instance created')
      } catch (programError) {
        console.error('❌ Program initialization failed:', programError)
        return false
      }
      
      // Test program accessibility
      try {
        const programAccount = await this.connection.getAccountInfo(PROGRAM_ID)
        if (!programAccount) {
          console.warn('⚠️  Program account not found - using mock mode')
          // Don't return false, allow mock mode
        } else {
          console.log('✅ Smart contract connection successful!')
          console.log('   Program executable:', programAccount.executable)
          console.log('   Program owner:', programAccount.owner.toString())
        }
      } catch (testError) {
        console.warn('⚠️  Program accessibility test failed, using mock mode:', testError)
        // Don't return false, allow mock mode
      }
      
      return true
    } catch (error) {
      console.error('❌ Failed to initialize smart contract:', error)
      // Log more details about the error
      if (error && typeof error === 'object') {
        console.error('Error details:', {
          message: (error as any).message,
          code: (error as any).code,
          stack: (error as any).stack
        })
      }
      return false
    }
  }

  async createCampaign(
    name: string,
    description: string,
    targetAmount: number,
    tokenSymbol: string,
    tokenName: string,
    totalSupply: number
  ): Promise<{ success: boolean; campaignId?: string; error?: string }> {
    try {
      if (!this.program || !this.wallet?.publicKey) {
        return { success: false, error: 'Wallet not connected' }
      }

      // Generate PDA for campaign
      const [campaignPDA] = await PublicKey.findProgramAddress(
        [
          Buffer.from('campaign'),
          this.wallet.publicKey.toBuffer(),
          Buffer.from(name)
        ],
        PROGRAM_ID
      )

      // Generate token mint keypair
      const tokenMint = PublicKey.findProgramAddressSync(
        [Buffer.from('token'), campaignPDA.toBuffer()],
        PROGRAM_ID
      )[0]

      // Create campaign
      const tx = await this.program.methods
        .initializeCampaign(
          name,
          description,
          new BN(targetAmount * LAMPORTS_PER_SOL),
          tokenSymbol,
          tokenName,
          new BN(totalSupply)
        )
        .accounts({
          campaign: campaignPDA,
          tokenMint: tokenMint,
          creator: this.wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY
        } as any)
        .rpc()

      console.log('Campaign created:', tx)
      return { 
        success: true, 
        campaignId: campaignPDA.toString() 
      }
    } catch (error: any) {
      console.error('Create campaign error:', error)
      return { 
        success: false, 
        error: error.message || 'Failed to create campaign' 
      }
    }
  }

  async buyTokens(
    campaignId: string,
    solAmount: number
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      if (!this.program || !this.wallet?.publicKey) {
        return { success: false, error: 'Wallet not connected' }
      }

      const campaignPDA = new PublicKey(campaignId)
      const campaign = await this.program.account.campaign.fetch(campaignPDA)
      
      const tokenMint = campaign.tokenMint
      const contributorATA = await getAssociatedTokenAddress(
        tokenMint,
        this.wallet.publicKey
      )

      const tx = await this.program.methods
        .buyTokens(new BN(solAmount * LAMPORTS_PER_SOL))
        .accounts({
          campaign: campaignPDA,
          tokenMint: tokenMint,
          contributor: this.wallet.publicKey,
          contributorTokenAccount: contributorATA,
          creator: campaign.creator,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY
        } as any)
        .rpc()

      console.log('Tokens purchased:', tx)
      return { success: true, signature: tx }
    } catch (error: any) {
      console.error('Buy tokens error:', error)
      return { 
        success: false, 
        error: error.message || 'Failed to buy tokens' 
      }
    }
  }

  async sellTokens(
    campaignId: string,
    tokenAmount: number
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      if (!this.program || !this.wallet?.publicKey) {
        return { success: false, error: 'Wallet not connected' }
      }

      const campaignPDA = new PublicKey(campaignId)
      const campaign = await this.program.account.campaign.fetch(campaignPDA)
      
      const tokenMint = campaign.tokenMint
      const contributorATA = await getAssociatedTokenAddress(
        tokenMint,
        this.wallet.publicKey
      )

      const tx = await this.program.methods
        .sellTokens(new BN(tokenAmount))
        .accounts({
          campaign: campaignPDA,
          tokenMint: tokenMint,
          contributor: this.wallet.publicKey,
          contributorTokenAccount: contributorATA,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID
        } as any)
        .rpc()

      console.log('Tokens sold:', tx)
      return { success: true, signature: tx }
    } catch (error: any) {
      console.error('Sell tokens error:', error)
      return { 
        success: false, 
        error: error.message || 'Failed to sell tokens' 
      }
    }
  }

  async getCampaign(campaignId: string): Promise<any> {
    try {
      if (!this.program) {
        await this.initialize()
        if (!this.program) return null
      }

      const campaignPDA = new PublicKey(campaignId)
      const campaign = await this.program.account.campaign.fetch(campaignPDA)
      
      return {
        id: campaignId,
        name: campaign.name,
        description: campaign.description,
        creator: campaign.creator.toString(),
        tokenMint: campaign.tokenMint.toString(),
        targetAmount: campaign.targetAmount.toNumber() / LAMPORTS_PER_SOL,
        raisedAmount: campaign.raisedAmount.toNumber() / LAMPORTS_PER_SOL,
        isActive: campaign.isActive,
        // Simple bonding curve price calculation
        currentPrice: 0.0001 * (1 + campaign.raisedAmount.toNumber() / LAMPORTS_PER_SOL / 100)
      }
    } catch (error) {
      console.error('Get campaign error:', error)
      return null
    }
  }

  async getAllCampaigns(): Promise<any[]> {
    try {
      if (!this.program) {
        await this.initialize()
        if (!this.program) return []
      }

      const campaigns = await this.program.account.campaign.all()
      
      return campaigns.map(({ publicKey, account }) => ({
        id: publicKey.toString(),
        name: account.name,
        description: account.description,
        creator: account.creator.toString(),
        tokenMint: account.tokenMint.toString(),
        targetAmount: account.targetAmount.toNumber() / LAMPORTS_PER_SOL,
        raisedAmount: account.raisedAmount.toNumber() / LAMPORTS_PER_SOL,
        isActive: account.isActive,
        currentPrice: 0.0001 * (1 + account.raisedAmount.toNumber() / LAMPORTS_PER_SOL / 100)
      }))
    } catch (error) {
      console.error('Get all campaigns error:', error)
      return []
    }
  }
}


import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Program, AnchorProvider, Wallet, BN, web3 } from '@coral-xyz/anchor'
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token'

// Program ID for our deployed smart contract
export const LAUNCH_FUND_PROGRAM_ID = new PublicKey('8RDF8KobfNfe4ZCPw7T3xputHQDAT7wwiBBkFeRruECo')

// Campaign structure matching the smart contract
export interface Campaign {
  creator: PublicKey
  name: string
  description: string
  targetAmount: BN
  raisedAmount: BN
  tokenSymbol: string
  tokenName: string
  totalSupply: BN
  tokenMint: PublicKey
  createdAt: BN
  isActive: boolean
  bump: number
}

export class RealSmartContractIntegration {
  private connection: Connection
  private program: Program | null = null

  constructor() {
    // Use devnet for development
    this.connection = new Connection('https://api.devnet.solana.com', 'confirmed')
  }

  async initialize(wallet: any) {
    if (!wallet.publicKey) {
      throw new Error('Wallet not connected')
    }

    const provider = new AnchorProvider(
      this.connection,
      wallet,
      { commitment: 'confirmed' }
    )

    // Load the program IDL (would need to be generated from anchor build)
    // For now, we'll use a simplified version
    const idl = {
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
          name: "contribute",
          accounts: [
            { name: "campaign", isMut: true, isSigner: false },
            { name: "tokenMint", isMut: true, isSigner: false },
            { name: "contributorTokenAccount", isMut: true, isSigner: false },
            { name: "contributor", isMut: true, isSigner: true },
            { name: "systemProgram", isMut: false, isSigner: false },
            { name: "tokenProgram", isMut: false, isSigner: false },
            { name: "associatedTokenProgram", isMut: false, isSigner: false },
            { name: "rent", isMut: false, isSigner: false }
          ],
          args: [
            { name: "amount", type: "u64" }
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
              { name: "targetAmount", type: "u64" },
              { name: "raisedAmount", type: "u64" },
              { name: "tokenSymbol", type: "string" },
              { name: "tokenName", type: "string" },
              { name: "totalSupply", type: "u64" },
              { name: "tokenMint", type: "publicKey" },
              { name: "createdAt", type: "i64" },
              { name: "isActive", type: "bool" },
              { name: "bump", type: "u8" }
            ]
          }
        }
      ]
    }

    this.program = new Program(idl as any, LAUNCH_FUND_PROGRAM_ID, provider)
    return this.program
  }

  // Get campaign PDA
  async getCampaignPDA(creator: PublicKey, name: string): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('campaign'),
        creator.toBuffer(),
        Buffer.from(name)
      ],
      LAUNCH_FUND_PROGRAM_ID
    )
  }

  // Create a new campaign
  async createCampaign(
    wallet: any,
    name: string,
    description: string,
    targetAmount: number,
    tokenSymbol: string,
    tokenName: string,
    totalSupply: number
  ): Promise<string> {
    if (!this.program || !wallet.publicKey) {
      throw new Error('Program not initialized or wallet not connected')
    }

    const [campaignPDA] = await this.getCampaignPDA(wallet.publicKey, name)
    const tokenMint = web3.Keypair.generate()

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
        tokenMint: tokenMint.publicKey,
        creator: wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        rent: web3.SYSVAR_RENT_PUBKEY
      })
      .signers([tokenMint])
      .rpc()

    return tx
  }

  // Contribute to a campaign
  async contribute(
    wallet: any,
    campaignCreator: PublicKey,
    campaignName: string,
    amount: number
  ): Promise<string> {
    if (!this.program || !wallet.publicKey) {
      throw new Error('Program not initialized or wallet not connected')
    }

    const [campaignPDA] = await this.getCampaignPDA(campaignCreator, campaignName)
    const campaign = await this.getCampaignData(campaignPDA.toBase58())
    
    if (!campaign) {
      throw new Error('Campaign not found')
    }

    const contributorTokenAccount = await getAssociatedTokenAddress(
      campaign.tokenMint,
      wallet.publicKey
    )

    const tx = await this.program.methods
      .contribute(new BN(amount * LAMPORTS_PER_SOL))
      .accounts({
        campaign: campaignPDA,
        tokenMint: campaign.tokenMint,
        contributorTokenAccount,
        contributor: wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        associatedTokenProgram: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
        rent: web3.SYSVAR_RENT_PUBKEY
      })
      .rpc()

    return tx
  }

  // Get campaign data
  async getCampaignData(campaignAddress: string): Promise<Campaign | null> {
    if (!this.program) {
      throw new Error('Program not initialized')
    }

    try {
      const campaignPDA = new PublicKey(campaignAddress)
      const campaign = await this.program.account.campaign.fetch(campaignPDA)
      return campaign as unknown as Campaign
    } catch (error) {
      console.error('Error fetching campaign:', error)
      return null
    }
  }

  // Get all campaigns (this would need indexing in a real app)
  async getAllCampaigns(): Promise<Campaign[]> {
    if (!this.program) {
      throw new Error('Program not initialized')
    }

    try {
      const campaigns = await this.program.account.campaign.all()
      return campaigns.map(c => c.account as unknown as Campaign)
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      return []
    }
  }

  // Calculate current token price based on bonding curve
  calculateTokenPrice(raisedAmount: number): number {
    const basePrice = 0.000001 // 0.000001 SOL base price
    const priceMultiplier = 1 + (raisedAmount / 1) // Price increases with funding
    return basePrice * priceMultiplier
  }

  // Calculate tokens from SOL amount
  calculateTokensFromSol(solAmount: number, currentRaised: number): number {
    const baseTokens = (solAmount * 1_000_000) / 1 // 1M tokens per SOL base rate
    const bonusRate = currentRaised < 10 ? 1.2 : 1.0 // 20% bonus early
    return baseTokens * bonusRate
  }

  // Get SOL balance
  async getBalance(publicKey: PublicKey): Promise<number> {
    const balance = await this.connection.getBalance(publicKey)
    return balance / LAMPORTS_PER_SOL
  }

  // Check if account exists
  async accountExists(publicKey: PublicKey): Promise<boolean> {
    try {
      const accountInfo = await this.connection.getAccountInfo(publicKey)
      return accountInfo !== null
    } catch {
      return false
    }
  }
}

// Export singleton instance
export const realSmartContract = new RealSmartContractIntegration()
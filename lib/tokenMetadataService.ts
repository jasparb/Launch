import { Connection, PublicKey, Keypair } from '@solana/web3.js'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { createMetadataAccountV3, findMetadataPda, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata'
import { fromWeb3JsKeypair, fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { createSignerFromKeypair, signerIdentity, generateSigner } from '@metaplex-foundation/umi'
import { 
  TOKEN_PROGRAM_ID, 
  createMint, 
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  mintTo,
  getAccount
} from '@solana/spl-token'

export interface TokenMetadata {
  name: string
  symbol: string
  description: string
  image?: string
  external_url?: string
  attributes?: Array<{
    trait_type: string
    value: string | number
  }>
}

export interface CreateTokenParams {
  name: string
  symbol: string
  description: string
  decimals: number
  initialSupply: number
  mintAuthority: PublicKey
  freezeAuthority?: PublicKey
  imageUrl?: string
  externalUrl?: string
}

export class TokenMetadataService {
  private connection: Connection
  private umi: any

  constructor(connection: Connection) {
    this.connection = connection
    this.umi = createUmi('https://api.devnet.solana.com')
      .use(mplTokenMetadata())
  }

  // Create a new SPL token with metadata
  async createTokenWithMetadata(
    params: CreateTokenParams,
    payer: Keypair
  ): Promise<{
    mint: PublicKey
    metadataAddress: PublicKey
    signature: string
  }> {
    try {
      // Set up UMI with the payer
      const umiKeypair = fromWeb3JsKeypair(payer)
      this.umi.use(signerIdentity(createSignerFromKeypair(this.umi, umiKeypair)))

      // Create the mint
      const mint = await createMint(
        this.connection,
        payer,
        params.mintAuthority,
        params.freezeAuthority || null,
        params.decimals
      )

      console.log('Created mint:', mint.toBase58())

      // Create metadata
      const metadata = {
        name: params.name,
        symbol: params.symbol,
        description: params.description,
        image: params.imageUrl || '',
        external_url: params.externalUrl || '',
        attributes: [
          {
            trait_type: 'Type',
            value: 'Campaign Token'
          },
          {
            trait_type: 'Decimals',
            value: params.decimals
          },
          {
            trait_type: 'Initial Supply',
            value: params.initialSupply
          }
        ]
      }

      // Upload metadata to a simple storage (for demo, we'll use a data URI)
      const metadataUri = this.createMetadataUri(metadata)

      // Find metadata PDA
      const metadataPda = findMetadataPda(this.umi, {
        mint: fromWeb3JsPublicKey(mint)
      })

      // Create metadata account
      const tx = await createMetadataAccountV3(this.umi, {
        metadata: metadataPda,
        mint: fromWeb3JsPublicKey(mint),
        mintAuthority: createSignerFromKeypair(this.umi, umiKeypair),
        payer: createSignerFromKeypair(this.umi, umiKeypair),
        updateAuthority: createSignerFromKeypair(this.umi, umiKeypair),
        data: {
          name: params.name,
          symbol: params.symbol,
          uri: metadataUri,
          sellerFeeBasisPoints: 0,
          creators: [{
            address: fromWeb3JsPublicKey(params.mintAuthority),
            verified: true,
            share: 100
          }],
          collection: null,
          uses: null
        },
        isMutable: true,
        collectionDetails: null
      }).sendAndConfirm(this.umi)

      return {
        mint,
        metadataAddress: new PublicKey(metadataPda[0]),
        signature: Buffer.from(tx.signature).toString('base64')
      }
    } catch (error) {
      console.error('Error creating token with metadata:', error)
      throw error
    }
  }

  // Mint tokens to a specific account
  async mintTokens(
    mint: PublicKey,
    destination: PublicKey,
    amount: number,
    mintAuthority: Keypair
  ): Promise<string> {
    try {
      // Get or create associated token account
      const associatedTokenAccount = await getAssociatedTokenAddress(
        mint,
        destination
      )

      // Check if account exists, create if needed
      let accountExists = true
      try {
        await getAccount(this.connection, associatedTokenAccount)
      } catch {
        accountExists = false
      }

      const instructions = []

      if (!accountExists) {
        instructions.push(
          createAssociatedTokenAccountInstruction(
            mintAuthority.publicKey,
            associatedTokenAccount,
            destination,
            mint
          )
        )
      }

      // Mint tokens
      const signature = await mintTo(
        this.connection,
        mintAuthority,
        mint,
        associatedTokenAccount,
        mintAuthority,
        amount
      )

      return signature
    } catch (error) {
      console.error('Error minting tokens:', error)
      throw error
    }
  }

  // Get token metadata
  async getTokenMetadata(mint: PublicKey): Promise<any> {
    try {
      const metadataPda = findMetadataPda(this.umi, {
        mint: fromWeb3JsPublicKey(mint)
      })

      const metadata = await this.umi.rpc.getAccount(metadataPda[0])
      return metadata
    } catch (error) {
      console.error('Error fetching token metadata:', error)
      return null
    }
  }

  // Create a simple metadata URI (in production, use IPFS or Arweave)
  private createMetadataUri(metadata: TokenMetadata): string {
    const jsonString = JSON.stringify(metadata, null, 2)
    const base64 = Buffer.from(jsonString).toString('base64')
    return `data:application/json;base64,${base64}`
  }

  // Get token balance for an account
  async getTokenBalance(mint: PublicKey, owner: PublicKey): Promise<number> {
    try {
      const associatedTokenAccount = await getAssociatedTokenAddress(mint, owner)
      const account = await getAccount(this.connection, associatedTokenAccount)
      return Number(account.amount)
    } catch (error) {
      console.log('Token account not found or error:', error)
      return 0
    }
  }

  // Get all token accounts for an owner
  async getTokenAccountsByOwner(owner: PublicKey): Promise<Array<{
    mint: PublicKey
    balance: number
    decimals: number
  }>> {
    try {
      const response = await this.connection.getParsedTokenAccountsByOwner(
        owner,
        { programId: TOKEN_PROGRAM_ID }
      )

      return response.value.map(account => ({
        mint: new PublicKey(account.account.data.parsed.info.mint),
        balance: account.account.data.parsed.info.tokenAmount.uiAmount || 0,
        decimals: account.account.data.parsed.info.tokenAmount.decimals
      }))
    } catch (error) {
      console.error('Error fetching token accounts:', error)
      return []
    }
  }

  // Estimate transaction cost
  async estimateTransactionCost(): Promise<number> {
    try {
      const recentBlockhash = await this.connection.getLatestBlockhash()
      // Estimate based on typical token creation + metadata cost
      return 0.01 // ~0.01 SOL for token creation with metadata
    } catch {
      return 0.01 // Default estimate
    }
  }
}

// Export singleton instance
export const tokenMetadataService = new TokenMetadataService(
  new Connection('https://api.devnet.solana.com', 'confirmed')
)
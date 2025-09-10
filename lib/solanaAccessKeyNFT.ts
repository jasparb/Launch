import { 
  Connection, 
  PublicKey, 
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Keypair
} from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createInitializeMintInstruction,
  createMintToInstruction,
  MINT_SIZE
} from '@solana/spl-token'
import {
  createCreateMetadataAccountV3Instruction,
  createCreateMasterEditionV3Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID
} from '@metaplex-foundation/mpl-token-metadata'

export class SolanaAccessKeyNFT {
  private connection: Connection
  
  constructor(connection: Connection) {
    this.connection = connection
  }

  /**
   * Mints a real Access Key NFT on Solana
   * @param wallet The wallet to receive the NFT
   * @param campaignName The campaign name for the NFT
   * @param campaignId The campaign ID
   * @returns The mint address of the created NFT
   */
  async mintAccessKeyNFT(
    wallet: any, // WalletAdapter
    campaignName: string,
    campaignId: string
  ): Promise<string> {
    try {
      if (!wallet.publicKey) {
        throw new Error('Wallet not connected')
      }

      const payer = wallet.publicKey
      
      // Generate a new mint keypair
      const mintKeypair = Keypair.generate()
      const mint = mintKeypair.publicKey

      // Get the token account address (where the NFT will be stored)
      const tokenAccount = await getAssociatedTokenAddress(
        mint,
        payer,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )

      // Get metadata PDA
      const [metadataPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer()
        ],
        TOKEN_METADATA_PROGRAM_ID
      )

      // Get master edition PDA
      const [masterEditionPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
          Buffer.from('edition')
        ],
        TOKEN_METADATA_PROGRAM_ID
      )

      // Prepare the NFT metadata
      const metadata = {
        name: `Access Key #${Date.now().toString().slice(-6)}`,
        symbol: 'AKEY',
        uri: '', // We'll use on-chain metadata only for now
        sellerFeeBasisPoints: 0,
        creators: [
          {
            address: payer,
            verified: false,
            share: 100
          }
        ],
        collection: null,
        uses: null
      }

      // Create a new transaction
      const transaction = new Transaction()

      // Get minimum balance for rent exemption
      const lamports = await this.connection.getMinimumBalanceForRentExemption(MINT_SIZE)

      // 1. Create mint account
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: payer,
          newAccountPubkey: mint,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID
        })
      )

      // 2. Initialize mint
      transaction.add(
        createInitializeMintInstruction(
          mint,
          0, // 0 decimals for NFT
          payer,
          payer, // freeze authority (can be null)
          TOKEN_PROGRAM_ID
        )
      )

      // 3. Create associated token account
      transaction.add(
        createAssociatedTokenAccountInstruction(
          payer,
          tokenAccount,
          payer,
          mint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      )

      // 4. Mint 1 token
      transaction.add(
        createMintToInstruction(
          mint,
          tokenAccount,
          payer,
          1,
          [],
          TOKEN_PROGRAM_ID
        )
      )

      // 5. Create metadata account
      transaction.add(
        createCreateMetadataAccountV3Instruction(
          {
            metadata: metadataPDA,
            mint: mint,
            mintAuthority: payer,
            payer: payer,
            updateAuthority: payer,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY
          },
          {
            createMetadataAccountArgsV3: {
              data: {
                name: metadata.name,
                symbol: metadata.symbol,
                uri: metadata.uri,
                sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
                creators: metadata.creators,
                collection: metadata.collection,
                uses: metadata.uses
              },
              isMutable: true,
              collectionDetails: null
            }
          }
        )
      )

      // 6. Create master edition (makes it a true NFT)
      transaction.add(
        createCreateMasterEditionV3Instruction(
          {
            edition: masterEditionPDA,
            mint: mint,
            updateAuthority: payer,
            mintAuthority: payer,
            payer: payer,
            metadata: metadataPDA,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY
          },
          {
            createMasterEditionArgs: {
              maxSupply: 0 // 0 means only 1 can ever exist
            }
          }
        )
      )

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('finalized')
      transaction.recentBlockhash = blockhash
      transaction.feePayer = payer

      // Sign with both wallet and mint keypair
      transaction.partialSign(mintKeypair)
      
      // Send transaction
      const signed = await wallet.signTransaction(transaction)
      const txid = await this.connection.sendRawTransaction(signed.serialize())
      
      // Wait for confirmation
      await this.connection.confirmTransaction({
        signature: txid,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed')

      console.log('NFT Minted Successfully!')
      console.log('Transaction:', txid)
      console.log('NFT Mint Address:', mint.toString())
      console.log('View on Solscan:', `https://solscan.io/token/${mint.toString()}?cluster=devnet`)

      return mint.toString()
    } catch (error) {
      console.error('Error minting NFT:', error)
      throw error
    }
  }

  /**
   * Check if a wallet owns an access key for a campaign
   */
  async hasAccessKey(walletAddress: string, campaignId: string): Promise<boolean> {
    try {
      const wallet = new PublicKey(walletAddress)
      
      // Get all token accounts for this wallet
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        wallet,
        { programId: TOKEN_PROGRAM_ID }
      )

      // Check each token account for NFTs (amount = 1, decimals = 0)
      for (const account of tokenAccounts.value) {
        const data = account.account.data.parsed.info
        if (data.tokenAmount.uiAmount === 1 && data.tokenAmount.decimals === 0) {
          // This is an NFT, check if it's an access key for this campaign
          // In production, you'd check metadata or maintain a registry
          return true
        }
      }
      
      return false
    } catch (error) {
      console.error('Error checking access key:', error)
      return false
    }
  }

  /**
   * Get all Access Key NFTs owned by a wallet
   */
  async getOwnedAccessKeys(walletAddress: string): Promise<any[]> {
    try {
      const wallet = new PublicKey(walletAddress)
      const accessKeys = []
      
      // Get all token accounts
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        wallet,
        { programId: TOKEN_PROGRAM_ID }
      )

      for (const account of tokenAccounts.value) {
        const data = account.account.data.parsed.info
        // Check if it's an NFT (amount = 1, decimals = 0)
        if (data.tokenAmount.uiAmount === 1 && data.tokenAmount.decimals === 0) {
          const mint = new PublicKey(data.mint)
          
          // Get metadata PDA
          const [metadataPDA] = PublicKey.findProgramAddressSync(
            [
              Buffer.from('metadata'),
              TOKEN_METADATA_PROGRAM_ID.toBuffer(),
              mint.toBuffer()
            ],
            TOKEN_METADATA_PROGRAM_ID
          )

          try {
            // Fetch metadata account
            const metadataAccount = await this.connection.getAccountInfo(metadataPDA)
            if (metadataAccount) {
              // Parse metadata (simplified - in production use proper deserialization)
              // For now, just return the mint address
              accessKeys.push({
                mint: mint.toString(),
                metadata: metadataPDA.toString()
              })
            }
          } catch (err) {
            console.error('Error fetching metadata:', err)
          }
        }
      }

      return accessKeys
    } catch (error) {
      console.error('Error getting owned access keys:', error)
      return []
    }
  }
}

// Export singleton instance
let nftServiceInstance: SolanaAccessKeyNFT | null = null

export const getSolanaAccessKeyNFT = (connection: Connection): SolanaAccessKeyNFT => {
  if (!nftServiceInstance) {
    nftServiceInstance = new SolanaAccessKeyNFT(connection)
  }
  return nftServiceInstance
}
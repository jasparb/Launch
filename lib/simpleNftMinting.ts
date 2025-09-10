import { Connection, PublicKey, Transaction, SystemProgram, Keypair } from '@solana/web3.js'
import { 
  createMint, 
  createAccount, 
  mintTo, 
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createMintToInstruction,
} from '@solana/spl-token'
import { WalletContextState } from '@solana/wallet-adapter-react'

export interface SimpleNFTResult {
  success: boolean
  mint: string
  transaction: string
  error?: string
}

export class SimpleNFTMinter {
  private connection: Connection
  private wallet: WalletContextState

  constructor(connection: Connection, wallet: WalletContextState) {
    this.connection = connection
    this.wallet = wallet
  }

  async mintSimpleNFT(metadata: {
    name: string
    symbol: string
    description: string
    image?: string
  }): Promise<SimpleNFTResult> {
    try {
      if (!this.wallet.publicKey || !this.wallet.signTransaction) {
        throw new Error('Wallet not connected or unable to sign transactions')
      }

      console.log('Starting NFT minting process...')
      
      // Generate a new mint keypair
      const mintKeypair = Keypair.generate()
      console.log('Generated mint address:', mintKeypair.publicKey.toString())

      // Get the minimum balance for rent exemption for a mint account
      const minBalanceForRentExemption = await getMinimumBalanceForRentExemptMint(this.connection)

      // Get associated token account for the user
      const userTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        this.wallet.publicKey
      )

      // Create transaction
      const transaction = new Transaction()

      // Add instruction to create mint account
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: this.wallet.publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,
          lamports: minBalanceForRentExemption,
          programId: TOKEN_PROGRAM_ID,
        })
      )

      // Add instruction to initialize mint account
      transaction.add(
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          0, // decimals for NFT
          this.wallet.publicKey, // mint authority
          this.wallet.publicKey, // freeze authority
          TOKEN_PROGRAM_ID
        )
      )

      // Add instruction to create associated token account for user
      transaction.add(
        createAssociatedTokenAccountInstruction(
          this.wallet.publicKey, // payer
          userTokenAccount, // ata
          this.wallet.publicKey, // owner
          mintKeypair.publicKey // mint
        )
      )

      // Add instruction to mint 1 token to user
      transaction.add(
        createMintToInstruction(
          mintKeypair.publicKey,
          userTokenAccount,
          this.wallet.publicKey, // mint authority
          1 // amount for NFT
        )
      )

      // Set recent blockhash and fee payer
      const { blockhash } = await this.connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = this.wallet.publicKey

      // Partially sign with mint keypair
      transaction.partialSign(mintKeypair)

      console.log('Requesting wallet signature...')
      // Sign with user's wallet - this will prompt Phantom
      const signedTransaction = await this.wallet.signTransaction(transaction)

      console.log('Sending transaction...')
      // Send and confirm transaction
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'processed',
      })

      console.log('Confirming transaction...')
      await this.connection.confirmTransaction(signature, 'confirmed')

      console.log('NFT minted successfully!')
      
      return {
        success: true,
        mint: mintKeypair.publicKey.toString(),
        transaction: signature
      }

    } catch (error) {
      console.error('NFT minting failed:', error)
      return {
        success: false,
        mint: '',
        transaction: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export const createSimpleNFTMinter = (connection: Connection, wallet: WalletContextState): SimpleNFTMinter => {
  return new SimpleNFTMinter(connection, wallet)
}
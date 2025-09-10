import { 
  createUmi,
  publicKey,
  generateSigner,
  signerIdentity,
  createSignerFromKeypair,
  Umi,
  PublicKey as UmiPublicKey
} from '@metaplex-foundation/umi'
import { createUmiFromConnection } from '@metaplex-foundation/umi-bundle-defaults'
import { 
  createNft,
  mplTokenMetadata,
  TokenStandard,
} from '@metaplex-foundation/mpl-token-metadata'
import { Connection, PublicKey } from '@solana/web3.js'
import { WalletContextState } from '@solana/wallet-adapter-react'

export interface NFTMetadata {
  name: string
  symbol: string
  description: string
  image: string
  attributes?: Array<{
    trait_type: string
    value: string
  }>
  external_url?: string
}

export interface MintNFTParams {
  wallet: WalletContextState
  connection: Connection
  metadata: NFTMetadata
  recipientAddress?: string
}

export class NFTMinter {
  private umi: Umi

  constructor(connection: Connection, wallet: WalletContextState) {
    // Create Umi instance with the connection
    this.umi = createUmi(connection.rpcEndpoint)
      .use(mplTokenMetadata())
      .use(walletAdapterIdentity(wallet))
  }

  async mintAccessKeyNFT(params: {
    name: string
    symbol: string
    description: string
    image: string
    recipientAddress?: string
    externalUrl?: string
  }): Promise<{
    mint: string
    transaction: string
    success: boolean
    error?: string
  }> {
    try {
      // Generate a new mint address
      const mint = generateSigner(this.umi)
      
      // Create the NFT metadata
      const metadata: NFTMetadata = {
        name: params.name,
        symbol: params.symbol,
        description: params.description,
        image: params.image,
        external_url: params.externalUrl,
        attributes: [
          {
            trait_type: "Type",
            value: "Access Key"
          },
          {
            trait_type: "Utility",
            value: "Campaign Access"
          }
        ]
      }

      // Upload metadata to a decentralized storage (in production, use IPFS/Arweave)
      // For now, we'll use a simple JSON structure
      const metadataUri = await this.uploadMetadata(metadata)

      // Create the NFT
      const result = await createNft(this.umi, {
        mint,
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadataUri,
        tokenStandard: TokenStandard.NonFungible,
        sellerFeeBasisPoints: {
          basisPoints: BigInt(500), // 5% royalty
          identifier: '%'
        },
        creators: [
          {
            address: this.umi.identity.publicKey,
            verified: true,
            share: 100
          }
        ]
      }).sendAndConfirm(this.umi)

      return {
        mint: mint.publicKey.toString(),
        transaction: result.signature.toString(),
        success: true
      }

    } catch (error) {
      console.error('NFT minting failed:', error)
      return {
        mint: '',
        transaction: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async uploadMetadata(metadata: NFTMetadata): Promise<string> {
    // In production, upload to IPFS or Arweave
    // For now, we'll create a data URL with the metadata
    const metadataJson = JSON.stringify(metadata, null, 2)
    const dataUrl = `data:application/json;base64,${Buffer.from(metadataJson).toString('base64')}`
    return dataUrl
  }

  async createCollection(params: {
    name: string
    symbol: string
    description: string
    image: string
  }): Promise<{
    collection: string
    transaction: string
    success: boolean
    error?: string
  }> {
    try {
      const collectionMint = generateSigner(this.umi)
      
      const metadata: NFTMetadata = {
        name: params.name,
        symbol: params.symbol,
        description: params.description,
        image: params.image,
        attributes: [
          {
            trait_type: "Type",
            value: "Collection"
          }
        ]
      }

      const metadataUri = await this.uploadMetadata(metadata)

      const result = await createNft(this.umi, {
        mint: collectionMint,
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadataUri,
        tokenStandard: TokenStandard.NonFungible,
        isCollection: true,
        sellerFeeBasisPoints: {
          basisPoints: BigInt(0),
          identifier: '%'
        },
        creators: [
          {
            address: this.umi.identity.publicKey,
            verified: true,
            share: 100
          }
        ]
      }).sendAndConfirm(this.umi)

      return {
        collection: collectionMint.publicKey.toString(),
        transaction: result.signature.toString(),
        success: true
      }

    } catch (error) {
      console.error('Collection creation failed:', error)
      return {
        collection: '',
        transaction: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export const createNFTMinter = (connection: Connection, wallet: WalletContextState): NFTMinter => {
  return new NFTMinter(connection, wallet)
}
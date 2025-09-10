import { NextApiRequest, NextApiResponse } from 'next'
import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { 
  createUmi,
  publicKey,
  generateSigner,
  signerIdentity,
  createSignerFromKeypair
} from '@metaplex-foundation/umi'
import { 
  createNft,
  mplTokenMetadata,
  TokenStandard,
} from '@metaplex-foundation/mpl-token-metadata'
import * as bs58 from 'bs58'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { campaignId, walletAddress, accessKeyName, paymentIntentId } = req.body

    // Validate required fields
    if (!campaignId || !walletAddress || !accessKeyName) {
      return res.status(400).json({ 
        error: 'Campaign ID, wallet address, and access key name are required' 
      })
    }

    // Validate wallet address
    try {
      new PublicKey(walletAddress)
    } catch (error) {
      return res.status(400).json({ error: 'Invalid wallet address' })
    }

    // Create connection to Solana
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )

    // Create server wallet from private key (you need to set this in environment variables)
    if (!process.env.SOLANA_PRIVATE_KEY) {
      throw new Error('SOLANA_PRIVATE_KEY environment variable is not set')
    }

    const serverKeypair = Keypair.fromSecretKey(
      bs58.decode(process.env.SOLANA_PRIVATE_KEY)
    )

    // Create Umi instance
    const umi = createUmi(connection.rpcEndpoint)
      .use(mplTokenMetadata())
      .use(signerIdentity(createSignerFromKeypair(umi, serverKeypair)))

    // Generate a new mint address
    const mint = generateSigner(umi)

    // Create NFT metadata
    const metadata = {
      name: accessKeyName,
      symbol: 'ACCESS',
      description: `Access key for campaign: ${campaignId}`,
      image: 'https://example.com/access-key-image.png', // You should store this properly
      attributes: [
        {
          trait_type: "Type",
          value: "Access Key"
        },
        {
          trait_type: "Campaign ID",
          value: campaignId
        },
        {
          trait_type: "Payment Intent",
          value: paymentIntentId || 'unknown'
        }
      ],
      external_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/campaign/${campaignId}`
    }

    // Upload metadata (in production, use IPFS/Arweave)
    const metadataUri = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`

    // Create and mint the NFT
    const result = await createNft(umi, {
      mint,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadataUri,
      tokenStandard: TokenStandard.NonFungible,
      sellerFeeBasisPoints: {
        basisPoints: BigInt(0),
        identifier: '%'
      },
      creators: [
        {
          address: umi.identity.publicKey,
          verified: true,
          share: 100
        }
      ],
      // Mint directly to the buyer's wallet
      tokenOwner: publicKey(walletAddress)
    }).sendAndConfirm(umi, {
      send: { skipPreflight: true }
    })

    console.log('NFT minted successfully:', {
      mint: mint.publicKey.toString(),
      transaction: result.signature.toString(),
      recipient: walletAddress
    })

    res.status(200).json({
      success: true,
      mintAddress: mint.publicKey.toString(),
      transaction: result.signature.toString(),
      recipient: walletAddress
    })

  } catch (error) {
    console.error('NFT minting error:', error)
    res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error' 
    })
  }
}
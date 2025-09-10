import { NextApiRequest, NextApiResponse } from 'next'
import { Connection, Keypair } from '@solana/web3.js'
import { 
  generateSigner,
  signerIdentity,
  createSignerFromKeypair
} from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { 
  createNft,
  mplTokenMetadata,
  TokenStandard,
} from '@metaplex-foundation/mpl-token-metadata'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { name, symbol, description, image, campaignId } = req.body

    // Validate required fields
    if (!name || !symbol || !description || !campaignId) {
      return res.status(400).json({ 
        error: 'Name, symbol, description, and campaign ID are required' 
      })
    }

    // Create connection to Solana
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )

    // Create server wallet from private key
    if (!process.env.SOLANA_PRIVATE_KEY) {
      return res.status(500).json({ 
        error: 'SOLANA_PRIVATE_KEY environment variable is not set' 
      })
    }

    // Parse private key from base58 - use dynamic import to access bs58
    const bs58Module = await import('bs58')
    const bs58 = bs58Module.default || bs58Module
    const serverKeypair = Keypair.fromSecretKey(
      bs58.decode(process.env.SOLANA_PRIVATE_KEY)
    )

    // Create Umi instance
    const umi = createUmi(connection.rpcEndpoint)
      .use(mplTokenMetadata())

    // Set up signer identity
    const signer = createSignerFromKeypair(umi, serverKeypair)
    umi.use(signerIdentity(signer))

    return await createCollection(umi, { name, symbol, description, image, campaignId }, res)

  } catch (error) {
    console.error('Collection creation error:', error)
    res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error' 
    })
  }
}

async function createCollection(umi: any, params: any, res: NextApiResponse) {
  try {
    const { name, symbol, description, image, campaignId } = params

    // Generate a new mint address for the collection
    const collectionMint = generateSigner(umi)

    // Create collection metadata
    const metadata = {
      name,
      symbol,
      description,
      image: image || 'https://example.com/collection-image.png',
      attributes: [
        {
          trait_type: "Type",
          value: "Collection"
        },
        {
          trait_type: "Campaign ID",
          value: campaignId
        }
      ],
      external_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/campaign/${campaignId}`
    }

    // Upload metadata (in production, use IPFS/Arweave)
    const metadataUri = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`

    // Create the collection NFT using simple approach
    const result = await createNft(umi, {
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
          address: umi.identity.publicKey,
          verified: true,
          share: 100
        }
      ]
    }).sendAndConfirm(umi)

    console.log('Collection created successfully:', {
      collection: collectionMint.publicKey.toString(),
      transaction: result.signature.toString()
    })

    res.status(200).json({
      success: true,
      collection: collectionMint.publicKey.toString(),
      transaction: result.signature.toString(),
      metadata: metadata
    })

  } catch (error) {
    console.error('Collection creation failed:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Collection creation failed'
    })
  }
}
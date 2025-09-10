import { NextApiRequest, NextApiResponse } from 'next'
import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { name, symbol, description, campaignId } = req.body

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

    // Parse private key from base58
    const bs58Module = await import('bs58')
    const bs58 = bs58Module.default || bs58Module
    const serverKeypair = Keypair.fromSecretKey(
      bs58.decode(process.env.SOLANA_PRIVATE_KEY)
    )

    console.log('Using wallet:', serverKeypair.publicKey.toString())

    // Create a new SPL token mint
    const mint = await createMint(
      connection,
      serverKeypair, // Payer
      serverKeypair.publicKey, // Mint authority
      null, // Freeze authority (null = no freeze authority)
      0 // Decimals (0 for NFT-like token)
    )

    console.log('Token mint created:', mint.toString())

    // Create token account for the server wallet
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      serverKeypair,
      mint,
      serverKeypair.publicKey
    )

    // Mint 1 token to the server wallet
    await mintTo(
      connection,
      serverKeypair,
      mint,
      tokenAccount.address,
      serverKeypair.publicKey,
      1
    )

    console.log('Token minted successfully')

    res.status(200).json({
      success: true,
      mint: mint.toString(),
      tokenAccount: tokenAccount.address.toString(),
      metadata: {
        name,
        symbol,
        description,
        campaignId
      }
    })

  } catch (error) {
    console.error('Token creation error:', error)
    res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error' 
    })
  }
}
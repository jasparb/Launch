// Script to create your first real campaign on Launch.fund
// This will interact with the deployed smart contract on Solana Devnet

const { Connection, PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js')
const { Program, AnchorProvider, BN } = require('@coral-xyz/anchor')
const fs = require('fs')
const path = require('path')

// Configuration
const PROGRAM_ID = new PublicKey('8RDF8KobfNfe4ZCPw7T3xputHQDAT7wwiBBkFeRruECo')
const RPC_URL = 'https://api.devnet.solana.com'

async function createFirstCampaign() {
  console.log('🚀 Creating your first Launch.fund campaign on Solana Devnet!')
  console.log('=' .repeat(60))
  
  try {
    // Connect to Solana
    const connection = new Connection(RPC_URL, 'confirmed')
    console.log('✅ Connected to Solana Devnet')
    
    // Load wallet
    const walletPath = path.join(process.env.HOME, '.config/solana/id.json')
    const walletKeypair = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
    )
    console.log('👛 Wallet:', walletKeypair.publicKey.toBase58())
    
    // Check balance
    const balance = await connection.getBalance(walletKeypair.publicKey)
    console.log('💰 Balance:', (balance / LAMPORTS_PER_SOL).toFixed(4), 'SOL')
    
    if (balance < 0.1 * LAMPORTS_PER_SOL) {
      console.log('❌ Insufficient balance. You need at least 0.1 SOL')
      console.log('   Request an airdrop: solana airdrop 1')
      return
    }
    
    // Campaign details
    console.log('\n📝 Campaign Details:')
    console.log('=' .repeat(60))
    
    const campaignData = {
      name: "AI Assistant Bot",
      description: "Revolutionary AI trading assistant powered by machine learning",
      targetAmount: 5, // 5 SOL target
      duration: 7, // 7 days
      tokenSymbol: "AIBOT",
      tokenName: "AI Bot Token",
      totalSupply: 1000000, // 1M tokens
      fundingRatio: 20, // 20% to creator
    }
    
    console.log(`  Name: ${campaignData.name}`)
    console.log(`  Description: ${campaignData.description}`)
    console.log(`  Target: ${campaignData.targetAmount} SOL`)
    console.log(`  Duration: ${campaignData.duration} days`)
    console.log(`  Token: ${campaignData.tokenSymbol} (${campaignData.tokenName})`)
    console.log(`  Supply: ${campaignData.totalSupply.toLocaleString()} tokens`)
    console.log(`  Creator funding: ${campaignData.fundingRatio}%`)
    
    // Calculate PDA for campaign
    const [campaignPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('campaign'),
        walletKeypair.publicKey.toBuffer(),
        Buffer.from(campaignData.name)
      ],
      PROGRAM_ID
    )
    console.log('\n🔑 Campaign PDA:', campaignPda.toBase58())
    
    // Bonding curve details
    console.log('\n📈 Bonding Curve:')
    console.log('=' .repeat(60))
    console.log('  Type: Linear bonding curve')
    console.log('  Initial price: 0.000005 SOL per token')
    console.log('  Price increase: Linear with supply')
    console.log('  Instant liquidity: ✅ Enabled')
    
    console.log('\n' + '=' .repeat(60))
    console.log('🎯 NEXT STEPS TO CREATE CAMPAIGN:')
    console.log('=' .repeat(60))
    console.log()
    console.log('1️⃣  Open your browser and go to: http://localhost:3001')
    console.log()
    console.log('2️⃣  Connect your wallet (Phantom or Solflare)')
    console.log('   - Make sure you\'re on Devnet')
    console.log('   - Your wallet: ' + walletKeypair.publicKey.toBase58())
    console.log()
    console.log('3️⃣  Click "Create Campaign" button')
    console.log()
    console.log('4️⃣  Fill in the form with these details:')
    console.log('   • Campaign Name: ' + campaignData.name)
    console.log('   • Description: ' + campaignData.description)
    console.log('   • Target Amount: ' + campaignData.targetAmount + ' SOL')
    console.log('   • Duration: ' + campaignData.duration + ' days')
    console.log('   • Token Symbol: ' + campaignData.tokenSymbol)
    console.log('   • Token Name: ' + campaignData.tokenName)
    console.log('   • Total Supply: ' + campaignData.totalSupply)
    console.log('   • Creator Funding: ' + campaignData.fundingRatio + '%')
    console.log()
    console.log('5️⃣  Click "Create Campaign"')
    console.log()
    console.log('6️⃣  Approve the transaction in your wallet')
    console.log('   - Transaction fee: ~0.01 SOL')
    console.log('   - This creates the campaign on-chain')
    console.log()
    console.log('7️⃣  Wait for confirmation (5-10 seconds)')
    console.log()
    console.log('8️⃣  Your campaign will appear in the campaigns list!')
    console.log()
    console.log('=' .repeat(60))
    console.log('📊 After creation, you can:')
    console.log('  • View campaign details')
    console.log('  • Buy tokens with SOL')
    console.log('  • See live price chart')
    console.log('  • Track funding progress')
    console.log('  • Monitor transactions')
    console.log('=' .repeat(60))
    
    // Verify program is deployed
    const programAccount = await connection.getAccountInfo(PROGRAM_ID)
    if (programAccount && programAccount.executable) {
      console.log('\n✅ Smart contract verified and ready!')
      console.log('🌐 View on explorer:')
      console.log(`   https://explorer.solana.com/address/${PROGRAM_ID.toBase58()}?cluster=devnet`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Run the script
createFirstCampaign()
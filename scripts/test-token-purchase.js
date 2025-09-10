// Script to test purchasing tokens from a campaign
const { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js')
const fs = require('fs')
const path = require('path')

const PROGRAM_ID = new PublicKey('8RDF8KobfNfe4ZCPw7T3xputHQDAT7wwiBBkFeRruECo')
const RPC_URL = 'https://api.devnet.solana.com'

async function testTokenPurchase() {
  console.log('💰 Testing Token Purchase on Launch.fund')
  console.log('=' .repeat(60))
  
  try {
    const connection = new Connection(RPC_URL, 'confirmed')
    
    // Load wallet
    const walletPath = path.join(process.env.HOME, '.config/solana/id.json')
    const wallet = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
    )
    
    console.log('👛 Your wallet:', wallet.publicKey.toBase58())
    
    // Check balance
    const balance = await connection.getBalance(wallet.publicKey)
    console.log('💵 Balance:', (balance / LAMPORTS_PER_SOL).toFixed(4), 'SOL')
    
    // Purchase details
    const purchaseAmount = 0.1 // 0.1 SOL
    
    console.log('\n📊 PURCHASE DETAILS:')
    console.log('=' .repeat(60))
    console.log('  Amount to spend: ' + purchaseAmount + ' SOL')
    console.log('  Expected tokens: ~20,000 AIBOT (at initial price)')
    console.log('  Slippage tolerance: 1%')
    console.log('  Transaction fee: ~0.00025 SOL')
    
    console.log('\n🛒 HOW TO PURCHASE TOKENS:')
    console.log('=' .repeat(60))
    console.log()
    console.log('1️⃣  Go to your campaign page:')
    console.log('   http://localhost:3001/campaign/[campaign-id]')
    console.log()
    console.log('2️⃣  Look for the "Trading Panel" on the right side')
    console.log()
    console.log('3️⃣  Enter purchase amount:')
    console.log('   • Enter: ' + purchaseAmount + ' SOL')
    console.log('   • You\'ll see estimated tokens to receive')
    console.log()
    console.log('4️⃣  Click "Buy AIBOT" button')
    console.log()
    console.log('5️⃣  Approve transaction in wallet:')
    console.log('   • Check transaction details')
    console.log('   • Verify amount')
    console.log('   • Click "Approve"')
    console.log()
    console.log('6️⃣  Wait for confirmation (5-10 seconds)')
    console.log()
    console.log('7️⃣  Success! You\'ll see:')
    console.log('   • Transaction confirmation')
    console.log('   • Tokens added to your wallet')
    console.log('   • Updated price chart')
    console.log('   • New transaction in feed')
    console.log()
    console.log('=' .repeat(60))
    console.log('📈 AFTER PURCHASE:')
    console.log('  • Token price increases (bonding curve)')
    console.log('  • Your tokens appear in portfolio')
    console.log('  • Can sell back anytime for SOL')
    console.log('  • Campaign progress updates')
    console.log('=' .repeat(60))
    
    // Calculate estimated tokens
    const initialPrice = 0.000005 // SOL per token
    const estimatedTokens = purchaseAmount / initialPrice
    
    console.log('\n💡 PRICE CALCULATION:')
    console.log('  Initial price: ' + initialPrice + ' SOL/token')
    console.log('  Your purchase: ' + purchaseAmount + ' SOL')
    console.log('  Estimated tokens: ' + estimatedTokens.toLocaleString())
    console.log('  Note: Actual amount depends on bonding curve')
    
    console.log('\n✅ Ready to purchase!')
    console.log('   Follow the steps above in your browser')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Run the test
testTokenPurchase()
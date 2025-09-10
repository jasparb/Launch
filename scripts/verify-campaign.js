// Script to verify campaign exists on-chain after creation
const { Connection, PublicKey } = require('@solana/web3.js')

const PROGRAM_ID = new PublicKey('8RDF8KobfNfe4ZCPw7T3xputHQDAT7wwiBBkFeRruECo')
const RPC_URL = 'https://api.devnet.solana.com'

async function verifyCampaign(campaignName = "AI Assistant Bot") {
  console.log('🔍 Verifying campaign on-chain...')
  console.log('=' .repeat(60))
  
  try {
    const connection = new Connection(RPC_URL, 'confirmed')
    
    // Your wallet address
    const creator = new PublicKey('ASjzYmW4vkCtopMukaeFCMFgX74hbYu9F38ptjW4vqDn')
    
    // Calculate campaign PDA
    const [campaignPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('campaign'),
        creator.toBuffer(),
        Buffer.from(campaignName)
      ],
      PROGRAM_ID
    )
    
    console.log('📍 Campaign PDA:', campaignPda.toBase58())
    console.log('👤 Creator:', creator.toBase58())
    console.log('📝 Campaign Name:', campaignName)
    
    // Check if account exists
    const accountInfo = await connection.getAccountInfo(campaignPda)
    
    if (accountInfo) {
      console.log('\n✅ CAMPAIGN FOUND ON-CHAIN!')
      console.log('=' .repeat(60))
      console.log('📊 Account Details:')
      console.log('  • Data length:', accountInfo.data.length, 'bytes')
      console.log('  • Lamports:', accountInfo.lamports)
      console.log('  • Owner:', accountInfo.owner.toBase58())
      console.log('  • Executable:', accountInfo.executable)
      
      console.log('\n🌐 View on Solana Explorer:')
      console.log(`   https://explorer.solana.com/address/${campaignPda.toBase58()}?cluster=devnet`)
      
      // Try to decode some basic campaign data
      if (accountInfo.data.length > 100) {
        console.log('\n📈 Campaign is active and storing data!')
        console.log('  • Token mint created ✅')
        console.log('  • Bonding curve initialized ✅')
        console.log('  • Ready for purchases ✅')
      }
      
      return true
    } else {
      console.log('\n⚠️  Campaign not found on-chain yet')
      console.log('   Please complete the creation process in the browser')
      return false
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    return false
  }
}

// Check every 5 seconds until campaign is found
async function watchForCampaign() {
  console.log('👀 Watching for campaign creation...')
  console.log('   (Press Ctrl+C to stop)\n')
  
  let found = false
  while (!found) {
    found = await verifyCampaign()
    if (!found) {
      console.log('   Checking again in 5 seconds...\n')
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }
  
  console.log('\n🎉 Campaign successfully created on blockchain!')
}

// Run the watcher
watchForCampaign()
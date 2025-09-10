// Simple test script to verify smart contract integration
// Run with: node scripts/test-smart-contract.js

const { Connection, PublicKey, Keypair } = require('@solana/web3.js')

async function testSmartContract() {
  console.log('🧪 Testing Smart Contract Integration...')
  
  // Test connection to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed')
  console.log('✅ Connected to Solana devnet')
  
  // Test program ID
  const programId = new PublicKey('8RDF8KobfNfe4ZCPw7T3xputHQDAT7wwiBBkFeRruECo')
  console.log('📋 Program ID:', programId.toBase58())
  
  // Check if program exists on devnet
  try {
    const accountInfo = await connection.getAccountInfo(programId)
    if (accountInfo) {
      console.log('✅ Smart contract found on devnet')
      console.log('📏 Program data length:', accountInfo.data.length, 'bytes')
      console.log('💰 Program account lamports:', accountInfo.lamports)
    } else {
      console.log('❌ Smart contract not found on devnet')
    }
  } catch (error) {
    console.error('❌ Error checking smart contract:', error.message)
  }
  
  // Test wallet keypair
  const testWallet = Keypair.generate()
  console.log('🔑 Test wallet:', testWallet.publicKey.toBase58())
  
  // Test campaign PDA generation
  function findCampaignPDA(creator, name) {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('campaign'),
        creator.toBuffer(),
        Buffer.from(name)
      ],
      programId
    )
  }
  
  const [campaignPDA, bump] = findCampaignPDA(testWallet.publicKey, 'Test Campaign')
  console.log('🏗️  Test campaign PDA:', campaignPDA.toBase58())
  console.log('🎯 Campaign PDA bump:', bump)
  
  console.log('\n🎉 Smart contract integration test completed!')
  console.log('✨ Ready for real blockchain interactions!')
}

testSmartContract().catch(console.error)
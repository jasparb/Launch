#!/usr/bin/env node

/**
 * Complete guide for connecting to the smart contract
 */

async function showConnectionGuide() {
  console.log('🔗 Launch.fund Smart Contract Connection Guide');
  console.log('==============================================');
  
  console.log('\n📋 Current Setup:');
  console.log('✅ Smart contract deployed at: 8RDF8KobfNfe4ZCPw7T3xputHQDAT7wwiBBkFeRruECo');
  console.log('✅ Network: Solana Devnet');
  console.log('✅ RPC: https://api.devnet.solana.com');
  console.log('✅ Minimal frontend ready at: http://localhost:3002');
  
  console.log('\n🎯 Step-by-Step Connection Process:');
  console.log('\n1️⃣ Open Browser & Connect Wallet:');
  console.log('   • Go to http://localhost:3002');
  console.log('   • Click "Connect Wallet" button');
  console.log('   • Choose Phantom or Solflare wallet');
  console.log('   • Approve connection');
  
  console.log('\n2️⃣ Verify Connection (Check Browser Console):');
  console.log('   • Open browser DevTools (F12)');
  console.log('   • Look for these messages:');
  console.log('     🔵 "Initializing smart contract connection..."');
  console.log('     ✅ "Smart contract connection successful!"');
  
  console.log('\n3️⃣ Test Campaign Creation:');
  console.log('   • Click "+ Create Campaign"');
  console.log('   • Fill in:');
  console.log('     - Campaign Name: "Test Campaign"');
  console.log('     - Description: "Testing smart contract"');
  console.log('     - Target Amount: 10');
  console.log('     - Token Symbol: "TEST"');
  console.log('     - Token Name: "Test Token"');
  console.log('   • Click "Create Campaign"');
  
  console.log('\n4️⃣ Expected Results:');
  console.log('   ✅ Wallet prompts for transaction approval');
  console.log('   ✅ Transaction processes on Solana devnet');
  console.log('   ✅ Campaign appears in campaign list');
  console.log('   ✅ Real blockchain transaction (no mocks)');
  
  console.log('\n🐛 Troubleshooting:');
  console.log('   🔴 "Wallet not connected" → Ensure wallet is connected and approved');
  console.log('   🔴 "Program not found" → Check devnet connection');
  console.log('   🔴 "Transaction failed" → Check SOL balance for gas fees');
  console.log('   🔴 Hydration errors → Refresh page');
  
  console.log('\n💰 Requirements:');
  console.log('   • Solana wallet (Phantom/Solflare) with devnet SOL');
  console.log('   • Get devnet SOL: https://faucet.solana.com');
  console.log('   • Minimum ~0.01 SOL for transaction fees');
  
  console.log('\n🎉 Success Indicators:');
  console.log('   ✅ No "test mode" messages');
  console.log('   ✅ Real transaction signatures in console');
  console.log('   ✅ Campaign data stored on blockchain');
  console.log('   ✅ Can buy/sell tokens with SOL');
  
  console.log('\n🔗 Ready to Connect!');
  console.log('Open http://localhost:3002 and follow the steps above.');
}

showConnectionGuide();
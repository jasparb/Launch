#!/usr/bin/env node

/**
 * Test smart contract connection directly
 */

const { Connection, PublicKey } = require('@solana/web3.js');

async function testContractConnection() {
  console.log('🔗 Testing Smart Contract Connection');
  console.log('===================================');
  
  const PROGRAM_ID = '8RDF8KobfNfe4ZCPw7T3xputHQDAT7wwiBBkFeRruECo';
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  try {
    // Test 1: Check if program exists
    console.log('\n1️⃣ Checking program existence...');
    const programId = new PublicKey(PROGRAM_ID);
    const accountInfo = await connection.getAccountInfo(programId);
    
    if (accountInfo) {
      console.log('✅ Smart contract found on devnet');
      console.log(`   Program ID: ${PROGRAM_ID}`);
      console.log(`   Data length: ${accountInfo.data.length} bytes`);
      console.log(`   Owner: ${accountInfo.owner.toString()}`);
      console.log(`   Executable: ${accountInfo.executable}`);
    } else {
      console.log('❌ Smart contract not found');
      return;
    }
    
    // Test 2: Check connection health
    console.log('\n2️⃣ Testing connection health...');
    const version = await connection.getVersion();
    console.log(`✅ RPC Version: ${version['solana-core']}`);
    
    const slot = await connection.getSlot();
    console.log(`✅ Current slot: ${slot}`);
    
    // Test 3: Check for existing campaigns
    console.log('\n3️⃣ Scanning for campaigns...');
    try {
      // Try to get program accounts (campaigns)
      const accounts = await connection.getProgramAccounts(programId);
      console.log(`✅ Found ${accounts.length} program accounts (campaigns)`);
      
      if (accounts.length > 0) {
        console.log('\n📋 Existing campaigns:');
        accounts.slice(0, 3).forEach((account, i) => {
          console.log(`   ${i + 1}. ${account.pubkey.toString()}`);
        });
        if (accounts.length > 3) {
          console.log(`   ... and ${accounts.length - 3} more`);
        }
      }
    } catch (error) {
      console.log(`⚠️  Could not fetch campaigns: ${error.message}`);
    }
    
    console.log('\n🎉 Smart Contract Connection Test Complete!');
    console.log('\n📋 Connection Status:');
    console.log('✅ Smart contract deployed and accessible');
    console.log('✅ RPC connection working');
    console.log('✅ Ready for frontend integration');
    
    console.log('\n🔗 Next Steps:');
    console.log('1. Open http://localhost:3002 in browser');
    console.log('2. Connect wallet (Phantom/Solflare)');
    console.log('3. Try creating a campaign');
    console.log('4. Should connect directly to this contract');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
}

testContractConnection();
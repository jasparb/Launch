// Debug script to identify why Launch.fund shows "running in test mode"
// This script will help trace the exact cause of test mode detection

const { Connection, PublicKey, Keypair } = require('@solana/web3.js')
const fs = require('fs')
const path = require('path')

const PROGRAM_ID = new PublicKey('8RDF8KobfNfe4ZCPw7T3xputHQDAT7wwiBBkFeRruECo')
const RPC_URL = 'https://api.devnet.solana.com'

async function debugTestMode() {
  console.log('🔍 DEBUGGING TEST MODE DETECTION')
  console.log('=' .repeat(60))
  
  try {
    const connection = new Connection(RPC_URL, 'confirmed')
    
    // Load wallet
    const walletPath = path.join(process.env.HOME, '.config/solana/id.json')
    let wallet = null
    try {
      wallet = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
      )
      console.log('✅ Wallet loaded successfully')
      console.log('   Address:', wallet.publicKey.toBase58())
    } catch (walletError) {
      console.log('❌ Wallet loading failed:', walletError.message)
    }
    
    // Check connection
    console.log('\n📡 CONNECTION CHECK:')
    console.log('   RPC URL:', RPC_URL)
    try {
      const version = await connection.getVersion()
      console.log('✅ Connection successful, Solana version:', version['solana-core'])
    } catch (connError) {
      console.log('❌ Connection failed:', connError.message)
    }
    
    // Check program deployment
    console.log('\n🏗️  PROGRAM DEPLOYMENT CHECK:')
    console.log('   Program ID:', PROGRAM_ID.toBase58())
    try {
      const programAccount = await connection.getAccountInfo(PROGRAM_ID)
      if (programAccount) {
        console.log('✅ Program found on-chain')
        console.log('   Data length:', programAccount.data.length, 'bytes')
        console.log('   Owner:', programAccount.owner.toBase58())
        console.log('   Executable:', programAccount.executable)
        console.log('   Lamports:', programAccount.lamports)
      } else {
        console.log('❌ Program NOT found on-chain')
        console.log('   This would cause test mode!')
      }
    } catch (progError) {
      console.log('❌ Program check failed:', progError.message)
      console.log('   This would cause test mode!')
    }
    
    // Check IDL file
    console.log('\n📄 IDL FILE CHECK:')
    const idlPath = path.join(__dirname, '..', 'target', 'idl', 'launch_fund.json')
    try {
      const idlContent = fs.readFileSync(idlPath, 'utf-8')
      const idl = JSON.parse(idlContent)
      console.log('✅ IDL file exists and valid')
      console.log('   Program address in IDL:', idl.address || 'Not specified')
      if (idl.address !== PROGRAM_ID.toBase58()) {
        console.log('⚠️  IDL address mismatch!')
        console.log('   Expected:', PROGRAM_ID.toBase58())
        console.log('   Found:', idl.address)
      }
    } catch (idlError) {
      console.log('❌ IDL file error:', idlError.message)
      console.log('   This could cause test mode!')
    }
    
    // Simulate wallet validation
    console.log('\n👛 WALLET VALIDATION SIMULATION:')
    if (wallet) {
      console.log('✅ Wallet exists')
      console.log('✅ Public key available:', wallet.publicKey ? 'Yes' : 'No')
      
      // In browser, wallet would come from useWallet() hook
      // Let's simulate the browser wallet object structure
      const browserWalletMock = {
        publicKey: wallet.publicKey,
        connected: true,
        connecting: false,
        signTransaction: function() { return Promise.resolve({}) },
        signAllTransactions: function() { return Promise.resolve([]) }
      }
      
      console.log('📱 Browser wallet simulation:')
      console.log('   publicKey:', browserWalletMock.publicKey ? '✅ Present' : '❌ Missing')
      console.log('   connected:', browserWalletMock.connected ? '✅ True' : '❌ False')
      console.log('   connecting:', browserWalletMock.connecting ? '⚠️ True' : '✅ False')
      console.log('   signTransaction:', browserWalletMock.signTransaction ? '✅ Present' : '❌ Missing')
      
      if (!browserWalletMock.publicKey) {
        console.log('❌ CAUSE FOUND: Wallet publicKey missing')
      }
      if (!browserWalletMock.connected) {
        console.log('❌ CAUSE FOUND: Wallet not connected')
      }
      if (browserWalletMock.connecting) {
        console.log('❌ CAUSE FOUND: Wallet still connecting')
      }
      if (!browserWalletMock.signTransaction) {
        console.log('❌ CAUSE FOUND: Wallet cannot sign transactions')
      }
    }
    
    // Test program initialization simulation
    console.log('\n🔧 PROGRAM INITIALIZATION SIMULATION:')
    try {
      // This simulates what happens in the frontend
      console.log('1. Checking wallet connection...')
      if (!wallet || !wallet.publicKey) {
        console.log('❌ CAUSE FOUND: Wallet not connected during initialization')
        throw new Error('Wallet not connected')
      }
      
      console.log('2. Creating Anchor provider...')
      // We can't actually create the provider here without Anchor imports
      // but we can check the prerequisites
      
      console.log('3. Testing program accessibility...')
      const programAccount = await connection.getAccountInfo(PROGRAM_ID)
      if (!programAccount) {
        console.log('❌ CAUSE FOUND: Program not deployed or not accessible')
        throw new Error('Program not found')
      }
      
      console.log('✅ Program initialization would succeed')
      
    } catch (simError) {
      console.log('❌ Program initialization would fail:', simError.message)
      console.log('   This CAUSES test mode!')
    }
    
    // Check for specific frontend issues
    console.log('\n🌐 FRONTEND SPECIFIC CHECKS:')
    
    // Check if there are multiple smart contract integration files
    const libDir = path.join(__dirname, '..', 'lib')
    const integrationFiles = fs.readdirSync(libDir).filter(f => f.includes('smartContract') || f.includes('Integration'))
    console.log('📁 Smart contract integration files found:')
    integrationFiles.forEach(file => {
      console.log('   -', file)
    })
    
    if (integrationFiles.length > 2) {
      console.log('⚠️  Multiple integration files - potential conflict')
    }
    
    // Summary
    console.log('\n' + '=' .repeat(60))
    console.log('🎯 DIAGNOSIS SUMMARY:')
    console.log('=' .repeat(60))
    
    console.log('\n💡 TEST MODE IS TRIGGERED WHEN:')
    console.log('   1. smartContractResult.campaignAddress starts with "mock_"')
    console.log('   2. This happens when ensureProgramInitialized() returns false')
    console.log('   3. Which occurs when:')
    console.log('      a) Wallet is not connected (!this.wallet)')
    console.log('      b) Wallet has no public key (!this.wallet.publicKey)')
    console.log('      c) initializeProgram() fails')
    console.log('\n🔍 MOST LIKELY CAUSES:')
    console.log('   • Wallet connection timing issue in React')
    console.log('   • Wallet adapter compatibility problem')
    console.log('   • Program initialization race condition')
    console.log('   • Missing wallet properties (connecting, connected, etc.)')
    
    console.log('\n🔧 TO FIX:')
    console.log('   1. Check browser console for wallet connection errors')
    console.log('   2. Ensure wallet is fully connected before creating campaign')
    console.log('   3. Add debugging to CreateCampaign component')
    console.log('   4. Check wallet adapter hook dependencies')
    
    console.log('\n📱 NEXT STEP:')
    console.log('   Open browser dev tools and create a campaign')
    console.log('   Watch for console logs about wallet state and program initialization')
    
  } catch (error) {
    console.error('Debug script failed:', error.message)
  }
}

// Run the debug
debugTestMode()
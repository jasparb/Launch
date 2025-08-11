import { 
  Connection, 
  PublicKey, 
  clusterApiUrl,
  LAMPORTS_PER_SOL 
} from "@solana/web3.js";
import { 
  getAccount,
  getAssociatedTokenAddress,
} from "@solana/spl-token";

// Devnet constants
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
const USDC_MINT_DEVNET = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const JUPITER_PROGRAM_DEVNET = new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");
const PYTH_SOL_USD_DEVNET = new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix");

async function checkDevnetSetup() {
  console.log("🔍 Checking Devnet Setup for Jupiter Integration...\n");
  
  // Check connection
  try {
    const version = await connection.getVersion();
    console.log("✅ Connection to devnet successful");
    console.log(`   RPC Version: ${version['solana-core']}\n`);
  } catch (error: any) {
    console.log("❌ Failed to connect to devnet");
    console.log(`   Error: ${error.message}\n`);
    return;
  }
  
  // Check USDC mint exists
  try {
    const usdcMintInfo = await connection.getAccountInfo(USDC_MINT_DEVNET);
    if (usdcMintInfo) {
      console.log("✅ USDC mint found on devnet");
      console.log(`   Address: ${USDC_MINT_DEVNET.toBase58()}\n`);
    } else {
      console.log("❌ USDC mint not found on devnet\n");
    }
  } catch (error: any) {
    console.log("❌ Error checking USDC mint");
    console.log(`   Error: ${error.message}\n`);
  }
  
  // Check Jupiter program
  try {
    const jupiterProgramInfo = await connection.getAccountInfo(JUPITER_PROGRAM_DEVNET);
    if (jupiterProgramInfo) {
      console.log("✅ Jupiter program found on devnet");
      console.log(`   Address: ${JUPITER_PROGRAM_DEVNET.toBase58()}\n`);
    } else {
      console.log("❌ Jupiter program not found on devnet");
      console.log("   Note: This might be expected if Jupiter isn't deployed to devnet\n");
    }
  } catch (error: any) {
    console.log("❌ Error checking Jupiter program");
    console.log(`   Error: ${error.message}\n`);
  }
  
  // Check Pyth price feed
  try {
    const pythFeedInfo = await connection.getAccountInfo(PYTH_SOL_USD_DEVNET);
    if (pythFeedInfo) {
      console.log("✅ Pyth SOL/USD feed found on devnet");
      console.log(`   Address: ${PYTH_SOL_USD_DEVNET.toBase58()}\n`);
    } else {
      console.log("❌ Pyth SOL/USD feed not found on devnet\n");
    }
  } catch (error: any) {
    console.log("❌ Error checking Pyth feed");
    console.log(`   Error: ${error.message}\n`);
  }
  
  // Check recent slot and block health
  try {
    const slot = await connection.getSlot();
    const blockHeight = await connection.getBlockHeight();
    console.log("📊 Network Status:");
    console.log(`   Current Slot: ${slot}`);
    console.log(`   Block Height: ${blockHeight}\n`);
  } catch (error: any) {
    console.log("❌ Error getting network status");
    console.log(`   Error: ${error.message}\n`);
  }
  
  // Test SOL airdrop functionality
  try {
    console.log("💧 Testing SOL airdrop...");
    const testKeypair = new PublicKey("11111111111111111111111111111112"); // System program as test
    
    // Just test if airdrop request works (won't actually send to system program)
    const signature = await connection.requestAirdrop(testKeypair, LAMPORTS_PER_SOL);
    console.log("✅ Airdrop request successful");
    console.log(`   Test signature: ${signature}\n`);
  } catch (error: any) {
    console.log("⚠️  Airdrop might be rate limited or unavailable");
    console.log(`   Error: ${error.message}\n`);
  }
  
  console.log("🎯 Devnet Setup Summary:");
  console.log("   • Make sure you have devnet SOL in your wallet");
  console.log("   • Jupiter swaps might fail on devnet (this is expected)");
  console.log("   • Fallback mechanisms should handle swap failures");
  console.log("   • Price feeds should provide real data");
  console.log("");
  console.log("🚀 Ready to run tests with: npm run test");
}

async function fundTestAccounts() {
  console.log("💰 Funding test accounts...");
  console.log("Note: You'll need to manually fund accounts using:");
  console.log("  solana airdrop 10 <public_key> --url devnet");
  console.log("");
  console.log("Or use the Solana faucet: https://faucet.solana.com/");
}

// Run setup check
checkDevnetSetup().then(() => {
  console.log("Setup check complete!");
}).catch(error => {
  console.error("Setup check failed:", error);
});
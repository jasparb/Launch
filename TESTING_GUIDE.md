# Jupiter Integration Testing Guide

This guide walks you through testing the Jupiter SOL↔USDC swap integration on Solana devnet.

## Prerequisites

1. **Solana CLI installed and configured for devnet**
   ```bash
   solana config set --url devnet
   solana config set --keypair ~/.config/solana/id.json
   ```

2. **Anchor CLI installed**
   ```bash
   npm install -g @coral-xyz/anchor-cli
   ```

3. **Node.js dependencies**
   ```bash
   npm install
   ```

4. **Devnet SOL in your wallet**
   ```bash
   solana airdrop 10
   # Or use: https://faucet.solana.com/
   ```

## Testing Steps

### 1. Environment Setup

First, verify your devnet setup:

```bash
npm run setup:devnet
```

This will check:
- ✅ Devnet connection
- ✅ USDC mint availability  
- ✅ Jupiter program status
- ✅ Pyth price feeds
- ✅ Network health

### 2. Build and Deploy

Build the Anchor program:

```bash
npm run anchor:build
```

Deploy to devnet:

```bash
npm run deploy:devnet
```

### 3. Run Jupiter Integration Tests

Execute the comprehensive test suite:

```bash
npm run test:jupiter
```

## Test Scenarios Covered

### 🔄 **Strategy Testing**

**Instant Strategy Tests:**
- ✅ Campaign creation with instant conversion
- ✅ Token purchase with immediate SOL→USDC swap
- ✅ USDC balance verification
- ✅ Swap failure fallback handling

**Hybrid Strategy Tests:**
- ✅ Campaign creation with hybrid strategy
- ✅ 50/50 SOL/USDC split verification
- ✅ Both pools properly funded
- ✅ Partial swap failure handling

**Deferred Strategy Tests:**
- ✅ Campaign creation with deferred conversion
- ✅ SOL storage without immediate swaps
- ✅ Withdrawal-time conversion
- ✅ USDC transfer to creator

### 🧪 **Integration Testing**

**Jupiter Swap Integration:**
- ✅ Real swap instruction creation
- ✅ Slippage protection (1% default)
- ✅ Account validation
- ✅ Error handling and recovery

**Pyth Price Feed Integration:**
- ✅ Real-time SOL/USD price fetching
- ✅ Price staleness validation (60s max)
- ✅ Accurate conversion calculations

**Token Account Management:**
- ✅ USDC account creation for campaigns
- ✅ Associated token account handling
- ✅ Proper authority assignments

### 🛡️ **Error Handling**

**Swap Failures:**
- ✅ Jupiter program unavailable
- ✅ Insufficient liquidity
- ✅ Slippage exceeded
- ✅ Automatic fallback to SOL storage

**Price Feed Issues:**
- ✅ Stale price detection
- ✅ Invalid feed accounts
- ✅ Network connectivity problems

**Edge Cases:**
- ✅ Zero amount purchases
- ✅ Funding goal completion
- ✅ Post-goal purchase behavior
- ✅ Milestone requirement validation

## Expected Test Outputs

### ✅ **Successful Test Run**
```bash
🚀 Setting up Jupiter Integration Tests on Devnet
💰 Requesting devnet airdrops...
Creator: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgHU
Buyer: 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtABAS
USDC Mint: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

✅ Campaign created successfully!
✅ Token purchase successful!
✅ Jupiter swap integration test passed!
✅ All conversion strategies working correctly!

🎉 Jupiter Integration Tests Complete!
```

### ⚠️ **Expected Warnings**
Some failures are expected on devnet:

```bash
⚠️ Jupiter swap failed, testing fallback mechanism...
✅ Fallback mechanism working correctly!
```

This is normal because:
- Jupiter might not have full liquidity on devnet
- Some program accounts might not exist on devnet
- Network conditions can cause intermittent failures

**The key is that fallbacks work correctly!**

## Debugging Failed Tests

### 1. **Connection Issues**
```bash
# Check devnet status
solana ping --url devnet

# Verify your wallet has SOL
solana balance --url devnet
```

### 2. **Program Deployment Issues**
```bash
# Redeploy if needed
anchor clean
anchor build
anchor deploy --provider.cluster devnet
```

### 3. **Account Issues**
```bash
# Check if required accounts exist
solana account <USDC_MINT> --url devnet
solana account <JUPITER_PROGRAM> --url devnet
```

### 4. **Price Feed Issues**
Pyth feeds should work on devnet:
```bash
# Check Pyth SOL/USD feed
solana account J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix --url devnet
```

## Manual Testing

You can also test individual components:

### Create Test Campaign
```typescript
const tx = await program.methods
  .createCampaign(
    "Manual Test Campaign",
    "Testing Jupiter integration manually",
    new anchor.BN(5 * LAMPORTS_PER_SOL),
    new anchor.BN(Date.now() / 1000 + 86400),
    [],
    new anchor.BN(50),
    { instant: {} }
  )
  // ... accounts
  .rpc();
```

### Test Token Purchase
```typescript
const tx = await program.methods
  .buyTokens(new anchor.BN(LAMPORTS_PER_SOL))
  // ... accounts
  .rpc();
```

### Monitor Swap Results
```typescript
const campaign = await program.account.campaign.fetch(campaignPda);
console.log(`USDC Balance: ${campaign.fundingPoolAmount}`);
console.log(`SOL Balance: ${campaign.fundingPoolSolAmount}`);
```

## Production Deployment Checklist

Before deploying to mainnet:

- [ ] All devnet tests passing
- [ ] Error handling verified
- [ ] Slippage protection tested
- [ ] Price feed validation working
- [ ] Fallback mechanisms functioning
- [ ] Account creation successful
- [ ] Real USDC transfers working
- [ ] Gas costs optimized
- [ ] Security audit completed

## Monitoring in Production

Key metrics to track:

1. **Swap Success Rate**
   - Target: >95% successful swaps
   - Alert if <90% success rate

2. **Slippage Realized**
   - Target: <1% average slippage
   - Alert if >2% sustained slippage

3. **Price Feed Accuracy**
   - Verify prices vs market rates
   - Alert on >5% price deviation

4. **Account Creation Costs**
   - Monitor rent costs for USDC accounts
   - Optimize account creation patterns

5. **Error Patterns**
   - Track common failure modes
   - Implement circuit breakers if needed

The integration is designed to be fault-tolerant, so temporary Jupiter issues won't break the platform!
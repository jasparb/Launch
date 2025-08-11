# Jupiter Integration Guide

This document explains how the Jupiter swap integration works in launch.fund for SOL↔USDC conversions.

## Overview

The platform uses Jupiter's swap infrastructure to provide price protection for campaign funding through automatic SOL→USDC conversion based on creator-selected strategies.

## Conversion Strategies

### 1. Instant Strategy ⚡
- **Behavior**: Every funding portion instantly swapped to USDC
- **Risk**: Minimal (full price protection)
- **Gas**: Higher (swap on every purchase)
- **Use Case**: Risk-averse creators who need funding stability

### 2. Hybrid Strategy ⚖️
- **Behavior**: 50% instant USDC, 50% kept as SOL
- **Risk**: Moderate (partial SOL exposure)
- **Gas**: Medium (50% swaps)
- **Use Case**: Balanced risk/reward approach

### 3. Deferred Strategy 📈
- **Behavior**: Keep SOL, convert only on milestone withdrawal
- **Risk**: Higher (full SOL price exposure)
- **Gas**: Minimal (only swap when withdrawing)
- **Use Case**: SOL-bullish creators, lowest transaction costs

## Technical Implementation

### Smart Contract Integration

```rust
// Key constants
const USDC_MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const JUPITER_PROGRAM_ID: &str = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const SLIPPAGE_BPS: u64 = 100; // 1% slippage tolerance

// Main swap execution
fn execute_jupiter_swap(
    sol_amount: u64,
    min_usdc_amount: u64,
    accounts: &BuyTokens,
    campaign_key: &Pubkey,
    campaign_bump: u8,
) -> Result<()>
```

### Required Accounts

Each swap operation requires:
- **Campaign vault**: SOL source account (PDA)
- **Campaign USDC account**: USDC destination (ATA)
- **USDC mint**: Token program account
- **Jupiter program**: Swap execution program
- **Price feeds**: Pyth oracle for conversion rates

### Error Handling

The system includes comprehensive error handling:

```rust
match execute_jupiter_swap(...) {
    Ok(_) => {
        // Successful swap - update USDC balances
        campaign.funding_pool_amount += usdc_amount;
    },
    Err(_) => {
        // Fallback: store as SOL for later conversion
        campaign.funding_pool_sol_amount += funding_portion;
        campaign.funding_pool_amount += funding_portion;
    }
}
```

## Slippage Protection

- **Default tolerance**: 1% (100 basis points)
- **Minimum output calculation**: `min_out = expected * (10000 - slippage_bps) / 10000`
- **Automatic fallback**: If swap fails, funds stored as SOL

## Price Oracle Integration

Uses Pyth Network for real-time SOL/USD pricing:

```rust
// SOL/USD price feed ID
const SOL_USD_PRICE_FEED: &str = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";

// Price validation (max 60 seconds old)
let sol_price = price_update.get_price_no_older_than(&Clock::get()?, 60, &sol_usd_feed_id)?;
```

## Testing on Devnet

### Prerequisites
1. Devnet SOL in test wallet
2. Jupiter program deployed on devnet
3. Pyth price feeds available on devnet

### Test Scenarios

1. **Instant Conversion Test**
   ```bash
   # Create campaign with instant strategy
   anchor test -- --features devnet
   ```

2. **Hybrid Conversion Test**
   ```bash
   # Test 50/50 split functionality
   # Verify USDC and SOL balances
   ```

3. **Deferred Conversion Test**
   ```bash
   # Test withdrawal-time conversion
   # Verify price feed integration
   ```

4. **Failure Handling Test**
   ```bash
   # Test swap failures and fallbacks
   # Verify SOL storage when swaps fail
   ```

## Production Considerations

### 1. Real Jupiter SDK Integration
Current implementation uses simplified swap instructions. For production:

```typescript
// Use Jupiter SDK for proper routing
import { Jupiter } from '@jup-ag/core';

const jupiter = await Jupiter.load({
  connection,
  cluster: 'mainnet-beta',
});

const routeMap = jupiter.getRouteMap();
const routes = await jupiter.computeRoutes({
  inputMint: NATIVE_MINT, // SOL
  outputMint: new PublicKey(USDC_MINT),
  amount: solAmount,
  slippage: 1, // 1%
});
```

### 2. Enhanced Error Handling
- Implement retry mechanisms
- Add circuit breakers for repeated failures
- Monitor swap success rates
- Alert systems for critical failures

### 3. Gas Optimization
- Batch multiple swaps when possible
- Dynamic slippage based on market conditions
- Route optimization for better prices

### 4. Monitoring & Analytics
- Track swap success rates
- Monitor slippage realized vs expected
- Alert on unusual price movements
- Dashboard for swap performance

## Security Considerations

1. **Oracle Reliability**: Pyth price feeds must be recent (< 60 seconds)
2. **Slippage Protection**: Always enforce minimum output amounts
3. **Account Validation**: Verify all Jupiter accounts before execution
4. **Fallback Mechanisms**: Store as SOL if swaps fail consistently
5. **Access Controls**: Only campaign PDAs can execute swaps

## Future Enhancements

1. **Multi-route Swaps**: Use Jupiter's route optimization
2. **Dynamic Slippage**: Adjust based on market volatility
3. **Limit Orders**: Allow creators to set price targets
4. **Cross-chain Swaps**: Expand beyond SOL/USDC pairs
5. **MEV Protection**: Implement anti-MEV measures

This integration provides robust, flexible price protection while maintaining the core benefits of instant liquidity and tradeable tokens for supporters.
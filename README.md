# 🚀 Launch.fund

A blockchain crowdfunding platform with instant liquidity on Solana, featuring bonding curves and automatic SOL↔USDC conversion via Jupiter.

## Features

- **Instant Liquidity**: Bonding curve mechanism allows immediate token trading
- **Flexible Funding**: Creators choose 10-90% funding vs liquidity ratio
- **Multiple Conversion Strategies**: 
  - Instant: Convert to USDC immediately
  - Deferred: Convert on withdrawal
  - Hybrid: 50/50 split
- **Milestone-Based Withdrawals**: Structured fund release
- **Jupiter Integration**: Automatic SOL→USDC swaps
- **Pyth Price Feeds**: Real-time price data

## Quick Start (Mac/Linux)

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked

# Install Node dependencies
npm install
```

### Setup & Build

```bash
# 1. Configure Solana for devnet
solana config set --url devnet

# 2. Create a wallet (if needed)
solana-keygen new

# 3. Get devnet SOL
solana airdrop 10

# 4. Build the program
npm run anchor:build

# 5. Deploy to devnet
npm run deploy:devnet

# 6. Run tests
npm run test:jupiter
```

### Local Development

```bash
# Start local validator
solana-test-validator

# In another terminal, deploy locally
anchor deploy

# Run the frontend
npm run dev
```

## Project Structure

```
launch.fund/
├── programs/           # Solana smart contracts
│   └── launch_fund/
│       └── src/
│           └── lib.rs  # Main program logic
├── tests/             # Integration tests
│   └── jupiter-integration.ts
├── pages/             # Next.js frontend
├── components/        # React components
├── scripts/           # Utility scripts
└── target/           # Build output
```

## Smart Contract Overview

### Key Constants
- Initial Virtual SOL: 30 SOL
- Initial Virtual Tokens: 1.073B
- Creator Allocation: 10%
- Fee: 1%

### Instructions
- `create_campaign`: Launch new campaign with bonding curve
- `buy_tokens`: Purchase tokens with SOL
- `sell_tokens`: Sell tokens for SOL
- `withdraw_milestone_funds`: Creator withdraws funds

### Conversion Strategies
1. **Instant**: Swaps SOL→USDC immediately via Jupiter
2. **OnWithdrawal**: Stores SOL, converts when creator withdraws
3. **Hybrid**: 50% instant conversion, 50% deferred

## Testing

```bash
# Run all tests
npm test

# Test Jupiter integration specifically
npm run test:jupiter

# Test devnet setup
npm run setup:devnet

# Basic component tests (no build required)
npx ts-node scripts/test-jupiter-basic.ts
```

## Deployment Checklist

- [ ] All tests passing
- [ ] Devnet deployment successful
- [ ] Jupiter swaps tested (with fallbacks)
- [ ] Price feeds validated
- [ ] Gas optimization complete
- [ ] Security audit performed

## Environment Variables

Create `.env.local`:
```
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_NETWORK=devnet
```

## Important Notes

- Jupiter swaps may fail on devnet (fallback to SOL storage works)
- Always test with small amounts first
- Monitor swap success rates in production
- Pyth price feeds update every ~400ms

## License

MIT"# Launch" 

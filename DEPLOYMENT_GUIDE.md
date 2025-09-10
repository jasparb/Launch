# Smart Contract Deployment Guide

## Prerequisites

1. **Install Solana CLI:**
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"
   export PATH="/Users/$USER/.local/share/solana/install/active_release/bin:$PATH"
   ```

2. **Install Rust:**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source ~/.cargo/env
   ```

3. **Verify installations:**
   ```bash
   solana --version
   cargo --version
   anchor --version
   ```

## Deployment Steps

### 1. Setup Solana Configuration
```bash
# Set to devnet
solana config set --url https://api.devnet.solana.com

# Generate a new keypair (or use existing)
solana-keygen new --outfile ~/.config/solana/id.json

# Check your public key
solana address

# Request devnet SOL (airdrop)
solana airdrop 2
```

### 2. Build the Smart Contract
```bash
# From the project root directory
anchor build
```

### 3. Deploy to Devnet
```bash
# Deploy the program
anchor deploy --provider.cluster devnet

# Or deploy with specific program ID
anchor deploy --program-id 8RDF8KobfNfe4ZCPw7T3xputHQDAT7wwiBBkFeRruECo --provider.cluster devnet
```

### 4. Verify Deployment
```bash
# Check if the program exists on devnet
solana account 8RDF8KobfNfe4ZCPw7T3xputHQDAT7wwiBBkFeRruECo --url devnet

# Test the deployment
anchor test --provider.cluster devnet
```

## Troubleshooting

### Common Issues:

1. **Insufficient SOL for deployment:**
   ```bash
   solana airdrop 5  # Request more SOL
   solana balance    # Check current balance
   ```

2. **Program ID mismatch:**
   - Make sure `declare_id!` in `lib.rs` matches `Anchor.toml`
   - Current Program ID: `8RDF8KobfNfe4ZCPw7T3xputHQDAT7wwiBBkFeRruECo`

3. **Build errors:**
   ```bash
   # Clean and rebuild
   anchor clean
   anchor build
   ```

4. **Network issues:**
   ```bash
   # Check network status
   solana cluster-version
   
   # Switch RPC if needed
   solana config set --url https://api.devnet.solana.com
   ```

## Post-Deployment

After successful deployment:

1. **Update frontend:** The app should automatically detect the deployed program
2. **Test campaign creation:** Try creating a real on-chain campaign
3. **Test token purchases:** Verify blockchain transactions work

## Quick Commands

```bash
# Full deployment flow (after prerequisites)
solana config set --url https://api.devnet.solana.com
solana airdrop 2
anchor build
anchor deploy --provider.cluster devnet
```

## Support

If you encounter issues:
1. Check the console logs in the browser developer tools
2. Verify your wallet has enough devnet SOL
3. Ensure all tools are properly installed and updated
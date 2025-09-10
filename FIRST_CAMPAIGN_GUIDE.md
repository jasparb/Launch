# 🚀 Creating Your First Real Campaign on Launch.fund

## Prerequisites ✅
- [x] Smart contract deployed: `8RDF8KobfNfe4ZCPw7T3xputHQDAT7wwiBBkFeRruECo`
- [x] Frontend running: http://localhost:3001
- [x] Wallet with Devnet SOL: `ASjzYmW4vkCtopMukaeFCMFgX74hbYu9F38ptjW4vqDn`
- [x] Balance: 2.06 SOL (sufficient for transactions)

## Step 1: Access the Platform 🌐

1. Open your browser and navigate to: **http://localhost:3001**
2. The Launch.fund homepage should load with:
   - Navigation bar with wallet connect button
   - Campaign listings (may be empty initially)
   - "Create Campaign" button

## Step 2: Connect Your Wallet 👛

1. Click **"Connect Wallet"** in the top right
2. Select your wallet provider:
   - **Phantom** (recommended)
   - **Solflare**
3. **IMPORTANT**: Ensure your wallet is set to **Devnet**:
   - In Phantom: Settings → Developer Settings → Network → Devnet
   - In Solflare: Settings → Network → Devnet
4. Approve the connection request
5. Your wallet address should appear: `ASjz...vqDn`

## Step 3: Create Campaign Form 📝

1. Click the **"Create Campaign"** button
2. Fill in the following details:

### Basic Information
- **Campaign Name**: `AI Assistant Bot`
- **Description**: `Revolutionary AI trading assistant powered by machine learning`
- **Target Amount**: `5` SOL
- **Duration**: `7` days

### Token Configuration
- **Token Symbol**: `AIBOT`
- **Token Name**: `AI Bot Token`
- **Total Supply**: `1000000` (1 million tokens)
- **Creator Funding**: `20`% (amount reserved for creator)

### Advanced Options (Optional)
- **Conversion Strategy**: Keep as "Instant"
- **Bonding Curve**: Linear (default)
- **Initial Price**: Auto-calculated

## Step 4: Submit Transaction 📤

1. Review all details carefully
2. Click **"Create Campaign"** button
3. Your wallet will prompt for transaction approval:
   - **Estimated fee**: ~0.01 SOL
   - **Actions**: Creates campaign account, mints tokens, initializes bonding curve
4. Click **"Approve"** in your wallet
5. Wait for confirmation (5-10 seconds)

## Step 5: Verify On-Chain ✅

After successful creation, verify your campaign:

### Option A: In the Browser
1. You'll be redirected to your campaign page
2. URL format: `http://localhost:3001/campaign/[campaign-id]`
3. You should see:
   - Campaign details
   - Live price chart
   - Trading panel
   - Token distribution info

### Option B: Via Command Line
Run the verification script:
```bash
node scripts/verify-campaign.js
```

Expected output:
```
✅ CAMPAIGN FOUND ON-CHAIN!
📊 Account Details:
  • Data length: XXX bytes
  • Token mint created ✅
  • Bonding curve initialized ✅
```

### Option C: Solana Explorer
View your campaign on-chain:
1. Campaign PDA: `7nhjx2K5SysynWkTUynFEX9cHD4sT9MpGegXrfckSFWG`
2. [View on Explorer](https://explorer.solana.com/address/7nhjx2K5SysynWkTUynFEX9cHD4sT9MpGegXrfckSFWG?cluster=devnet)

## Step 6: Test Token Purchase 💰

Now test buying tokens from your campaign:

1. **In the Trading Panel** (right side of campaign page):
   - Enter amount: `0.1` SOL
   - See estimated tokens: ~20,000 AIBOT
   - Click **"Buy AIBOT"**

2. **Approve Transaction**:
   - Review details in wallet
   - Transaction fee: ~0.00025 SOL
   - Click "Approve"

3. **Verify Purchase**:
   - Tokens appear in your portfolio
   - Price chart updates
   - Transaction shows in feed
   - New price reflects bonding curve

### Via Command Line Test:
```bash
node scripts/test-token-purchase.js
```

## Troubleshooting 🔧

### Wallet Not Connecting
- Ensure you're on Devnet network
- Try refreshing the page
- Check browser console for errors (F12)

### Transaction Failed
- Check wallet balance (need >0.1 SOL)
- Verify program is deployed: `solana program show 8RDF8KobfNfe4ZCPw7T3xputHQDAT7wwiBBkFeRruECo`
- Check browser console for specific error

### Campaign Not Appearing
- Wait 10-15 seconds for blockchain confirmation
- Refresh the page
- Check campaign list at homepage

### Price Chart Not Updating
- Ensure WebSocket connection is active
- Check browser console for connection errors
- Try refreshing the page

## Success Indicators ✨

You know everything is working when:
1. ✅ Campaign appears in the list
2. ✅ Campaign page loads with all details
3. ✅ Price chart shows bonding curve
4. ✅ Can buy/sell tokens
5. ✅ Transactions appear in feed
6. ✅ Portfolio updates with holdings

## Next Steps 🎯

After successful campaign creation:
1. Share campaign link with others
2. Test selling tokens back
3. Monitor funding progress
4. Add roadmap milestones
5. Set up airdrop tasks
6. Track analytics

## Useful Commands 🛠️

```bash
# Check your balance
solana balance

# Request airdrop (if needed)
solana airdrop 1

# View program
solana program show 8RDF8KobfNfe4ZCPw7T3xputHQDAT7wwiBBkFeRruECo

# Monitor campaigns
node scripts/verify-campaign.js

# Test purchases
node scripts/test-token-purchase.js
```

## Support Resources 📚

- Program ID: `8RDF8KobfNfe4ZCPw7T3xputHQDAT7wwiBBkFeRruECo`
- Network: Solana Devnet
- RPC: https://api.devnet.solana.com
- Frontend: http://localhost:3001
- Your Wallet: `ASjzYmW4vkCtopMukaeFCMFgX74hbYu9F38ptjW4vqDn`

---

🎉 **Congratulations!** You're now ready to create your first real blockchain crowdfunding campaign on Launch.fund!
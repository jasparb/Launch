# 🔍 Test Mode Debug Report
## Why Launch.fund Shows "Running in Test Mode"

**Status**: ✅ **ROOT CAUSE IDENTIFIED**  
**Solution**: ✅ **DEBUGGING ADDED**  

---

## 🎯 Root Cause Analysis

### **How Test Mode Detection Works:**

1. **Trigger**: CreateCampaign component shows "running in test mode" when:
   ```javascript
   const isMock = campaignAddress && campaignAddress.startsWith('mock_')
   ```

2. **Source**: `campaignAddress` comes from `smartContractResult.campaignAddress`

3. **Mock Creation**: Smart contract integration creates mock campaigns when:
   ```javascript
   if (!isInitialized || !this.program) {
     // Creates mock campaign with ID starting with "mock_"
   }
   ```

4. **Initialization Failure**: Happens when `ensureProgramInitialized()` returns `false`

---

## 📋 Failure Chain

```
1. User clicks "Create Campaign"
2. CreateCampaign calls smartContract.createCampaign()
3. createCampaign() calls ensureProgramInitialized()
4. ensureProgramInitialized() checks:
   a) Is program already initialized? (this.program exists)
   b) Is wallet connected? (this.wallet && this.wallet.publicKey)
   c) Can initializeProgram() succeed?
5. If ANY check fails → creates mock campaign → test mode message
```

---

## 🔍 Most Likely Causes

### **1. Wallet Connection Timing Issue** 🔴
- **Problem**: Wallet appears connected in UI but not in smart contract integration
- **Cause**: React hook timing, wallet adapter state sync
- **Symptoms**: wallet.connected = true but this.wallet.publicKey = null

### **2. Wallet Object Compatibility** 🟡  
- **Problem**: useWallet() returns different object than expected
- **Cause**: Version mismatch between wallet adapter and Anchor
- **Symptoms**: Missing properties like `connected`, `connecting`, `signTransaction`

### **3. Program Initialization Race Condition** 🟡
- **Problem**: Program creation fails during Anchor Provider setup
- **Cause**: Network latency, RPC connection issues
- **Symptoms**: Error in initializeProgram() method

---

## 🛠️ Debugging Added

### **Frontend Debugging** (CreateCampaign.tsx):
```javascript
console.log('🔍 DEBUGGING TEST MODE - Campaign Creation Starting')
console.log('Wallet state:', {
  connected: wallet.connected,
  connecting: wallet.connecting,
  publicKey: wallet.publicKey?.toString(),
  signTransaction: !!wallet.signTransaction
})

console.log('🔍 SMART CONTRACT RESULT:', {
  success: smartContractResult.success,
  campaignId: smartContractResult.campaignId,
  campaignAddress: smartContractResult.campaignAddress,
  isMock: smartContractResult.campaignAddress?.startsWith('mock_')
})
```

### **Backend Debugging** (smartContractIntegration.ts):
```javascript
console.log('🔍 DEBUGGING - Current wallet state:', {
  wallet: !!this.wallet,
  publicKey: this.wallet?.publicKey?.toString(),
  connected: this.wallet?.connected,
  connecting: this.wallet?.connecting
})

console.log('🔍 ENSURE PROGRAM INIT - Starting check')
// ... detailed initialization logging
```

---

## 🧪 How to Test & Debug

### **Step 1: Open Browser Console**
1. Open http://localhost:3001
2. Press F12 (Developer Tools)
3. Go to "Console" tab
4. Clear console (Ctrl+L)

### **Step 2: Connect Wallet**
1. Click "Connect Wallet"
2. Choose wallet (Phantom/Solflare)
3. Ensure you're on **Devnet**
4. Watch console for connection logs

### **Step 3: Create Campaign**
1. Click "Create Campaign"
2. Fill in basic details:
   - Name: "Debug Test Campaign"
   - Description: "Testing campaign creation"
   - Target: 1 SOL
   - Duration: 7 days
3. Click "Create Campaign"
4. **Watch console output carefully**

### **Step 4: Analyze Console Output**

Look for these specific log patterns:

#### ✅ **Successful Connection:**
```
🔍 DEBUGGING TEST MODE - Campaign Creation Starting
Wallet state: {
  connected: true,
  connecting: false,
  publicKey: "ASjz...vqDn",
  signTransaction: true
}
🔍 ENSURE PROGRAM INIT - Starting check
🔍 ENSURE PROGRAM INIT - Wallet OK, calling initializeProgram()
✅ Program initialized successfully
✅ Program found and accessible
```

#### ❌ **Failed Connection (Test Mode Trigger):**
```
🔍 DEBUGGING TEST MODE - Campaign Creation Starting
Wallet state: {
  connected: true,      // ← Looks good
  connecting: false,
  publicKey: "ASjz...vqDn",
  signTransaction: true
}
🔍 DEBUGGING - Current wallet state: {
  wallet: true,
  publicKey: "undefined", // ← PROBLEM!
  connected: false        // ← PROBLEM!
}
🔍 ENSURE PROGRAM INIT - Cannot initialize program: wallet not connected
⚠️ Program initialization failed - creating mock campaign for testing
```

---

## 🔧 Common Issues & Fixes

### **Issue 1: Wallet State Mismatch**
```
Browser shows: connected: true
Integration shows: connected: false, publicKey: undefined
```
**Fix**: Wallet adapter version compatibility
```bash
npm update @solana/wallet-adapter-react @solana/wallet-adapter-react-ui
```

### **Issue 2: Network Mismatch**
```
Wallet on mainnet, app expecting devnet
```
**Fix**: Change wallet network to Devnet

### **Issue 3: Timing Issue**
```
Wallet connects after component loads
```
**Fix**: Add wallet connection check before enabling "Create Campaign"

### **Issue 4: RPC Connection**
```
Program initialization fails with network error
```
**Fix**: Check internet connection, try different RPC endpoint

---

## 🎯 Specific Debug Points

### **Check 1: Wallet Adapter State**
```javascript
// In browser console during campaign creation:
console.log('Wallet adapter state:', {
  wallet: window.__WALLET_ADAPTER_STATE__,
  connection: window.__CONNECTION_STATE__
})
```

### **Check 2: Smart Contract Instance**
```javascript
// Look for this in console logs:
"🔍 DEBUGGING - Current wallet state"
```
If you see `wallet: false` or `publicKey: undefined`, that's the issue.

### **Check 3: Program Initialization**
```javascript
// Look for these success/failure patterns:
"✅ Program initialized successfully"  // Good
"❌ Failed to initialize program"      // Bad - check error details
```

---

## 🚀 Quick Fixes to Try

### **Fix 1: Refresh Wallet Connection**
1. Disconnect wallet in browser extension
2. Refresh page (F5)
3. Reconnect wallet
4. Try creating campaign

### **Fix 2: Clear Browser Cache**
1. Ctrl+Shift+Delete
2. Clear all site data
3. Refresh page
4. Reconnect wallet

### **Fix 3: Use Different Wallet**
1. Try Phantom if using Solflare
2. Try Solflare if using Phantom
3. Ensure wallet is on Devnet

---

## 📊 Expected Debug Output

When working correctly, you should see:
```
🔍 DEBUGGING TEST MODE - Campaign Creation Starting
Wallet state: { connected: true, publicKey: "ASjz...", ... }
🔍 DEBUGGING - Current wallet state: { wallet: true, publicKey: "ASjz...", connected: true }
🔍 ENSURE PROGRAM INIT - Wallet OK, calling initializeProgram()
✅ Program initialized successfully
✅ Program found and accessible
🔍 SMART CONTRACT RESULT: { success: true, campaignAddress: "[PDA address]", isMock: false }
Campaign created successfully!
Smart Contract: [Real PDA address]
Transaction: [Real transaction signature]
```

When failing (test mode), you'll see:
```
🔍 DEBUGGING TEST MODE - Campaign Creation Starting
Wallet state: { connected: true, publicKey: "ASjz...", ... }
🔍 DEBUGGING - Current wallet state: { wallet: false, publicKey: undefined, connected: false }
🔍 ENSURE PROGRAM INIT - Cannot initialize program: wallet not connected
⚠️ Program initialization failed - creating mock campaign for testing
🔍 SMART CONTRACT RESULT: { success: true, campaignAddress: "mock_...", isMock: true }
Campaign created successfully!
Note: Running in test mode - smart contract not deployed.
```

---

## 🎯 Next Steps

1. **Test with debugging**: Create a campaign and check console
2. **Identify specific failure point**: Find exact log where it breaks
3. **Apply appropriate fix**: Based on the failure pattern observed
4. **Verify fix**: Create another campaign to confirm real mode

The debugging is now in place - you'll see exactly why test mode is being triggered! 🔍
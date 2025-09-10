import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { createReadStream } from 'fs'
import archiver from 'archiver'
import { projectScriptAccess } from '../../../../lib/projectScriptAccess'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { id } = req.query
    const { userAddress } = req.body

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid script ID' })
    }

    if (!userAddress || typeof userAddress !== 'string') {
      return res.status(400).json({ message: 'User address required' })
    }

    // Check if script exists
    const script = projectScriptAccess.getScript(id)
    if (!script) {
      return res.status(404).json({ message: 'Script not found' })
    }

    // Check user access
    const access = projectScriptAccess.checkAccess(userAddress, id)
    if (!access.hasAccess) {
      return res.status(403).json({ 
        message: 'Access denied', 
        reason: access.reason,
        missingTasks: access.missingTasks 
      })
    }

    // Record download
    projectScriptAccess.recordDownload(id)

    // Create script content based on script type
    const scriptContent = await generateScriptContent(script.id, script.name)

    // Set response headers for file download
    const filename = `${script.name.replace(/[^a-zA-Z0-9]/g, '-')}-v${script.version}.zip`
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    // Create zip stream
    const archive = archiver('zip', { zlib: { level: 9 } })
    
    archive.on('error', (err) => {
      console.error('Archive error:', err)
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to create archive' })
      }
    })

    // Pipe archive to response
    archive.pipe(res)

    // Add script files to archive
    await addScriptFiles(archive, script.id, scriptContent)

    // Finalize the archive
    await archive.finalize()

  } catch (error) {
    console.error('Download error:', error)
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal server error' })
    }
  }
}

async function generateScriptContent(scriptId: string, scriptName: string): Promise<Record<string, string>> {
  const content: Record<string, string> = {}

  switch (scriptId) {
    case 'launch-fund-setup':
      content['setup.sh'] = `#!/bin/bash
# Launch.fund Setup Script
# Automated setup for Launch.fund platform

echo "🚀 Setting up Launch.fund Development Environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are available"

# Install dependencies
echo "📦 Installing project dependencies..."
npm install

# Install Solana CLI if not present
if ! command -v solana &> /dev/null; then
    echo "🔧 Installing Solana CLI..."
    sh -c "$(curl -sSfL https://release.solana.com/v1.16.0/install)"
    export PATH="/home/$USER/.local/share/solana/install/active_release/bin:$PATH"
fi

echo "✅ Solana CLI installed"

# Configure Solana for devnet
echo "🌐 Configuring Solana for devnet..."
solana config set --url devnet

# Generate new keypair if none exists
if [ ! -f ~/.config/solana/id.json ]; then
    echo "🔑 Generating new Solana keypair..."
    solana-keygen new --no-bip39-passphrase
fi

echo "✅ Solana configuration complete"

# Set up environment variables
echo "⚙️ Setting up environment variables..."

cat > .env.local << EOF
# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Your Solana keypair (keep this secure!)
# SOLANA_PRIVATE_KEY=your_private_key_here

# Optional: Stripe for payments (if needed)
# STRIPE_SECRET_KEY=sk_test_...
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

EOF

echo "✅ Environment file created"

# Request airdrop for devnet
echo "💰 Requesting devnet SOL airdrop..."
solana airdrop 2

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add your Solana private key to .env.local"
echo "2. Configure Stripe keys if needed"
echo "3. Run 'npm run dev' to start development server"
echo ""
echo "🔗 Visit http://localhost:3000 to see your Launch.fund platform"
`

      content['README.md'] = `# Launch.fund Setup Script

This script automates the setup process for the Launch.fund platform development environment.

## What it does:

1. **Verifies Dependencies**: Checks for Node.js and npm
2. **Installs Packages**: Runs npm install for project dependencies
3. **Solana Setup**: Installs and configures Solana CLI for devnet
4. **Keypair Generation**: Creates a new Solana keypair if needed
5. **Environment Config**: Sets up .env.local with required variables
6. **Airdrop**: Requests 2 SOL on devnet for testing

## Usage:

\`\`\`bash
chmod +x setup.sh
./setup.sh
\`\`\`

## After Setup:

1. Add your Solana private key to .env.local
2. Configure optional Stripe keys for payments
3. Run \`npm run dev\` to start the development server
4. Visit http://localhost:3000

## Support:

If you encounter issues, check that you have:
- Node.js 16+ installed
- npm or yarn package manager
- Internet connection for downloading dependencies

Created by Launch.fund - Blockchain Crowdfunding Platform
`

      content['package.json'] = JSON.stringify({
        name: "launch-fund-setup-tools",
        version: "1.0.0",
        description: "Setup and development tools for Launch.fund platform",
        scripts: {
          setup: "./setup.sh",
          check: "node check-environment.js"
        }
      }, null, 2)

      break

    case 'advanced-solana-tools':
      content['solana-dev-tools.js'] = `// Advanced Solana Development Tools
// Collection of utilities for Solana blockchain development

const { Connection, PublicKey, Keypair, Transaction } = require('@solana/web3.js')
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token')

class SolanaDevTools {
  constructor(rpcUrl = 'https://api.devnet.solana.com') {
    this.connection = new Connection(rpcUrl, 'confirmed')
  }

  // Get token accounts for a wallet
  async getTokenAccounts(walletAddress) {
    try {
      const publicKey = new PublicKey(walletAddress)
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: TOKEN_PROGRAM_ID }
      )
      
      return tokenAccounts.value.map(account => ({
        address: account.pubkey.toString(),
        mint: account.account.data.parsed.info.mint,
        balance: account.account.data.parsed.info.tokenAmount.uiAmount,
        decimals: account.account.data.parsed.info.tokenAmount.decimals
      }))
    } catch (error) {
      console.error('Error fetching token accounts:', error)
      return []
    }
  }

  // Monitor transaction status
  async monitorTransaction(signature, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const status = await this.connection.getSignatureStatus(signature)
        
        if (status.value?.confirmationStatus === 'confirmed') {
          return { confirmed: true, status: status.value }
        }
        
        if (status.value?.err) {
          return { confirmed: false, error: status.value.err }
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error('Error checking transaction:', error)
      }
    }
    
    return { confirmed: false, error: 'Timeout waiting for confirmation' }
  }

  // Get account balance with retries
  async getBalanceWithRetry(publicKey, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const balance = await this.connection.getBalance(new PublicKey(publicKey))
        return balance / 1e9 // Convert lamports to SOL
      } catch (error) {
        if (i === maxRetries - 1) throw error
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }

  // Batch transaction sender
  async sendBatchTransactions(transactions, keypair) {
    const results = []
    
    for (const tx of transactions) {
      try {
        const signature = await this.connection.sendTransaction(tx, [keypair])
        const confirmation = await this.monitorTransaction(signature)
        results.push({ signature, confirmation })
      } catch (error) {
        results.push({ error: error.message })
      }
    }
    
    return results
  }

  // Network performance tester
  async testNetworkPerformance() {
    const start = Date.now()
    
    try {
      await this.connection.getSlot()
      const latency = Date.now() - start
      
      const blocktime = await this.connection.getBlockTime(
        await this.connection.getSlot()
      )
      
      return {
        latency: \`\${latency}ms\`,
        connected: true,
        blockTime: blocktime
      }
    } catch (error) {
      return {
        latency: 'N/A',
        connected: false,
        error: error.message
      }
    }
  }
}

module.exports = { SolanaDevTools }

// Example usage:
/*
const tools = new SolanaDevTools()

// Get token balances
const balances = await tools.getTokenAccounts('YOUR_WALLET_ADDRESS')
console.log('Token balances:', balances)

// Test network
const performance = await tools.testNetworkPerformance()
console.log('Network performance:', performance)
*/`

      content['testing-framework.js'] = `// Automated Testing Framework for Solana Programs

const { Connection, PublicKey, Keypair } = require('@solana/web3.js')

class SolanaTestFramework {
  constructor() {
    this.connection = new Connection('https://api.devnet.solana.com', 'confirmed')
    this.testResults = []
  }

  // Test wallet generation
  async testWalletGeneration() {
    try {
      const keypair = Keypair.generate()
      const isValid = PublicKey.isOnCurve(keypair.publicKey.toBytes())
      
      this.addTest('Wallet Generation', isValid, 
        isValid ? 'Generated valid keypair' : 'Invalid keypair generated')
      
      return keypair
    } catch (error) {
      this.addTest('Wallet Generation', false, error.message)
      return null
    }
  }

  // Test connection to network
  async testNetworkConnection() {
    try {
      const slot = await this.connection.getSlot()
      const isConnected = slot > 0
      
      this.addTest('Network Connection', isConnected, 
        isConnected ? \`Connected, current slot: \${slot}\` : 'Failed to connect')
      
      return isConnected
    } catch (error) {
      this.addTest('Network Connection', false, error.message)
      return false
    }
  }

  // Test airdrop functionality
  async testAirdrop(keypair) {
    try {
      const signature = await this.connection.requestAirdrop(
        keypair.publicKey,
        1000000000 // 1 SOL
      )
      
      await this.connection.confirmTransaction(signature)
      const balance = await this.connection.getBalance(keypair.publicKey)
      const success = balance > 0
      
      this.addTest('Airdrop Test', success, 
        success ? \`Received \${balance / 1e9} SOL\` : 'Airdrop failed')
      
      return success
    } catch (error) {
      this.addTest('Airdrop Test', false, error.message)
      return false
    }
  }

  addTest(name, passed, message) {
    this.testResults.push({
      name,
      passed,
      message,
      timestamp: new Date().toISOString()
    })
  }

  generateReport() {
    const passed = this.testResults.filter(t => t.passed).length
    const total = this.testResults.length
    
    console.log('\\n=== Solana Test Report ===')
    console.log(\`Tests Passed: \${passed}/\${total}\`)
    console.log('\\nDetailed Results:')
    
    this.testResults.forEach(test => {
      const status = test.passed ? '✅' : '❌'
      console.log(\`\${status} \${test.name}: \${test.message}\`)
    })
    
    return { passed, total, success: passed === total }
  }

  // Run all tests
  async runAllTests() {
    console.log('🧪 Starting Solana Development Tests...')
    
    const keypair = await this.testWalletGeneration()
    await this.testNetworkConnection()
    
    if (keypair) {
      await this.testAirdrop(keypair)
    }
    
    return this.generateReport()
  }
}

module.exports = { SolanaTestFramework }

// Run tests if called directly
if (require.main === module) {
  const framework = new SolanaTestFramework()
  framework.runAllTests().then(report => {
    process.exit(report.success ? 0 : 1)
  })
}
`

      break

    case 'enterprise-blockchain-suite':
      content['enterprise-setup.sh'] = `#!/bin/bash
# Enterprise Blockchain Development Suite
# Production-ready blockchain development environment

set -e

echo "🏢 Setting up Enterprise Blockchain Development Suite..."

# Check system requirements
check_requirements() {
    echo "🔍 Checking system requirements..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is required"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    if [ "$(printf '%s\\n' "16.0.0" "$NODE_VERSION" | sort -V | head -n1)" != "16.0.0" ]; then
        echo "❌ Node.js 16.0.0 or higher is required"
        exit 1
    fi
    
    echo "✅ Node.js version: $NODE_VERSION"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo "⚠️  Docker not found. Some features will be unavailable."
    else
        echo "✅ Docker available"
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        echo "❌ Git is required"
        exit 1
    fi
    
    echo "✅ Git available"
}

# Install Solana and Anchor
install_solana_stack() {
    echo "🔗 Installing Solana development stack..."
    
    # Install Solana CLI
    if ! command -v solana &> /dev/null; then
        sh -c "$(curl -sSfL https://release.solana.com/v1.16.0/install)"
        export PATH="/home/$USER/.local/share/solana/install/active_release/bin:$PATH"
    fi
    
    # Install Anchor
    if ! command -v anchor &> /dev/null; then
        cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
    fi
    
    # Install Rust if not present
    if ! command -v rustc &> /dev/null; then
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source ~/.cargo/env
        rustup update
        rustup component add rustfmt
        rustup component add clippy
    fi
    
    echo "✅ Solana stack installed"
}

# Set up monitoring tools
setup_monitoring() {
    echo "📊 Setting up blockchain monitoring tools..."
    
    mkdir -p monitoring
    
    # Create monitoring dashboard
    cat > monitoring/dashboard.js << 'EOF'
// Blockchain Monitoring Dashboard
const { Connection, PublicKey } = require('@solana/web3.js')

class BlockchainMonitor {
  constructor() {
    this.connections = {
      mainnet: new Connection('https://api.mainnet-beta.solana.com'),
      devnet: new Connection('https://api.devnet.solana.com'),
      testnet: new Connection('https://api.testnet.solana.com')
    }
  }

  async getNetworkStats() {
    const stats = {}
    
    for (const [network, connection] of Object.entries(this.connections)) {
      try {
        const slot = await connection.getSlot()
        const blockTime = await connection.getBlockTime(slot)
        const supply = await connection.getSupply()
        
        stats[network] = {
          currentSlot: slot,
          blockTime: new Date(blockTime * 1000),
          totalSupply: supply.value.total / 1e9,
          circulatingSupply: supply.value.circulating / 1e9
        }
      } catch (error) {
        stats[network] = { error: error.message }
      }
    }
    
    return stats
  }

  async monitorProgram(programId, network = 'devnet') {
    const connection = this.connections[network]
    const publicKey = new PublicKey(programId)
    
    try {
      const accountInfo = await connection.getAccountInfo(publicKey)
      return {
        exists: accountInfo !== null,
        executable: accountInfo?.executable || false,
        owner: accountInfo?.owner.toString(),
        lamports: accountInfo?.lamports || 0
      }
    } catch (error) {
      return { error: error.message }
    }
  }
}

module.exports = { BlockchainMonitor }
EOF

    echo "✅ Monitoring tools configured"
}

# Set up security tools
setup_security() {
    echo "🔒 Setting up security and auditing tools..."
    
    mkdir -p security
    
    # Create security checklist
    cat > security/checklist.md << 'EOF'
# Enterprise Security Checklist

## Smart Contract Security
- [ ] All arithmetic operations use safe math
- [ ] Access controls properly implemented
- [ ] No unchecked external calls
- [ ] Proper initialization checks
- [ ] No reentrancy vulnerabilities

## Key Management
- [ ] Private keys stored securely
- [ ] Hardware wallet integration
- [ ] Multi-signature setup for production
- [ ] Key rotation procedures documented

## Network Security
- [ ] RPC endpoints properly configured
- [ ] Rate limiting implemented
- [ ] SSL/TLS encryption for all connections
- [ ] Firewall rules configured

## Monitoring
- [ ] Transaction monitoring setup
- [ ] Error alerting configured
- [ ] Performance metrics tracked
- [ ] Audit logs maintained

## Compliance
- [ ] KYC/AML procedures documented
- [ ] Privacy policy updated
- [ ] Terms of service reviewed
- [ ] Regulatory compliance verified
EOF

    echo "✅ Security tools configured"
}

# Main installation
main() {
    check_requirements
    install_solana_stack
    setup_monitoring
    setup_security
    
    echo ""
    echo "🎉 Enterprise Blockchain Suite Setup Complete!"
    echo ""
    echo "Available tools:"
    echo "- Solana CLI and Anchor Framework"
    echo "- Blockchain monitoring dashboard"
    echo "- Security auditing tools"
    echo "- Enterprise deployment scripts"
    echo ""
    echo "Next steps:"
    echo "1. Review security/checklist.md"
    echo "2. Configure monitoring/dashboard.js"
    echo "3. Set up your production environment variables"
    echo ""
}

main "$@"
`

      content['deployment-guide.md'] = `# Enterprise Deployment Guide

## Production Deployment Checklist

### Pre-deployment
1. **Security Audit**: Complete smart contract audit
2. **Testing**: Full test suite passing on mainnet-fork
3. **Monitoring**: Set up alerts and dashboards
4. **Backup**: Ensure key backup procedures are in place

### Deployment Steps
1. Deploy smart contracts to mainnet
2. Verify contract addresses
3. Initialize contract state
4. Configure access controls
5. Set up monitoring
6. Test all critical functions

### Post-deployment
1. Monitor initial transactions
2. Verify all integrations working
3. Document deployment details
4. Set up ongoing maintenance procedures

### Emergency Procedures
- Circuit breaker activation
- Emergency contact list
- Rollback procedures
- Communication protocols

Created by Launch.fund Enterprise Suite
`

      break

    default:
      content['script.sh'] = `#!/bin/bash
echo "Default script for ${scriptName}"
echo "This is a placeholder script file."
`
      content['README.md'] = `# ${scriptName}

This is a generated script package.

## Usage

Run the included script files according to their documentation.

## Support

Contact support for assistance with this script package.
`
  }

  return content
}

async function addScriptFiles(
  archive: archiver.Archiver, 
  scriptId: string, 
  content: Record<string, string>
): Promise<void> {
  // Add content files to archive
  for (const [filename, fileContent] of Object.entries(content)) {
    archive.append(fileContent, { name: filename })
  }

  // Add a manifest file
  const manifest = {
    scriptId,
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    files: Object.keys(content)
  }
  
  archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' })
}

export const config = {
  api: {
    responseLimit: false,
  },
}
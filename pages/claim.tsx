import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/router'
import ClientWalletButton from '../components/ClientWalletButton'
import { claimCodeSystem } from '../lib/claimCodeSystem'
import { getSolanaAccessKeyNFT } from '../lib/solanaAccessKeyNFT'

export default function ClaimAccessKey() {
  const { publicKey } = useWallet()
  const wallet = useWallet()
  const { connection } = useConnection()
  const router = useRouter()
  const [claimCode, setClaimCode] = useState('')
  const [email, setEmail] = useState('')
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<any>(null)
  const [showEmailLookup, setShowEmailLookup] = useState(false)
  const [emailCodes, setEmailCodes] = useState<any[]>([])

  const handleClaimCode = async () => {
    if (!publicKey) {
      setError('Please connect your wallet first')
      return
    }

    if (!claimCode.trim()) {
      setError('Please enter a claim code')
      return
    }

    if (!wallet.signTransaction) {
      setError('Wallet not properly connected')
      return
    }

    setIsRedeeming(true)
    setError('')

    try {
      // Validate code first
      const validation = claimCodeSystem.validateCode(claimCode.toUpperCase())
      if (!validation.valid) {
        setError(validation.error || 'Invalid code')
        setIsRedeeming(false)
        return
      }

      // Get NFT service instance
      const nftService = getSolanaAccessKeyNFT(connection)
      
      // Mint the real NFT
      const mintAddress = await nftService.mintAccessKeyNFT(
        wallet,
        validation.data.campaignName,
        validation.data.campaignId
      )

      // Now redeem the code with the actual NFT mint address
      const result = claimCodeSystem.redeemCode(claimCode.toUpperCase(), publicKey.toString())
      
      // Update the stored data with real mint address
      if (result.success) {
        const mintedKeys = JSON.parse(
          localStorage.getItem(`minted_keys_${validation.data.campaignId}`) || '{}'
        )
        mintedKeys[publicKey.toString()] = {
          ...mintedKeys[publicKey.toString()],
          tokenId: mintAddress,
          realNFT: true
        }
        localStorage.setItem(
          `minted_keys_${validation.data.campaignId}`,
          JSON.stringify(mintedKeys)
        )

        setSuccess({
          ...result.accessKey,
          tokenId: mintAddress
        })
        setClaimCode('')
      } else {
        setError(result.error || 'Failed to claim access key')
      }
    } catch (error) {
      console.error('Error claiming NFT:', error)
      setError('Failed to mint NFT. Please try again.')
    }

    setIsRedeeming(false)
  }

  const handleEmailLookup = () => {
    if (!email.trim()) {
      setError('Please enter your email')
      return
    }

    const codes = claimCodeSystem.getCodesForEmail(email)
    setEmailCodes(codes)
    setShowEmailLookup(true)
    setError('')
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    // Visual feedback
    const button = document.getElementById(`copy-${code}`)
    if (button) {
      button.textContent = 'Copied!'
      setTimeout(() => {
        button.textContent = 'Copy'
      }, 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <nav className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <button
              onClick={() => router.push('/')}
              className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
            >
              FundIt
            </button>
            <ClientWalletButton />
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Claim Your Access Key NFT
          </h1>
          <p className="text-xl text-gray-300">
            Enter your claim code to mint your access key to your wallet
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Claim Code Entry */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">🎫</span>
              </div>
              <h2 className="text-2xl font-bold text-white">Have a Code?</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Enter Claim Code
                </label>
                <input
                  type="text"
                  value={claimCode}
                  onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                  placeholder="FUNDIT-XXXX-XXXX-XXXX"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 font-mono text-center text-lg"
                  disabled={!publicKey || isRedeeming}
                />
              </div>

              {!publicKey ? (
                <div className="text-center py-4 bg-yellow-500/10 border border-yellow-400/30 rounded-lg">
                  <p className="text-yellow-400 text-sm mb-3">Connect wallet to claim</p>
                  <ClientWalletButton />
                </div>
              ) : (
                <button
                  onClick={handleClaimCode}
                  disabled={isRedeeming || !claimCode.trim()}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-medium transition-all disabled:cursor-not-allowed"
                >
                  {isRedeeming ? 'Claiming...' : 'Claim Access Key'}
                </button>
              )}

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-400/30 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-4 bg-green-500/10 border border-green-400/30 rounded-lg">
                  <p className="text-green-400 font-bold mb-2">🎉 Success!</p>
                  <p className="text-green-300 text-sm mb-2">Your Access Key NFT has been minted to your wallet!</p>
                  <p className="text-gray-400 text-xs mb-3 font-mono">Mint: {success.tokenId}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/campaign/${success.campaignId}`)}
                      className="text-sm text-green-400 hover:text-green-300 underline"
                    >
                      View Campaign →
                    </button>
                    <a
                      href={`https://solscan.io/token/${success.tokenId}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300 underline"
                    >
                      View NFT on Solscan →
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Email Lookup */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">📧</span>
              </div>
              <h2 className="text-2xl font-bold text-white">Find Your Codes</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                />
              </div>

              <button
                onClick={handleEmailLookup}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg font-medium transition-all"
              >
                Look Up My Codes
              </button>

              {showEmailLookup && emailCodes.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-300">Found {emailCodes.length} code(s):</p>
                  {emailCodes.map((codeData) => (
                    <div key={codeData.code} className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">
                          {codeData.campaignName}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          codeData.claimed 
                            ? 'bg-gray-600/20 text-gray-400' 
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {codeData.claimed ? 'Claimed' : 'Available'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm font-mono text-white">
                          {codeData.code}
                        </code>
                        {!codeData.claimed && (
                          <button
                            id={`copy-${codeData.code}`}
                            onClick={() => copyToClipboard(codeData.code)}
                            className="px-2 py-1 text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded transition-all"
                          >
                            Copy
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showEmailLookup && emailCodes.length === 0 && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-400/30 rounded-lg">
                  <p className="text-yellow-400 text-sm">No codes found for this email</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-12 bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
          <h3 className="text-xl font-bold text-white mb-4">📖 How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">1️⃣</span>
              </div>
              <h4 className="text-white font-medium mb-2">Get a Code</h4>
              <p className="text-sm text-gray-400">
                Receive a claim code via email after purchasing with Stripe
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">2️⃣</span>
              </div>
              <h4 className="text-white font-medium mb-2">Connect Wallet</h4>
              <p className="text-sm text-gray-400">
                Connect any Solana wallet to receive your NFT
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">3️⃣</span>
              </div>
              <h4 className="text-white font-medium mb-2">Claim NFT</h4>
              <p className="text-sm text-gray-400">
                Enter your code to mint the access key to your wallet
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
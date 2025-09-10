import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import ClientWalletButton from '../components/ClientWalletButton'
import PaymentModal from '../components/PaymentModal'

// Demo campaign with minting functionality
const STANDALONE_CAMPAIGN = {
  id: 'standalone-demo',
  name: 'Revolutionary DeFi Protocol',
  description: 'Building the next generation of decentralized finance infrastructure with advanced yield farming, cross-chain bridges, and innovative tokenomics designed for sustainable growth.',
  targetAmount: 500000,
  raisedAmount: 287500,
  creator: 'ASjzYmW4vkCtopMukaeFCMFgX74hbYu9F38ptjW4vqDn',
  depositWallet: '8oYmUTGBuBqzukESX68SXB67nxopemnRrVmzH3hrGpAd',
  coverPhoto: '',
  links: [
    { label: 'Whitepaper', url: 'https://github.com/your-project/whitepaper' },
    { label: 'Demo Platform', url: 'https://demo.yourproject.com' },
    { label: 'Twitter', url: 'https://twitter.com/yourproject' }
  ],
  accessKeys: [
    {
      id: 'early-access',
      name: 'Early Access Pass',
      description: 'Get exclusive early access to the platform with special privileges',
      priceInUSD: 25,
      image: '',
      benefits: ['Priority access', 'Exclusive features', 'Community perks']
    },
    {
      id: 'premium-tier',
      name: 'Premium Tier Access',
      description: 'Premium tier with advanced features and higher limits',
      priceInUSD: 100,
      image: '',
      benefits: ['All early access benefits', 'Higher transaction limits', 'Premium support']
    },
    {
      id: 'founder-pass',
      name: 'Founder Pass',
      description: 'Exclusive founder-level access with governance rights',
      priceInUSD: 500,
      image: '',
      benefits: ['All premium benefits', 'Governance voting', 'Revenue sharing', 'Founder badge']
    }
  ]
}

export default function StandaloneCampaign() {
  const { publicKey } = useWallet()
  const [campaign] = useState(STANDALONE_CAMPAIGN)
  const [donated, setDonated] = useState(false)
  const [supportersCount, setSupportersCount] = useState(42)
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean
    accessKey?: typeof STANDALONE_CAMPAIGN.accessKeys[0]
  }>({ isOpen: false })
  const [mintedNFTs, setMintedNFTs] = useState<string[]>([])

  // Load minted NFTs for this campaign
  useEffect(() => {
    if (publicKey && typeof window !== 'undefined') {
      const mintedKeys = JSON.parse(localStorage.getItem(`minted_nfts_${campaign.id}`) || '{}')
      const userKeys = mintedKeys[publicKey.toString()] || []
      setMintedNFTs(userKeys)
    }
  }, [publicKey, campaign.id])

  const handleDonate = async (amount: number) => {
    if (!publicKey) {
      alert('Please connect your wallet first')
      return
    }

    // Simulate donation processing
    setTimeout(() => {
      setDonated(true)
      setSupportersCount(prev => prev + 1)
      alert(`Thank you for your ${amount} SOL donation! 🙏`)
    }, 1000)
  }

  const handleAccessKeyPurchase = (accessKey: typeof STANDALONE_CAMPAIGN.accessKeys[0]) => {
    if (!publicKey) {
      alert('Please connect your wallet first')
      return
    }
    setPaymentModal({ isOpen: true, accessKey })
  }

  const handleMintSuccess = (mintAddress: string) => {
    setMintedNFTs(prev => [...prev, mintAddress])
    setPaymentModal({ isOpen: false })
    
    // Show success message
    alert(`🎉 Access Key NFT minted successfully!\n\nYour NFT address: ${mintAddress}`)
  }

  const progressPercentage = campaign.targetAmount > 0 ? (campaign.raisedAmount / campaign.targetAmount) * 100 : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Header */}
        <header className="border-b border-gray-700 bg-gray-800/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {campaign.name}
              </h1>
              <ClientWalletButton />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Campaign Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Hero Section */}
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-blue-500/30">
                <div className="h-64 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h2 className="text-4xl font-bold mb-2">{campaign.name}</h2>
                    <p className="text-xl opacity-90">Next-Gen DeFi Innovation</p>
                  </div>
                </div>
                
                <div className="p-6">
                  <p className="text-gray-300 text-lg leading-relaxed">
                    {campaign.description}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-blue-300/20">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white">Funding Progress</h3>
                  <span className="text-2xl font-bold text-green-400">
                    ${campaign.raisedAmount.toLocaleString()} / ${campaign.targetAmount.toLocaleString()}
                  </span>
                </div>
                
                <div className="w-full bg-gray-700 rounded-full h-4 mb-4">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-blue-500 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                    style={{ width: `${Math.max(progressPercentage, 5)}%` }}
                  >
                    <span className="text-xs font-bold text-white">
                      {Math.round(progressPercentage)}%
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between text-sm text-gray-400">
                  <span>{Math.round(progressPercentage)}% funded</span>
                  <span>${(campaign.targetAmount - campaign.raisedAmount).toLocaleString()} remaining</span>
                </div>
              </div>

              {/* Access Keys Section */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-300/20">
                <h3 className="text-xl font-bold text-white mb-4">🎫 Exclusive Access Keys</h3>
                <p className="text-gray-300 text-sm mb-6">
                  Purchase NFT access keys to unlock exclusive features and benefits
                </p>
                
                <div className="grid gap-4 md:grid-cols-1">
                  {campaign.accessKeys.map((accessKey) => (
                    <div key={accessKey.id} className="bg-white/10 rounded-lg p-4 border border-purple-400/20">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-white">{accessKey.name}</h4>
                          <p className="text-gray-300 text-sm">{accessKey.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-400">${accessKey.priceInUSD}</div>
                          {mintedNFTs.length > 0 && (
                            <div className="text-xs text-purple-400 mt-1">
                              {mintedNFTs.filter(nft => nft.includes(accessKey.id)).length} owned
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-xs text-gray-400 mb-2">Benefits:</p>
                        <ul className="text-xs text-gray-300 space-y-1">
                          {accessKey.benefits.map((benefit, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <span className="text-green-400">✓</span>
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <button
                        onClick={() => handleAccessKeyPurchase(accessKey)}
                        disabled={!publicKey}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg font-semibold transition-all text-sm"
                      >
                        {publicKey ? 'Purchase Access Key' : 'Connect Wallet'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Links */}
              {campaign.links.length > 0 && (
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-blue-300/20">
                  <h3 className="text-xl font-bold text-white mb-4">🔗 Links</h3>
                  <div className="space-y-2">
                    {campaign.links.map((link, index) => (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-white/10 hover:bg-white/20 rounded-lg p-3 transition-colors"
                      >
                        <span className="text-white font-medium">{link.label}</span>
                        <span className="text-blue-400 text-sm ml-2">↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar - Actions */}
            <div className="space-y-6">
              {/* Quick Donate */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-green-300/20">
                <h3 className="text-xl font-bold text-white mb-4">💝 Support This Campaign</h3>
                
                <div className="space-y-3">
                  {[0.1, 0.5, 1, 5].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => handleDonate(amount)}
                      disabled={!publicKey}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50"
                    >
                      Donate {amount} SOL
                    </button>
                  ))}
                </div>

                {donated && (
                  <div className="mt-4 p-3 bg-green-500/20 border border-green-400/30 rounded-lg">
                    <p className="text-green-400 text-sm text-center">Thank you for your support! 🙏</p>
                  </div>
                )}
              </div>

              {/* Minted NFTs Display */}
              {mintedNFTs.length > 0 && (
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-300/20">
                  <h3 className="text-xl font-bold text-white mb-4">🎨 Your Access Keys</h3>
                  <div className="space-y-2">
                    {mintedNFTs.map((nft, index) => (
                      <div key={index} className="bg-white/10 rounded-lg p-3">
                        <p className="text-purple-300 font-semibold text-sm">Access Key #{index + 1}</p>
                        <p className="text-gray-400 font-mono text-xs break-all">{nft}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Community & Updates */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-blue-300/20">
                <h3 className="text-xl font-bold text-white mb-4">📢 Community</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Supporters</span>
                    <span className="text-white font-semibold">{supportersCount}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Access Keys Sold</span>
                    <span className="text-white font-semibold">127</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Community Members</span>
                    <span className="text-white font-semibold">892</span>
                  </div>
                </div>

                <button className="w-full mt-4 bg-white/10 border border-white/20 text-white py-3 rounded-lg font-semibold hover:bg-white/20 transition-all">
                  Join Community
                </button>
              </div>

              {/* Creator Info */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-300/20">
                <h3 className="text-xl font-bold text-white mb-4">👤 Campaign Creator</h3>
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">Creator Address:</div>
                  <div className="font-mono text-xs text-gray-300 break-all bg-black/20 p-2 rounded">
                    {campaign.creator}
                  </div>
                  <div className="text-sm text-gray-400 mt-3">Donations go to:</div>
                  <div className="font-mono text-xs text-gray-300 break-all bg-black/20 p-2 rounded">
                    {campaign.depositWallet}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Payment Modal */}
        {paymentModal.isOpen && paymentModal.accessKey && (
          <PaymentModal
            isOpen={paymentModal.isOpen}
            onClose={() => setPaymentModal({ isOpen: false })}
            campaignId={campaign.id}
            accessKeyName={paymentModal.accessKey.name}
            priceInUSD={paymentModal.accessKey.priceInUSD}
            accessKeyImage={paymentModal.accessKey.image}
            onSuccess={handleMintSuccess}
          />
        )}
    </div>
  )
}
import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import ClientWalletButton from '../components/ClientWalletButton'
import PaymentModal from '../components/PaymentModal'
import { 
  FilmIcon, 
  VideoCameraIcon, 
  StarIcon,
  UserGroupIcon,
  CalendarIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'

// Film project campaign
const FILM_PROJECT = {
  id: 'neon-shadows-film',
  name: 'NEON SHADOWS',
  tagline: 'A Cyberpunk Noir Thriller',
  description: 'In 2085 Neo-Tokyo, a detective with corrupted memory implants hunts a serial killer who leaves victims in digital comas. As reality fractures, she discovers the killer might be a deleted version of herself.',
  genre: 'Sci-Fi Thriller',
  director: 'Alexandra Chen',
  targetAmount: 2500000,
  raisedAmount: 875000,
  creator: 'ASjzYmW4vkCtopMukaeFCMFgX74hbYu9F38ptjW4vqDn',
  depositWallet: '8oYmUTGBuBqzukESX68SXB67nxopemnRrVmzH3hrGpAd',
  coverImage: '',
  
  // Film specific details
  productionPhase: 'Pre-Production',
  estimatedRelease: 'Q3 2026',
  filmingLocation: 'Vancouver, Tokyo, Los Angeles',
  runtime: '120 minutes',
  rating: 'R (Intended)',
  
  // Production milestones
  milestones: [
    { phase: 'Development', status: 'completed', amount: 250000, description: 'Script, concept art, storyboards' },
    { phase: 'Pre-Production', status: 'in-progress', amount: 500000, description: 'Casting, location scouting, crew assembly' },
    { phase: 'Production', status: 'upcoming', amount: 1500000, description: 'Principal photography (45 days)' },
    { phase: 'Post-Production', status: 'upcoming', amount: 750000, description: 'Editing, VFX, sound design, color grading' }
  ],
  
  // Cast & Crew highlights
  team: [
    { role: 'Director', name: 'Alexandra Chen', credits: 'Blade Runner 2089, Ghost Protocol' },
    { role: 'Producer', name: 'Marcus Williams', credits: 'Oscar Winner - The Void' },
    { role: 'Lead Actor', name: 'Zoe Park', credits: 'Emmy Nominee - Altered Carbon' },
    { role: 'Cinematographer', name: 'James Morrison', credits: 'BAFTA Winner - Neon Dreams' }
  ],
  
  // Investor perks/rewards (NFT-based)
  investmentTiers: [
    {
      id: 'digital-supporter',
      name: 'Digital Supporter',
      priceInUSD: 50,
      image: '',
      limit: 'Unlimited',
      perks: [
        'Digital copy of the film',
        'Behind-the-scenes content',
        'Discord community access',
        'Name in credits (website)'
      ]
    },
    {
      id: 'collector-edition',
      name: "Collector's Edition",
      priceInUSD: 250,
      image: '',
      limit: '500 available',
      perks: [
        'All Digital Supporter perks',
        'Limited edition poster NFT',
        'Signed digital script',
        'Virtual premiere invitation',
        'Name in film credits'
      ]
    },
    {
      id: 'producer-credit',
      name: 'Associate Producer',
      priceInUSD: 1000,
      image: '',
      limit: '100 available',
      perks: [
        'All Collector perks',
        'Associate Producer credit',
        'Set visit opportunity',
        'Props NFT collection',
        'Private screening invite',
        'Quarterly production updates'
      ]
    },
    {
      id: 'executive-producer',
      name: 'Executive Producer',
      priceInUSD: 10000,
      image: '',
      limit: '10 available',
      perks: [
        'Executive Producer credit',
        'Two weeks on-set access',
        'Character naming rights',
        'Original concept art NFTs',
        'Red carpet premiere (2 tickets)',
        'Revenue share (0.5%)',
        'Monthly video calls with director'
      ]
    }
  ],
  
  links: [
    { label: 'Pitch Deck', url: 'https://example.com/pitch-deck' },
    { label: 'Teaser Trailer', url: 'https://youtube.com/watch' },
    { label: 'Director Statement', url: 'https://example.com/statement' },
    { label: 'IMDb', url: 'https://imdb.com/title' }
  ]
}

export default function FilmProjectFunding() {
  const { publicKey } = useWallet()
  const [campaign] = useState(FILM_PROJECT)
  const [selectedTier, setSelectedTier] = useState<typeof FILM_PROJECT.investmentTiers[0] | null>(null)
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean
    tier?: typeof FILM_PROJECT.investmentTiers[0]
  }>({ isOpen: false })
  const [mintedNFTs, setMintedNFTs] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'story' | 'team' | 'milestones' | 'perks'>('story')

  useEffect(() => {
    if (publicKey && typeof window !== 'undefined') {
      const storageKey = 'minted_nfts_' + campaign.id
      const mintedKeys = JSON.parse(localStorage.getItem(storageKey) || '{}')
      const userKeys = mintedKeys[publicKey.toString()] || []
      setMintedNFTs(userKeys)
    }
  }, [publicKey, campaign.id])

  const handleInvest = (tier: typeof FILM_PROJECT.investmentTiers[0]) => {
    if (!publicKey) {
      alert('Please connect your wallet first')
      return
    }
    setPaymentModal({ isOpen: true, tier })
  }

  const handleMintSuccess = (mintAddress: string) => {
    setMintedNFTs(prev => [...prev, mintAddress])
    setPaymentModal({ isOpen: false })
    alert('🎬 Investment successful! Your producer NFT has been minted.\n\nNFT Address: ' + mintAddress)
  }

  const progressPercentage = (campaign.raisedAmount / campaign.targetAmount) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900 to-black">
      {/* Cinematic Header */}
      <header className="relative bg-black/50 backdrop-blur-md border-b border-purple-500/20">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <FilmIcon className="w-10 h-10 text-purple-400" />
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {campaign.name}
                </h1>
                <p className="text-purple-200 text-sm">{campaign.tagline}</p>
              </div>
            </div>
            <ClientWalletButton />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative h-96 bg-gradient-to-br from-purple-900 via-black to-pink-900 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center z-10">
            <VideoCameraIcon className="w-20 h-20 text-purple-400 mx-auto mb-4 animate-pulse" />
            <h2 className="text-5xl font-bold text-white mb-2">{campaign.name}</h2>
            <p className="text-2xl text-purple-200 mb-4">{campaign.genre} • {campaign.runtime}</p>
            <div className="flex items-center justify-center gap-6 text-sm">
              <span className="text-gray-300 flex items-center gap-2">
                <MapPinIcon className="w-4 h-4" /> {campaign.filmingLocation}
              </span>
              <span className="text-gray-300 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" /> {campaign.estimatedRelease}
              </span>
            </div>
          </div>
        </div>

        {/* Cinematic overlay effect */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent"></div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Project Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Funding Progress */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Production Funding</h3>
                <span className="text-2xl font-bold text-green-400">
                  ${campaign.raisedAmount.toLocaleString()} / ${campaign.targetAmount.toLocaleString()}
                </span>
              </div>
              
              <div className="relative">
                <div className="w-full bg-gray-800 rounded-full h-6 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-1000 flex items-center justify-end pr-3"
                    style={{ width: `${Math.max(progressPercentage, 5)}%` }}
                  >
                    <span className="text-xs font-bold text-white">{Math.round(progressPercentage)}%</span>
                  </div>
                </div>
                
                {/* Milestone markers */}
                <div className="absolute top-0 left-0 w-full h-6 flex items-center">
                  {campaign.milestones.map((milestone, index) => {
                    const position = (campaign.milestones.slice(0, index + 1).reduce((sum, m) => sum + m.amount, 0) / campaign.targetAmount) * 100
                    return (
                      <div
                        key={milestone.phase}
                        className="absolute h-8 w-0.5 bg-white/30"
                        style={{ left: `${position}%` }}
                        title={milestone.phase}
                      />
                    )
                  })}
                </div>
              </div>
              
              <div className="flex justify-between text-sm text-gray-400 mt-2">
                <span>{Math.round(progressPercentage)}% funded</span>
                <span>Pre-Production Phase</span>
                <span>${(campaign.targetAmount - campaign.raisedAmount).toLocaleString()} to go</span>
              </div>
            </div>

            {/* Content Tabs */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-500/30 overflow-hidden">
              <div className="flex border-b border-purple-500/30">
                {(['story', 'team', 'milestones', 'perks'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-4 py-3 font-semibold capitalize transition-all ${
                      activeTab === tab
                        ? 'bg-purple-600/20 text-purple-300 border-b-2 border-purple-400'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              
              <div className="p-6">
                {activeTab === 'story' && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white mb-4">Synopsis</h3>
                    <p className="text-gray-300 leading-relaxed">{campaign.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="bg-black/30 rounded-lg p-4">
                        <h4 className="text-purple-400 font-semibold mb-2">Director</h4>
                        <p className="text-white">{campaign.director}</p>
                      </div>
                      <div className="bg-black/30 rounded-lg p-4">
                        <h4 className="text-purple-400 font-semibold mb-2">Rating</h4>
                        <p className="text-white">{campaign.rating}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'team' && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white mb-4">Cast & Crew</h3>
                    <div className="grid gap-4">
                      {campaign.team.map((member) => (
                        <div key={member.role} className="bg-black/30 rounded-lg p-4 flex justify-between items-center">
                          <div>
                            <p className="text-purple-400 text-sm">{member.role}</p>
                            <p className="text-white font-semibold">{member.name}</p>
                          </div>
                          <p className="text-gray-400 text-sm text-right">{member.credits}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {activeTab === 'milestones' && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white mb-4">Production Roadmap</h3>
                    <div className="space-y-3">
                      {campaign.milestones.map((milestone) => (
                        <div key={milestone.phase} className="relative">
                          <div className={`bg-black/30 rounded-lg p-4 border-l-4 ${
                            milestone.status === 'completed' ? 'border-green-500' :
                            milestone.status === 'in-progress' ? 'border-yellow-500' :
                            'border-gray-600'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-white font-semibold">{milestone.phase}</h4>
                                <p className="text-gray-400 text-sm mt-1">{milestone.description}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-purple-300 font-semibold">${milestone.amount.toLocaleString()}</p>
                                <p className={`text-xs mt-1 ${
                                  milestone.status === 'completed' ? 'text-green-400' :
                                  milestone.status === 'in-progress' ? 'text-yellow-400' :
                                  'text-gray-500'
                                }`}>
                                  {milestone.status.replace('-', ' ')}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {activeTab === 'perks' && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white mb-4">Investment Tiers</h3>
                    <div className="grid gap-4">
                      {campaign.investmentTiers.map((tier) => (
                        <div key={tier.id} className="bg-black/30 rounded-lg p-4 border border-purple-500/20">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-white">{tier.name}</h4>
                              <p className="text-purple-300 text-sm">{tier.limit}</p>
                            </div>
                            <div className="text-2xl font-bold text-green-400">${tier.priceInUSD}</div>
                          </div>
                          
                          <ul className="text-sm text-gray-300 space-y-1 mb-4">
                            {tier.perks.map((perk, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-purple-400 mt-0.5">•</span>
                                <span>{perk}</span>
                              </li>
                            ))}
                          </ul>
                          
                          <button
                            onClick={() => handleInvest(tier)}
                            disabled={!publicKey}
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg font-semibold transition-all text-sm"
                          >
                            {publicKey ? 'Invest Now' : 'Connect Wallet'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Links */}
            {campaign.links.length > 0 && (
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30">
                <h3 className="text-xl font-bold text-white mb-4">📎 Project Materials</h3>
                <div className="grid grid-cols-2 gap-3">
                  {campaign.links.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-black/30 hover:bg-purple-600/20 rounded-lg p-3 transition-all border border-purple-500/20 flex items-center justify-between"
                    >
                      <span className="text-white font-medium">{link.label}</span>
                      <span className="text-purple-400">→</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Investment Actions */}
          <div className="space-y-6">
            
            {/* Quick Investment */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <StarIcon className="w-6 h-6 text-yellow-400" />
                Become a Producer
              </h3>
              
              <div className="space-y-3">
                {campaign.investmentTiers.slice(0, 2).map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => handleInvest(tier)}
                    disabled={!publicKey}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-all"
                  >
                    <div className="text-sm opacity-90">{tier.name}</div>
                    <div className="text-lg">${tier.priceInUSD}</div>
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setActiveTab('perks')}
                className="w-full mt-3 text-purple-300 hover:text-purple-200 text-sm font-medium transition-colors"
              >
                View all investment tiers →
              </button>
            </div>

            {/* Project Stats */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30">
              <h3 className="text-xl font-bold text-white mb-4">📊 Project Stats</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Investors</span>
                  <span className="text-white font-semibold">347</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Days Remaining</span>
                  <span className="text-white font-semibold">42</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Production Phase</span>
                  <span className="text-yellow-400 font-semibold">{campaign.productionPhase}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Target Release</span>
                  <span className="text-white font-semibold">{campaign.estimatedRelease}</span>
                </div>
              </div>
            </div>

            {/* Your Investments */}
            {mintedNFTs.length > 0 && (
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-green-500/30">
                <h3 className="text-xl font-bold text-white mb-4">🎬 Your Investment</h3>
                <div className="space-y-2">
                  {mintedNFTs.map((nft, index) => (
                    <div key={index} className="bg-black/30 rounded-lg p-3">
                      <p className="text-green-400 font-semibold text-sm">Producer NFT #{index + 1}</p>
                      <p className="text-gray-400 font-mono text-xs break-all">{nft}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Your NFTs grant you investor perks and potential revenue share
                </p>
              </div>
            )}

            {/* Community */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30">
              <h3 className="text-xl font-bold text-white mb-4">🎭 Join the Production</h3>
              
              <div className="space-y-3 mb-4">
                <button className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white py-2 rounded-lg font-medium transition-colors">
                  Discord Community
                </button>
                <button className="w-full bg-[#1DA1F2] hover:bg-[#1a91da] text-white py-2 rounded-lg font-medium transition-colors">
                  Follow on Twitter
                </button>
                <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-2 rounded-lg font-medium transition-colors">
                  Get Updates
                </button>
              </div>
              
              <div className="text-center text-xs text-gray-400">
                <UserGroupIcon className="w-5 h-5 inline mr-1" />
                Join 2,847 film enthusiasts
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Payment Modal */}
      {paymentModal.isOpen && paymentModal.tier && (
        <PaymentModal
          isOpen={paymentModal.isOpen}
          onClose={() => setPaymentModal({ isOpen: false })}
          campaignId={campaign.id}
          accessKeyName={paymentModal.tier.name}
          priceInUSD={paymentModal.tier.priceInUSD}
          accessKeyImage={paymentModal.tier.image}
          onSuccess={handleMintSuccess}
        />
      )}
    </div>
  )
}
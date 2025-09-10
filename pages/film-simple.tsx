import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import ClientWalletButton from '../components/ClientWalletButton'
import PaymentModal from '../components/PaymentModal'

const FILM_PROJECT = {
  id: 'neon-shadows-film',
  name: 'NEON SHADOWS',
  tagline: 'A Cyberpunk Noir Thriller',
  description: 'In 2085 Neo-Tokyo, a detective with corrupted memory implants hunts a serial killer who leaves victims in digital comas.',
  targetAmount: 2500000,
  raisedAmount: 875000,
  depositWallet: '8oYmUTGBuBqzukESX68SXB67nxopemnRrVmzH3hrGpAd',
  
  tiers: [
    {
      id: 'supporter',
      name: 'Digital Supporter',
      price: 50,
      perks: ['Digital copy', 'Behind-the-scenes', 'Discord access', 'Credits']
    },
    {
      id: 'producer',
      name: 'Associate Producer',
      price: 1000,
      perks: ['Producer credit', 'Set visit', 'Props NFT', 'Private screening']
    },
    {
      id: 'executive',
      name: 'Executive Producer',
      price: 10000,
      perks: ['Executive credit', 'On-set access', 'Revenue share 0.5%', 'Premiere tickets']
    }
  ]
}

export default function FilmProject() {
  const { publicKey } = useWallet()
  const [paymentModal, setPaymentModal] = useState(null)
  const [mintedNFTs, setMintedNFTs] = useState([])

  useEffect(() => {
    if (publicKey && typeof window !== 'undefined') {
      const stored = localStorage.getItem(`minted_${FILM_PROJECT.id}`) || '{}'
      const minted = JSON.parse(stored)[publicKey.toString()] || []
      setMintedNFTs(minted)
    }
  }, [publicKey])

  const handleInvest = (tier) => {
    if (!publicKey) {
      alert('Please connect your wallet first')
      return
    }
    setPaymentModal(tier)
  }

  const handleMintSuccess = (mintAddress) => {
    setMintedNFTs([...mintedNFTs, mintAddress])
    setPaymentModal(null)
    alert('Investment successful! NFT minted: ' + mintAddress)
  }

  const progress = (FILM_PROJECT.raisedAmount / FILM_PROJECT.targetAmount) * 100

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-purple-900/20 border-b border-purple-500/30">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-purple-400">{FILM_PROJECT.name}</h1>
              <p className="text-purple-200">{FILM_PROJECT.tagline}</p>
            </div>
            <ClientWalletButton />
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-purple-900/50 to-black py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-5xl font-bold text-white mb-4">Fund Independent Cinema</h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">{FILM_PROJECT.description}</p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Funding Progress */}
            <div className="bg-purple-900/10 rounded-xl p-6 border border-purple-500/30">
              <div className="flex justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Funding Progress</h3>
                <span className="text-green-400 font-bold">
                  ${FILM_PROJECT.raisedAmount.toLocaleString()} / ${FILM_PROJECT.targetAmount.toLocaleString()}
                </span>
              </div>
              
              <div className="w-full bg-gray-800 rounded-full h-4">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-4 rounded-full"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              
              <p className="text-gray-400 text-sm mt-2">
                {Math.round(progress)}% funded
              </p>
            </div>

            {/* Investment Tiers */}
            <div className="bg-purple-900/10 rounded-xl p-6 border border-purple-500/30">
              <h3 className="text-xl font-bold text-white mb-6">Investment Tiers</h3>
              
              <div className="space-y-4">
                {FILM_PROJECT.tiers.map((tier) => (
                  <div key={tier.id} className="bg-black/50 rounded-lg p-4 border border-purple-500/20">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-white">{tier.name}</h4>
                        <ul className="text-sm text-gray-300 mt-2 space-y-1">
                          {tier.perks.map((perk, i) => (
                            <li key={i}>• {perk}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-400">${tier.price}</p>
                        <button
                          onClick={() => handleInvest(tier)}
                          disabled={!publicKey}
                          className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm"
                        >
                          Invest
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            
            {/* Quick Actions */}
            <div className="bg-purple-900/10 rounded-xl p-6 border border-purple-500/30">
              <h3 className="text-xl font-bold text-white mb-4">Quick Invest</h3>
              <div className="space-y-3">
                {FILM_PROJECT.tiers.slice(0, 2).map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => handleInvest(tier)}
                    disabled={!publicKey}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 rounded-lg font-semibold"
                  >
                    {tier.name} - ${tier.price}
                  </button>
                ))}
              </div>
            </div>

            {/* Your Investments */}
            {mintedNFTs.length > 0 && (
              <div className="bg-green-900/10 rounded-xl p-6 border border-green-500/30">
                <h3 className="text-xl font-bold text-white mb-4">Your Investments</h3>
                <div className="space-y-2">
                  {mintedNFTs.map((nft, i) => (
                    <div key={i} className="bg-black/50 rounded p-2">
                      <p className="text-green-400 text-sm">NFT #{i + 1}</p>
                      <p className="text-gray-400 text-xs font-mono truncate">{nft}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="bg-purple-900/10 rounded-xl p-6 border border-purple-500/30">
              <h3 className="text-xl font-bold text-white mb-4">Project Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Investors</span>
                  <span className="text-white">347</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Days Remaining</span>
                  <span className="text-white">42</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Target Release</span>
                  <span className="text-white">Q3 2026</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Payment Modal */}
      {paymentModal && (
        <PaymentModal
          isOpen={true}
          onClose={() => setPaymentModal(null)}
          campaignId={FILM_PROJECT.id}
          accessKeyName={paymentModal.name}
          priceInUSD={paymentModal.price}
          onSuccess={handleMintSuccess}
        />
      )}
    </div>
  )
}